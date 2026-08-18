/**
 * Shared between the client-side upload form (accept attribute, folder
 * dropdown), the server action's validation, and the Storage bucket
 * itself (supabase/customer-template/migrations/0006_media_storage_bucket.sql)
 * — one place to change if the allow-list ever needs to grow. Keep all
 * three in sync by hand; there is no single source of truth Storage and
 * this app's TypeScript can both read directly.
 */

/** Must match the bucket's `allowed_mime_types` in migration 0006. */
export const ALLOWED_MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/gif",
] as const;

/** Must match the bucket's `file_size_limit` in migration 0006. */
export const MAX_MEDIA_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MiB

/**
 * The folder convention documented since migration 0003 (Petra Asset
 * Manifest / Final Asset Implementation Brief naming) — unchanged here,
 * just centralized so the upload form's dropdown and the server
 * action's validation can't drift apart.
 */
export const MEDIA_FOLDERS = [
  "brand",
  "hero",
  "solutions",
  "services",
  "projects",
  "campaigns",
  "testimonials",
  "banners",
] as const;

export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export const MEDIA_STORAGE_BUCKET = "media";
