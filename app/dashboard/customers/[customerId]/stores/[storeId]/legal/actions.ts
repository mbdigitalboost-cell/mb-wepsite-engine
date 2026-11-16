"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStoreAdminAccess, requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { rowBelongsToStore, type OwnershipQueryClient } from "@/lib/auth/tenant-scope";
import { isLegalKind } from "@/lib/legal/admin-legal";
import { buildLegalValues, sampleLegalOrder } from "@/lib/legal/context";
import { loadLegalStoreContext } from "@/lib/legal/store-legal";
import { renderLegalTemplate, validateLegalTemplate } from "@/lib/legal/template";

/**
 * Faz 33 — Mağaza → Yasal Metinler.
 *  - Önizleme: store_editor+; örnek sipariş verisiyle doldurur, hiçbir şey yazmaz.
 *  - Yayınla: store_admin+; YENİ SÜRÜM satırı (eski sürümler kalır — siparişler
 *    kabul ettikleri sürümü gösterir). Bilinmeyen değişken / bozuk {{#if}} → red.
 *  - "Hukukçu kontrol etti": store_admin+; satırın bu mağazaya ait olduğu
 *    ayrıca doğrulanır (Faz 29 rowBelongsToStore); yayımlanmış metin
 *    değişmez (DB trigger'ı yalnız reviewed_* alanlarına izin verir).
 */
const base = (customerId: string, storeId: string, kind?: string) =>
  `/dashboard/customers/${customerId}/stores/${storeId}/legal${kind ? `/${kind}` : ""}`;

export interface LegalPreviewResult {
  text: string;
  unknownVariables: string[];
  structureErrors: string[];
}

export async function previewLegalDocumentAction(customerId: string, storeId: string, body: string): Promise<LegalPreviewResult> {
  await requireStoreEditorAccess(storeId, customerId);
  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id, name, slug").eq("id", storeId).eq("customer_id", customerId).maybeSingle();
  if (!store) return { text: "", unknownVariables: [], structureErrors: ["Mağaza bulunamadı."] };
  const source = String(body ?? "").slice(0, 100_000);
  const validation = validateLegalTemplate(source);
  const context = await loadLegalStoreContext(store);
  const text = renderLegalTemplate(source, buildLegalValues(context, sampleLegalOrder(context)));
  return { text, ...validation };
}

export async function publishLegalDocumentAction(customerId: string, storeId: string, kind: string, formData: FormData): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId, customerId);
  if (!isLegalKind(kind)) redirect(base(customerId, storeId));
  const page = base(customerId, storeId, kind);

  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const body = String(formData.get("body") ?? "").replace(/\r\n/g, "\n").trim();
  if (!title || !body) redirect(`${page}?hata=${encodeURIComponent("Başlık ve metin boş olamaz.")}`);
  if (body.length > 100_000) redirect(`${page}?hata=${encodeURIComponent("Metin çok uzun (en fazla 100.000 karakter).")}`);

  const validation = validateLegalTemplate(body);
  if (validation.unknownVariables.length > 0 || validation.structureErrors.length > 0) {
    const reason = [
      validation.unknownVariables.length > 0 ? `Bilinmeyen değişken: ${validation.unknownVariables.map((v) => `{{${v}}}`).join(", ")}` : null,
      ...validation.structureErrors,
    ]
      .filter(Boolean)
      .join(" · ");
    redirect(`${page}?hata=${encodeURIComponent(reason)}`);
  }

  const supabase = await createSupabaseServerClient();
  let version = 0;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data: latest } = await supabase
      .from("store_legal_documents")
      .select("version")
      .eq("store_id", storeId)
      .eq("kind", kind)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    version = (latest?.version ?? 0) + 1;
    const { error } = await supabase.from("store_legal_documents").insert({ store_id: storeId, kind, title, body, version, updated_by: user.id });
    if (!error) break;
    // Aynı anda iki yayımlama: sürüm numarası çakıştı → bir kez yeniden dene.
    if (error.code !== "23505" || attempt === 1) {
      console.error("[legal] publish failed:", error.message);
      redirect(`${page}?hata=${encodeURIComponent("Yayımlanamadı. Migration 0048 uygulandı mı?")}`);
    }
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "store.legal_document_publish",
    entityType: "store",
    entityId: storeId,
    metadata: { kind, version },
  });

  revalidatePath(base(customerId, storeId));
  revalidatePath(page);
  redirect(`${page}?yayinlandi=${version}`);
}

export async function setLawyerReviewedAction(customerId: string, storeId: string, kind: string, documentId: string, formData: FormData): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId, customerId);
  if (!isLegalKind(kind)) redirect(base(customerId, storeId));
  const page = base(customerId, storeId, kind);
  const supabase = await createSupabaseServerClient();

  // Faz 29 — sürüm kaydı bu mağazanın olmalı (A mağazası + B'nin metni → red).
  if (!(await rowBelongsToStore(supabase as unknown as OwnershipQueryClient, "store_legal_documents", documentId, storeId))) {
    redirect(`${page}?hata=${encodeURIComponent("Sürüm bu mağazaya ait değil.")}`);
  }

  const reviewed = formData.get("reviewed") === "on";
  const { error } = await supabase
    .from("store_legal_documents")
    .update({ reviewed_by_lawyer: reviewed, reviewed_at: reviewed ? new Date().toISOString() : null, reviewed_by: reviewed ? user.id : null, updated_by: user.id })
    .eq("id", documentId)
    .eq("store_id", storeId);
  if (error) {
    console.error("[legal] review flag failed:", error.message);
    redirect(`${page}?hata=${encodeURIComponent("Kaydedilemedi.")}`);
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "store.legal_document_review",
    entityType: "store",
    entityId: storeId,
    metadata: { kind, documentId, reviewed },
  });

  revalidatePath(page);
  revalidatePath(base(customerId, storeId));
  redirect(`${page}?inceleme=${reviewed ? "evet" : "hayir"}`);
}
