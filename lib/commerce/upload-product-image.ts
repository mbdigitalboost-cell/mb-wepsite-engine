import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  MAX_PRODUCT_IMAGE_SIZE_BYTES,
  MIME_TO_EXTENSION,
  PRODUCT_IMAGES_BUCKET,
  isAllowedProductImageMimeType,
} from "@/lib/commerce/product-image-constants";
import { verifyImageSignature } from "@/lib/commerce/product-image-signature";

export interface UploadProductImageResult {
  storagePath?: string;
  error?: string;
}

/**
 * FAZ 2C-1C — Central Platform's OWN product-image upload path.
 * Deliberately NOT lib/media/upload-customer-image.ts — that helper
 * connects to a customer's separate per-customer Supabase project
 * (loadCustomerConnection) and has no concept of the `stores` tenant
 * model; reusing it here would upload to the wrong project entirely (see
 * FAZ 2C-1B/1C audits). This helper uses `createSupabaseServerClient()`
 * (anon key + the calling user's own session cookies) — NEVER a
 * service-role client — so the upload is subject to the SAME
 * `storage.objects` RLS policies verified in production by migrations
 * 0020/0021 (`product_images_storage_insert_editor`, tenant-scoped via
 * the object path). Server-side validation here is a second, defense-in-
 * depth layer on top of that RLS and the bucket's own
 * `allowed_mime_types`/`file_size_limit` — never the only guard.
 *
 * Deliberately does ONLY the Storage upload, NOT the `product_images` DB
 * insert (unlike upload-customer-image.ts, which combines both) — Storage
 * and Postgres cannot share one transaction, so the calling Server Action
 * (images/actions.ts's createProductImageAction) is what decides, in one
 * place, what happens if the insert that follows fails (see
 * removeProductImageObject below).
 */
export async function uploadProductImage(params: {
  storeId: string;
  productId: string;
  file: File;
}): Promise<UploadProductImageResult> {
  const { storeId, productId, file } = params;

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bir dosya seçin." };
  }
  if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
    return {
      error: `Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(1)} MB) — en fazla ${MAX_PRODUCT_IMAGE_SIZE_BYTES / 1024 / 1024} MB olabilir.`,
    };
  }
  if (!isAllowedProductImageMimeType(file.type)) {
    return {
      error: `Desteklenmeyen dosya türü: ${file.type || "bilinmiyor"}. Yalnızca JPEG, PNG, WebP veya GIF yükleyin.`,
    };
  }
  const mimeType = file.type;

  // M-5 fix — client file.type, this MIME check, and the bucket's own
  // allowed_mime_types all trust the SAME self-reported string; this is
  // the first layer that actually looks at the file's real bytes. Runs
  // BEFORE the Storage upload so a mismatched file never reaches Storage
  // at all — no cleanup path is needed for this rejection (see
  // lib/commerce/product-image-signature.ts's own doc comment for why a
  // full decode-based check, e.g. via `sharp`, was deliberately NOT added
  // here — see FAZ 2C-1C M-5 design review).
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!verifyImageSignature(header, mimeType)) {
    return { error: "Dosya içeriği belirtilen türle eşleşmiyor." };
  }

  const storagePath = `stores/${storeId}/products/${productId}/${buildSafeFileName(file.name, mimeType)}`;

  const supabase = await createSupabaseServerClient();
  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(storagePath, file, { contentType: mimeType, upsert: false });

  if (uploadError) {
    return { error: `Yükleme başarısız: ${uploadError.message}` };
  }

  return { storagePath };
}

/**
 * Best-effort cleanup — called when a Storage upload succeeded but the
 * `product_images` DB insert that was meant to follow it failed (or when
 * a real image row is permanently deleted). Never throws: a failed
 * cleanup should not turn into a second, confusing error on top of
 * whatever the caller is already reporting — it only logs, same
 * philosophy as upload-customer-image.ts's own cleanup-on-failure call.
 */
export async function removeProductImageObject(storagePath: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([storagePath]);
  if (error) {
    console.error("[product-images] failed to remove storage object:", storagePath, error.message);
  }
}

/**
 * Sanitizes the user's original filename down to a safe, ASCII,
 * collision-resistant object-path segment. The extension is derived from
 * the ALREADY-VALIDATED MIME type (MIME_TO_EXTENSION), never from the
 * original filename's own extension — a file named "photo.jpg" whose
 * `file.type` isn't an allowed image MIME never reaches this function
 * (uploadProductImage returns an error first), so there is no scenario
 * where a spoofed extension survives into the stored path.
 */
export function buildSafeFileName(originalName: string, mimeType: string): string {
  const lastDot = originalName.lastIndexOf(".");
  const rawBase = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
  const baseName =
    rawBase
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "gorsel";
  const extension = MIME_TO_EXTENSION[mimeType as keyof typeof MIME_TO_EXTENSION] ?? "bin";
  const uniqueId = crypto.randomUUID().slice(0, 8);
  return `${baseName}-${uniqueId}.${extension}`;
}
