"use server";

import { revalidatePath } from "next/cache";
import { requireCustomerWriteAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { seoFormSchema } from "@/lib/validation/content";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { triggerRemoteRevalidation } from "@/lib/cms/dashboard/trigger-revalidation";
import { getStaticSeoRoutePath } from "@/lib/seo/route-registry";
import type { SeoFormState } from "./form-state";

/** Postgres unique_violation — bkz. seo_settings_route_key_unique (migration 0009). */
const UNIQUE_VIOLATION = "23505";

/**
 * Site-wide SEO only (page_id IS NULL) — seo_settings has no `status`
 * column (see supabase/customer-template/migrations/0003), it's config,
 * not draft/published content, so there's no publish step here, just
 * save. A blank field is stored as `null` — lib/cms/adapters/seo.ts's
 * caller falls back to the existing static SEO behavior for anything
 * `null`, never inventing copy.
 */
function toRow(parsed: {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  routeKey?: string;
}) {
  return {
    title: parsed.title || null,
    description: parsed.description || null,
    canonical: parsed.canonical || null,
    og_image: parsed.ogImage || null,
    robots_index: parsed.robotsIndex,
    robots_follow: parsed.robotsFollow,
    // Faz 6F-4A-3.2: boş ("" — site-wide sekmesi) => null, aksi halde
    // seoFormSchema'nın registry'ye karşı doğruladığı statik sayfa anahtarı.
    route_key: parsed.routeKey || null,
  };
}

export async function saveSeoAction(
  customerId: string,
  seoId: string | null,
  _prevState: SeoFormState,
  formData: FormData,
): Promise<SeoFormState> {
  const { user } = await requireCustomerWriteAccess(customerId);

  const parsed = seoFormSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    canonical: formData.get("canonical"),
    ogImage: formData.get("ogImage"),
    robotsIndex: formData.get("robotsIndex") === "on",
    robotsFollow: formData.get("robotsFollow") === "on",
    routeKey: formData.get("routeKey"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  const connection = await loadCustomerConnection(customerId);
  if (!connection) {
    return { error: "Petra Supabase bağlantısı henüz kurulmadı — ortam değişkenleri eksik olabilir." };
  }

  const row = toRow(parsed.data);
  let resolvedId = seoId;

  if (seoId) {
    const { error } = await connection.client.from("seo_settings").update(row).eq("id", seoId);
    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return { error: "Bu sayfa için zaten bir SEO kaydı bulunuyor." };
      }
      return { error: `Kaydedilemedi: ${error.message}` };
    }
  } else {
    const { data, error } = await connection.client.from("seo_settings").insert({ ...row, page_id: null }).select("id").single();
    if (error || !data) {
      if (error?.code === UNIQUE_VIOLATION) {
        return { error: "Bu sayfa için zaten bir SEO kaydı bulunuyor." };
      }
      return { error: `Kaydedilemedi: ${error?.message ?? "bilinmeyen hata"}` };
    }
    resolvedId = data.id;
  }

  await logAuditEvent({ userId: user.id, customerId, action: "seo.update", entityType: "seo_settings", entityId: resolvedId, metadata: row });
  revalidatePath(`/dashboard/customers/${customerId}/seo`);
  // Faz 6C: panel-local revalidatePath'in (yukarıda) public deployment'a
  // etkisi yok (bkz. FAZ 4G/FAZ 6B teşhisi).
  // Faz 6F-4A-3.2: site-wide (route_key boş) hâlâ "/" hedefliyor —
  // seo_settings'in page_id=NULL/route_key=NULL satırı sadece `/`
  // sayfasının metadata'sını (applyHomeSeoOverrides) ve layout'un
  // varsayılanını (applyLayoutSeoOverrides) etkiliyor. route_key doluysa
  // (statik sayfa override'ı) gerçek hedef O sayfanın kendi path'i —
  // "/" revalidate etmek o sayfayı YENİLEMEZ, bu yüzden path route_key'e
  // göre hesaplanıyor.
  const targetPath = parsed.data.routeKey ? getStaticSeoRoutePath(parsed.data.routeKey) : null;
  await triggerRemoteRevalidation(customerId, [targetPath ?? "/"]);
  return { error: null };
}
