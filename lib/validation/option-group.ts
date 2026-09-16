import { z } from "zod";

/**
 * FAZ 2A — Option Group (store_editor+ writes; permanent delete is
 * store_admin+ only). Mirrors migration
 * 0018_product_variants_options.sql's `option_groups` table exactly —
 * note there is NO is_active column here (unlike categories/brands/
 * products/product_variants): option groups are dashboard/configurator-
 * only, with no anon SELECT policy at all (see that migration's own
 * header comment), so there is no "public" view for an is_active flag to
 * gate.
 *
 * productId is required — same-store correctness enforced by the DB's
 * composite FK (product_id, store_id), not here. store_id itself is
 * never a field in this schema (see lib/validation/product.ts's
 * rationale).
 */
export const optionGroupFormSchema = z.object({
  productId: z.string().uuid("Geçerli bir ürün seçilmeli."),
  name: z.string().trim().min(1, "Seçenek grubu adı zorunlu.").max(150),
  sortOrder: z.coerce.number().int().min(0, "Sıra 0 veya daha büyük olmalı.").default(0),
});
