/**
 * FAZ 10 — mağaza marka varlıkları (logo/favicon) için Storage bucket
 * sabiti. MIME/uzantı allowlist'i lib/commerce/product-image-constants.ts'ten
 * AYNEN yeniden kullanılıyor (PRODUCT_IMAGE_MIME_TYPES/MIME_TO_EXTENSION/
 * isAllowedProductImageMimeType hiçbiri product-images bucket'ına özel
 * değil, sadece "hangi resim türlerine izin veriyoruz" genel kuralı) —
 * burada SADECE bucket adı + bu bucket'a özgü, daha küçük boyut sınırı var.
 * No "server-only" guard — same reason product-image-constants.ts doesn't
 * have one: a "use client" file-input component needs this too.
 */
export const STORE_BRANDING_BUCKET = "store-branding";

/** Migration 0035_store_branding_storage.sql'in kendi file_size_limit'iyle (2097152 bayt) eşleşmeli. Favicon/logo, ürün fotoğraflarından çok daha küçük olmalı. */
export const MAX_STORE_BRANDING_ASSET_SIZE_BYTES = 2 * 1024 * 1024;
