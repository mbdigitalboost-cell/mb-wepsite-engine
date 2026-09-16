import { z } from "zod";

/**
 * FAZ 2A — Product (store_editor+ writes; permanent delete is
 * store_admin+ only — same split as categories/brands). Mirrors
 * migration 0017_products.sql's `products` table exactly.
 *
 * categoryId/brandId are NULLABLE relations — same optional-UUID-or-empty
 * pattern as store-navigation.ts's parentItemId / category's parentId.
 * Their cross-tenant correctness is NOT this schema's job: the DB's
 * composite FK (category_id, store_id) / (brand_id, store_id) is what
 * actually rejects a category/brand belonging to a different store (see
 * the P0 MIGRATION HARDENING FIX report) — this schema only checks that
 * a value, if present, is a well-formed UUID. store_id itself is never a
 * field here (see lib/validation/category.ts's rationale — same reason).
 *
 * sku is REQUIRED at this validation layer (a deliberate admin-UX
 * decision) even though the DB column itself is nullable — migration
 * 0017 gives `sku` no `not null`, only a tenant-scoped unique constraint
 * that tolerates multiple NULLs per store. This is an app-layer
 * tightening, not a mismatch with the DB: "validation schema DB
 * constraint'lerinin yerine geçmez" — here validation is deliberately
 * STRICTER than the DB, which is allowed (never looser).
 *
 * There is NO isPublished field — deliberately, matching migration
 * 0017's own header comment: is_active alone serves both the admin
 * toggle and the anon RLS gate, exactly like store_homepage_sections /
 * store_navigation_items. Do not add one without a matching migration.
 *
 * The price >= compareAtPrice relationship mirrors the DB CHECK
 * (`compare_at_price is null or compare_at_price >= price`) as a
 * same-turn UX nicety — the DB CHECK remains the real enforcement.
 */
const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, "Ürün adı zorunlu.").max(200),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Slug zorunlu.")
      .max(150)
      .regex(slugRegex, "Slug yalnızca küçük harf, rakam ve tire (-) içerebilir."),
    sku: z.string().trim().min(1, "SKU zorunlu.").max(100),
    shortDescription: z.string().trim().max(500).optional().or(z.literal("")),
    description: z.string().trim().max(5000).optional().or(z.literal("")),
    /** Nullable relations — same-store correctness enforced by the DB composite FK, not here. */
    categoryId: z.string().uuid().optional().or(z.literal("")),
    brandId: z.string().uuid().optional().or(z.literal("")),
    price: z.coerce.number().min(0, "Fiyat 0 veya daha büyük olmalı."),
    compareAtPrice: z.coerce.number().min(0, "Karşılaştırma fiyatı 0 veya daha büyük olmalı.").optional(),
    stock: z.coerce.number().int().min(0, "Stok 0 veya daha büyük bir tam sayı olmalı."),
    trackInventory: z.coerce.boolean().default(true),
    isActive: z.coerce.boolean().default(true),
    sortOrder: z.coerce.number().int().min(0, "Sıra 0 veya daha büyük olmalı.").default(0),
    seoTitle: z.string().trim().max(200).optional().or(z.literal("")),
    seoDescription: z.string().trim().max(300).optional().or(z.literal("")),
  })
  .refine((data) => data.compareAtPrice === undefined || data.compareAtPrice >= data.price, {
    message: "Karşılaştırma fiyatı, satış fiyatından düşük olamaz.",
    path: ["compareAtPrice"],
  });
