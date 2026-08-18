import "server-only";

import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { ALLOWED_MEDIA_MIME_TYPES, MAX_MEDIA_FILE_SIZE_BYTES, MEDIA_STORAGE_BUCKET, type MediaFolder } from "@/lib/media/constants";

export interface UploadCustomerImageResult {
  url?: string;
  assetId?: string;
  error?: string;
}

/**
 * Faz 14 (görsel doğrudan yükleme): the actual upload/validate/insert
 * logic behind Phase 9.4's Medya Kütüphanesi upload form
 * (app/dashboard/customers/[customerId]/media/actions.ts's
 * uploadMediaAssetAction), extracted here so a SECOND call site — an
 * inline "pick a file right on the Hero/Çözümler/... form" widget, see
 * lib/media/inline-image-upload-action.ts — can reuse the exact same
 * validated upload path instead of a second, drift-prone copy of it.
 * Behavior is unchanged from the original: same MIME/size checks, same
 * filename sanitization, same media_assets row, same audit log, same
 * best-effort Storage cleanup on a failed insert.
 */
export async function uploadCustomerImage(params: {
  customerId: string;
  userId: string;
  file: File;
  folder: MediaFolder;
  altText?: string | null;
}): Promise<UploadCustomerImageResult> {
  const { customerId, userId, file, folder, altText } = params;

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bir dosya seçin." };
  }
  if (!ALLOWED_MEDIA_MIME_TYPES.includes(file.type as (typeof ALLOWED_MEDIA_MIME_TYPES)[number])) {
    return {
      error: `Desteklenmeyen dosya türü: ${file.type || "bilinmiyor"}. Yalnızca JPEG, PNG, WebP, SVG veya GIF yükleyin.`,
    };
  }
  if (file.size > MAX_MEDIA_FILE_SIZE_BYTES) {
    return {
      error: `Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(1)} MB) — en fazla ${MAX_MEDIA_FILE_SIZE_BYTES / 1024 / 1024} MB olabilir.`,
    };
  }

  const connection = await loadCustomerConnection(customerId);
  if (!connection) {
    return { error: "CMS bağlantısı henüz kurulmadı — ortam değişkenleri eksik olabilir." };
  }

  const originalName = file.name || "dosya";
  const lastDot = originalName.lastIndexOf(".");
  const baseName =
    (lastDot > 0 ? originalName.slice(0, lastDot) : originalName)
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "dosya";
  const extension = lastDot > 0 ? originalName.slice(lastDot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const uniqueId = crypto.randomUUID().slice(0, 8);
  const fileName = extension ? `${baseName}-${uniqueId}.${extension}` : `${baseName}-${uniqueId}`;
  const storagePath = `${folder}/${fileName}`;

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
    alt_text: altText || null,
    type: file.type,
    width: null,
    height: null,
  };

  const { data, error: insertError } = await connection.client.from("media_assets").insert(row).select("id").single();
  if (insertError || !data) {
    const { error: cleanupError } = await connection.client.storage.from(MEDIA_STORAGE_BUCKET).remove([storagePath]);
    if (cleanupError) {
      console.error("[media] orphaned storage object after failed insert, cleanup also failed:", storagePath, cleanupError.message);
    }
    return { error: `Kaydedilemedi: ${insertError?.message ?? "bilinmeyen hata"}` };
  }

  await logAuditEvent({
    userId,
    customerId,
    action: "media.upload",
    entityType: "media_assets",
    entityId: data.id,
    metadata: { file_name: row.file_name, storage_path: row.storage_path, type: row.type },
  });

  return { url: publicUrlData.publicUrl, assetId: data.id };
}
