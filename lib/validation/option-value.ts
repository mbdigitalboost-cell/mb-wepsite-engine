import { z } from "zod";

/**
 * FAZ 2A — Option Value (store_editor+ writes; permanent delete is
 * store_admin+ only). Mirrors migration
 * 0018_product_variants_options.sql's `option_values` table exactly —
 * NO is_active, and NO updated_at column either: rows are effectively
 * immutable identifiers (only sort_order/deletion ever change), per that
 * migration's own table comment.
 *
 * optionGroupId is required — same-store correctness enforced by the
 * DB's composite FK (option_group_id, store_id), not here. store_id
 * itself is never a field in this schema (see
 * lib/validation/product.ts's rationale).
 */
export const optionValueFormSchema = z.object({
  optionGroupId: z.string().uuid("Geçerli bir seçenek grubu seçilmeli."),
  value: z.string().trim().min(1, "Değer zorunlu.").max(150),
  sortOrder: z.coerce.number().int().min(0, "Sıra 0 veya daha büyük olmalı.").default(0),
});
