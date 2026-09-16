import { z } from "zod";

/**
 * FAZ 2A — Product Image (store_editor+ writes; permanent delete is
 * store_admin+ only). Mirrors migration 0019_product_images.sql's
 * `product_images` table exactly.
 *
 * storagePath is a Supabase Storage BUCKET PATH, not a public URL — per
 * migration 0019's own header comment ("storage_path (image_url DEĞİL):
 * Supabase Storage bucket path saklanır, public URL okuma anında
 * türetilir"). This is a plain non-empty string check, deliberately NOT
 * the safe-navigation-url schema used elsewhere (category/brand/homepage
 * image fields) — a bucket path is neither a relative site path nor an
 * https:// link. Bucket creation/RLS itself is out of scope for this
 * phase (same migration comment).
 *
 * productId/variantId: productId is required, variantId is an OPTIONAL
 * scoping relation (null = general product image, per migration 0019's
 * table comment). Same-store correctness of both is enforced by the DB's
 * composite FKs (product_id, store_id) / (variant_id, store_id), not by
 * this schema — see lib/validation/product.ts's categoryId/brandId
 * rationale for the identical reasoning. store_id itself is never a
 * field here.
 */
export const productImageFormSchema = z.object({
  productId: z.string().uuid("Geçerli bir ürün seçilmeli."),
  variantId: z.string().uuid().optional().or(z.literal("")),
  storagePath: z.string().trim().min(1, "Depolama yolu zorunlu.").max(500),
  altText: z.string().trim().max(300).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0, "Sıra 0 veya daha büyük olmalı.").default(0),
  isPrimary: z.coerce.boolean().default(false),
});
