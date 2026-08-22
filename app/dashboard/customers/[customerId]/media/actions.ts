"use server";

import { revalidatePath } from "next/cache";
import { requireCustomerWriteAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { mediaUploadFormSchema, mediaAssetUpdateFormSchema } from "@/lib/validation/content";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { uploadCustomerImage } from "@/lib/media/upload-customer-image";
import { MEDIA_STORAGE_BUCKET } from "@/lib/media/constants";
import type { MediaFormState } from "./form-state";

/**
 * Phase 9.4: real Supabase Storage upload, replacing Phase 6's
 * URL-typing form. Faz 14: the validate/upload/insert logic itself now
 * lives in lib/media/upload-customer-image.ts — shared with the inline
 * "pick a file right on the content form" widget (see
 * lib/media/inline-image-upload-action.ts) — this action is now just:
 * auth, parse the folder dropdown + alt text, delegate, revalidate.
 */
export async function uploadMediaAssetAction(
  customerId: string,
  _prevState: MediaFormState,
  formData: FormData,
): Promise<MediaFormState> {
  const { user } = await requireCustomerWriteAccess(customerId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bir dosya seçin." };
  }

  const parsed = mediaUploadFormSchema.safeParse({
    folder: formData.get("folder"),
    altText: formData.get("altText"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  const result = await uploadCustomerImage({
    customerId,
    userId: user.id,
    file,
    folder: parsed.data.folder,
    altText: parsed.data.altText,
  });
  if (result.error) return { error: result.error };

  revalidatePath(`/dashboard/customers/${customerId}/media`);
  return { error: null };
}

/**
 * Phase 9.4: editing file_name/alt_text on an existing asset. Never
 * re-uploads or renames the underlying Storage object — `storage_path`
 * and `file_url` are immutable once uploaded (renaming a Storage object
 * requires a separate move/copy call this phase doesn't add, since
 * neither the audit nor the brief asked for renaming files on disk, only
 * "dosya adı gibi mevcut schema alanlarını düzenleyebilsin" — the
 * `file_name` column, a display label independent of `storage_path`).
 */
export async function updateMediaAssetAction(
  customerId: string,
  assetId: string,
  _prevState: MediaFormState,
  formData: FormData,
): Promise<MediaFormState> {
  const { user } = await requireCustomerWriteAccess(customerId);

  const parsed = mediaAssetUpdateFormSchema.safeParse({
    fileName: formData.get("fileName"),
    altText: formData.get("altText"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  const connection = await loadCustomerConnection(customerId);
  if (!connection) {
    return { error: "Petra Supabase bağlantısı henüz kurulmadı — ortam değişkenleri eksik olabilir." };
  }

  const row = { file_name: parsed.data.fileName, alt_text: parsed.data.altText || null };
  const { error } = await connection.client.from("media_assets").update(row).eq("id", assetId);
  if (error) return { error: `Kaydedilemedi: ${error.message}` };

  await logAuditEvent({ userId: user.id, customerId, action: "media.update", entityType: "media_assets", entityId: assetId, metadata: row });
  revalidatePath(`/dashboard/customers/${customerId}/media`);
  return { error: null };
}

/**
 * Phase 9.4: now also removes the underlying Storage object, not just
 * the media_assets row (Phase 6's version only ever deleted the row,
 * because no Storage object could exist yet). Storage deletion happens
 * first — if it fails, the row is still removed and the failure is
 * logged (best-effort, matches this file's existing error-handling
 * style), so a stuck Storage object never blocks the user from cleaning
 * up their media list.
 */
export async function deleteMediaAssetAction(customerId: string, assetId: string): Promise<void> {
  const { user } = await requireCustomerWriteAccess(customerId);
  const connection = await loadCustomerConnection(customerId);
  if (!connection) return;

  const { data: asset } = await connection.client.from("media_assets").select("storage_path").eq("id", assetId).maybeSingle();

  if (asset?.storage_path) {
    const { error: storageError } = await connection.client.storage.from(MEDIA_STORAGE_BUCKET).remove([asset.storage_path]);
    if (storageError) {
      console.error("[media] failed to delete storage object:", asset.storage_path, storageError.message);
    }
  }

  const { error } = await connection.client.from("media_assets").delete().eq("id", assetId);
  if (error) {
    console.error("[media] failed to delete row:", error.message);
    return;
  }

  await logAuditEvent({ userId: user.id, customerId, action: "media.delete", entityType: "media_assets", entityId: assetId });
  revalidatePath(`/dashboard/customers/${customerId}/media`);
}
