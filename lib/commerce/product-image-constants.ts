/**
 * FAZ 2C-1C — shared between the client-side file picker
 * (images/image-form.tsx) and the server-side upload helper
 * (lib/commerce/upload-product-image.ts), same reason
 * lib/media/constants.ts exists for Petra's media bucket: one place to
 * change the allow-list so the client hint and the server enforcement
 * can't drift apart. This file has NO "server-only" guard (unlike
 * upload-product-image.ts) specifically so a "use client" component can
 * import it.
 *
 * Deliberately NOT shared with lib/media/constants.ts — that bucket
 * (`media`) belongs to Petra's per-customer template (migration
 * 0006_media_storage_bucket.sql, a different Supabase project per
 * customer); this one belongs to Central Platform's single, multi-tenant
 * `product-images` bucket (migration 0020_product_images_storage.sql).
 * Two independent systems, two independent constant sets — importing
 * from lib/media here would create an unwanted dependency on Petra's
 * module tree.
 *
 * SVG deliberately excluded — see migration 0020's own header comment
 * (stored-XSS risk via <script>/event-handler inside SVG's XML; product
 * photos are never legitimately SVG).
 */
export const PRODUCT_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export type ProductImageMimeType = (typeof PRODUCT_IMAGE_MIME_TYPES)[number];

/** Must match migration 0020's `file_size_limit` (5242880 bytes) on the `product-images` bucket. */
export const MAX_PRODUCT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/** Must match migration 0020's `storage.buckets.id`. */
export const PRODUCT_IMAGES_BUCKET = "product-images";

/**
 * Extension is derived from the VALIDATED MIME type, never trusted from
 * the user's original filename — a `.jpg`-named file whose real content
 * is something else already fails the MIME check before this map is
 * ever consulted (see upload-product-image.ts).
 */
export const MIME_TO_EXTENSION: Record<ProductImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function isAllowedProductImageMimeType(mimeType: string): mimeType is ProductImageMimeType {
  return (PRODUCT_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType);
}
