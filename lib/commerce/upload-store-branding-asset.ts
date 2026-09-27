import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  MIME_TO_EXTENSION,
  isAllowedProductImageMimeType,
} from "@/lib/commerce/product-image-constants";
import { MAX_STORE_BRANDING_ASSET_SIZE_BYTES, STORE_BRANDING_BUCKET } from "@/lib/commerce/store-branding-constants";
import { verifyImageSignature } from "@/lib/commerce/product-image-signature";

export type StoreBrandingAssetType = "logo" | "favicon";

export interface UploadStoreBrandingAssetResult {
  publicUrl?: string;
  error?: string;
}

/**
 * FAZ 10 — same validation shape as lib/commerce/upload-product-image.ts
 * (size limit, MIME allowlist, magic-number signature check before the
 * Storage call, `createSupabaseServerClient()` — the calling admin's own
 * session, never service-role, so the upload is genuinely subject to
 * migration 0035's `store_branding_storage_insert_admin`/`_update_admin`
 * RLS policies, not just trusted from application code).
 *
 * Deliberately DIFFERENT from that file in two ways: (1) targets the
 * PUBLIC `store-branding` bucket, not the private `product-images` one —
 * see migration 0035's own header for why a favicon/logo needs a public,
 * non-expiring URL; (2) uses a FIXED path per asset type
 * (`stores/{storeId}/branding/{logo|favicon}.{ext}`) with `upsert: true`,
 * not a unique-per-upload filename — a store has at most one logo and one
 * favicon, so re-uploading replaces the same object instead of
 * accumulating unbounded history the way product photos do.
 *
 * Returns the object's PUBLIC url directly (`getPublicUrl()`, no signing,
 * no expiry) — this is what gets written into
 * store_profiles.logo_url/favicon_url and used as-is by both
 * generateMetadata (icons) and the storefront header, unlike product
 * images which always need a fresh signed URL per render.
 */
export async function uploadStoreBrandingAsset(params: {
  storeId: string;
  assetType: StoreBrandingAssetType;
  file: File;
}): Promise<UploadStoreBrandingAssetResult> {
  const { storeId, assetType, file } = params;

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bir dosya seçin." };
  }
  if (file.size > MAX_STORE_BRANDING_ASSET_SIZE_BYTES) {
    return {
      error: `Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(1)} MB) — en fazla ${MAX_STORE_BRANDING_ASSET_SIZE_BYTES / 1024 / 1024} MB olabilir.`,
    };
  }
  if (!isAllowedProductImageMimeType(file.type)) {
    return {
      error: `Desteklenmeyen dosya türü: ${file.type || "bilinmiyor"}. Yalnızca JPEG, PNG, WebP veya GIF yükleyin.`,
    };
  }
  const mimeType = file.type;

  // Same M-5 defense-in-depth as upload-product-image.ts: the client's
  // self-reported file.type, this check, and the bucket's own
  // allowed_mime_types all trust the SAME string — this is the first
  // layer that looks at the actual bytes, before anything reaches Storage.
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!verifyImageSignature(header, mimeType)) {
    return { error: "Dosya içeriği belirtilen türle eşleşmiyor." };
  }

  const extension = MIME_TO_EXTENSION[mimeType];
  const storagePath = `stores/${storeId}/branding/${assetType}.${extension}`;

  const supabase = await createSupabaseServerClient();
  const { error: uploadError } = await supabase.storage
    .from(STORE_BRANDING_BUCKET)
    .upload(storagePath, file, { contentType: mimeType, upsert: true });

  if (uploadError) {
    return { error: `Yükleme başarısız: ${uploadError.message}` };
  }

  const { data } = supabase.storage.from(STORE_BRANDING_BUCKET).getPublicUrl(storagePath);
  return { publicUrl: data.publicUrl };
}
