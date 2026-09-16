import { z } from "zod";

/**
 * FAZ 2A — Product Variant (store_editor+ writes; permanent delete is
 * store_admin+ only). Mirrors migration
 * 0018_product_variants_options.sql's `product_variants` table exactly.
 *
 * productId is required — same-store correctness is enforced by the DB's
 * composite FK (product_id, store_id), not here (see
 * lib/validation/product.ts's categoryId/brandId rationale — identical
 * reasoning). store_id itself is never a field in this schema.
 *
 * price/compareAtPrice are BOTH nullable, mirroring the DB exactly
 * (`price numeric(12,2) check (price is null or price >= 0)`) — a null
 * price means "inherit the parent product's price", resolved at the
 * application layer (see migration 0018's own table comment). The
 * compareAtPrice >= price check only applies when a price is actually
 * set, matching the DB CHECK's own null-tolerant semantics exactly
 * (`compare_at_price is null or compare_at_price >= price` evaluates to
 * unknown/passes when price is null).
 */
export const productVariantFormSchema = z
  .object({
    productId: z.string().uuid("Geçerli bir ürün seçilmeli."),
    sku: z.string().trim().min(1, "SKU zorunlu.").max(100),
    name: z.string().trim().min(1, "Varyant adı zorunlu.").max(200),
    price: z.coerce.number().min(0, "Fiyat 0 veya daha büyük olmalı.").optional(),
    compareAtPrice: z.coerce.number().min(0, "Karşılaştırma fiyatı 0 veya daha büyük olmalı.").optional(),
    stock: z.coerce.number().int().min(0, "Stok 0 veya daha büyük bir tam sayı olmalı."),
    isActive: z.coerce.boolean().default(true),
    sortOrder: z.coerce.number().int().min(0, "Sıra 0 veya daha büyük olmalı.").default(0),
  })
  .refine(
    (data) => data.price === undefined || data.compareAtPrice === undefined || data.compareAtPrice >= data.price,
    { message: "Karşılaştırma fiyatı, satış fiyatından düşük olamaz.", path: ["compareAtPrice"] },
  );
