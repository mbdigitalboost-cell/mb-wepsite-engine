import { z } from "zod";

/**
 * FAZ 2A — Variant ↔ Option Value assignment (store_editor+ writes).
 * `variant_option_values` (migration 0018) is a pure junction table —
 * primary key (variant_id, option_value_id), no `id`, no timestamps, no
 * content fields of its own beyond the two relations it links. This
 * schema therefore validates the SET of option_value ids to attach to
 * one variant (e.g. a multi-select in the variant editor form), not a
 * single junction-row shape — mirroring the same
 * one-ordered/related-list-per-submit approach as
 * homepageSectionReorderSchema / storeNavigationReorderSchema.
 *
 * Same-store correctness of variantId/each optionValueId is enforced by
 * the DB's composite FKs — (variant_id, store_id) CASCADE and
 * (option_value_id, store_id) RESTRICT (see migration 0018's own
 * comment on the delete-behavior asymmetry) — not by this schema.
 * store_id itself is never a field here (see
 * lib/validation/product.ts's rationale).
 */
export const variantOptionValueAssignmentSchema = z.object({
  variantId: z.string().uuid("Geçerli bir varyant seçilmeli."),
  optionValueIds: z.array(z.string().uuid()).min(1, "En az bir değer seçilmeli."),
});
