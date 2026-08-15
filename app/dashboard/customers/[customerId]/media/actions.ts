"use server";

import { revalidatePath } from "next/cache";
import { requireCustomerAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { mediaAssetFormSchema } from "@/lib/validation/content";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { MediaFormState } from "./form-state";

/**
 * Phase 6 §13/§23 scope: this registers ASSET METADATA (file_name,
 * file_url, storage_path, alt_text, type, width, height) in the
 * customer's `media_assets` table. It does not implement real file
 * upload to Supabase Storage — no storage bucket exists in this sandbox
 * (real Petra assets are expected in a future step, per the phase
 * instructions: "Bu fazda görsel dosyalarını kendin üretme"). `file_url`
 * must be a real, already-reachable URL — this form does not invent one.
 */
export async function createMediaAssetAction(
  customerId: string,
  _prevState: MediaFormState,
  formData: FormData,
): Promise<MediaFormState> {
  const { user } = await requireCustomerAccess(customerId);

  const parsed = mediaAssetFormSchema.safeParse({
    fileName: formData.get("fileName"),
    fileUrl: formData.get("fileUrl"),
    storagePath: formData.get("storagePath"),
    altText: formData.get("altText"),
    type: formData.get("type"),
    width: formData.get("width") || undefined,
    height: formData.get("height") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  const connection = await loadCustomerConnection(customerId);
  if (!connection) {
    return { error: "Petra Supabase bağlantısı henüz kurulmadı — ortam değişkenleri eksik olabilir." };
  }

  const row = {
    file_name: parsed.data.fileName,
    file_url: parsed.data.fileUrl,
    storage_path: parsed.data.storagePath,
    alt_text: parsed.data.altText || null,
    type: parsed.data.type || null,
    width: parsed.data.width ?? null,
    height: parsed.data.height ?? null,
  };

  const { data, error } = await connection.client.from("media_assets").insert(row).select("id").single();
  if (error || !data) return { error: `Kaydedilemedi: ${error?.message ?? "bilinmeyen hata"}` };

  await logAuditEvent({ userId: user.id, customerId, action: "media.upload", entityType: "media_assets", entityId: data.id, metadata: row });

  revalidatePath(`/dashboard/customers/${customerId}/media`);
  return { error: null };
}

export async function deleteMediaAssetAction(customerId: string, assetId: string): Promise<void> {
  const { user } = await requireCustomerAccess(customerId);
  const connection = await loadCustomerConnection(customerId);
  if (!connection) return;

  const { error } = await connection.client.from("media_assets").delete().eq("id", assetId);
  if (error) {
    console.error("[media] failed to delete:", error.message);
    return;
  }

  await logAuditEvent({ userId: user.id, customerId, action: "media.delete", entityType: "media_assets", entityId: assetId });
  revalidatePath(`/dashboard/customers/${customerId}/media`);
}
