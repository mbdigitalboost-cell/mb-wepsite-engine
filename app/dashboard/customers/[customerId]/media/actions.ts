"use server";

import { revalidatePath } from "next/cache";
import { requireCustomerAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { mediaUploadFormSchema, mediaAssetUpdateFormSchema } from "@/lib/validation/content";
import { logAuditEvent } from "@/lib/auth/audit-log";
import {
  ALLOWED_MEDIA_MIME_TYPES,
  MAX_MEDIA_FILE_SIZE_BYTES,
  MEDIA_STORAGE_BUCKET,
} from "@/lib/media/constants";
import type { MediaFormState } from "./form-state";

/**
 * Phase 9.4: real Supabase Storage upload, replacing Phase 6's
 * URL-typing form. `connection.client` is the SERVICE-ROLE client
 * (lib/cms/dashboard/require-customer-connection.ts) — the same trust
 * boundary every other dashboard write already uses, and the only way
 * this ever touches Storage: `storage.objects` has no RLS policy for
 * anon/authenticated (migration 0006), so uploading as anyone but
 * service-role would fail outright, by design.
 *
 * `file.type`/`file.size` are re-validated here even though the bucket
 * itself also enforces `allowed_mime_types`/`file_size_limit` (migration
 * 0006) — server-side validation before the network call gives a clear
 * Turkish error message instead of a raw Storage API rejection, and is
 * defense in depth against a client that lies about its own `accept`
 * attribute.
 */
export async function uploadMediaAssetAction(
  customerId: string,
  _prevState: MediaFormState,
  formData: FormData,
): Promise<MediaFormState> {
  const { user } = await requireCustomerAccess(customerId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bir dosya seçin." };
  }

  const parsed = mediaUploadFormSchema.safeParse({
    folder: formData.get("folder"),
    altText: formData.get("altText"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  if (!ALLOWED_MEDIA_MIME_TYPES.includes(file.type as (typeof ALLOWED_MEDIA_MIME_TYPES)[number])) {
    return { error: `Desteklenmeyen dosya türü: ${file.type || "bilinmiyor"}. Yalnızca JPEG, PNG, WebP, SVG veya GIF yükleyin.` };
  }
  if (file.size > MAX_MEDIA_FILE_SIZE_BYTES) {
    return { error: `Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(1)} MB) — en fazla ${MAX_MEDIA_FILE_SIZE_BYTES / 1024 / 1024} MB olabilir.` };
  }

  const connection = await loadCustomerConnection(customerId);
  if (!connection) {
    return { error: "Petra Supabase bağlantısı henüz kurulmadı — ortam değişkenleri eksik olabilir." };
  }

  // Sanitize the original filename into a safe storage key: strip
  // anything outside Supabase Storage's documented allowed filename
  // characters (see migration 0006's linked docs), lowercase the
  // extension, and prefix with a random id so two uploads named
  // "logo.png" never collide or silently overwrite each other.
  const originalName = file.name || "dosya";
  const lastDot = originalName.lastIndexOf(".");
  const baseName = (lastDot > 0 ? originalName.slice(0, lastDot) : originalName)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "dosya";
  const extension = lastDot > 0 ? originalName.slice(lastDot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const uniqueId = crypto.randomUUID().slice(0, 8);
  const fileName = extension ? `${baseName}-${uniqueId}.${extension}` : `${baseName}-${uniqueId}`;
  const storagePath = `${parsed.data.folder}/${fileName}`;

  const { error: uploadError } = await connection.client.storage
    .from(MEDIA_STORAGE_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { error: `Yükleme başarısız: ${uploadError.message}` };
  }

  const { data: publicUrlData } = connection.client.storage.from(MEDIA_STORAGE_BUCKET).getPublicUrl(storagePath);

  const row = {
    file_name: originalName,
    file_url: publicUrlData.publicUrl,
    storage_path: storagePath,
    alt_text: parsed.data.altText || null,
    type: file.type,
    width: null,
    height: null,
  };

  const { data, error: insertError } = await connection.client.from("media_assets").insert(row).select("id").single();
  if (insertError || !data) {
    // Best-effort cleanup — don't leave an orphaned file in Storage with
    // no media_assets row pointing at it. Failure here is logged, not
    // surfaced as a second error to the user (the insert failure is the
    // one that matters to them).
    const { error: cleanupError } = await connection.client.storage.from(MEDIA_STORAGE_BUCKET).remove([storagePath]);
    if (cleanupError) {
      console.error("[media] orphaned storage object after failed insert, cleanup also failed:", storagePath, cleanupError.message);
    }
    return { error: `Kaydedilemedi: ${insertError?.message ?? "bilinmeyen hata"}` };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "media.upload",
    entityType: "media_assets",
    entityId: data.id,
    metadata: { file_name: row.file_name, storage_path: row.storage_path, type: row.type },
  });

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
  const { user } = await requireCustomerAccess(customerId);

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
  const { user } = await requireCustomerAccess(customerId);
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
