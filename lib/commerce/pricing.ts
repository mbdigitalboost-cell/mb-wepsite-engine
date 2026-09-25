import type { PublicOptionGroup, PublicProductAddon, PublicProductVariant } from "./public/products";

/**
 * FAZ 1 (mağaza sepeti/configurator) — the "lib/commerce/pricing.ts,
 * henüz yazılmadı" file lib/validation/product-addon.ts's own CRITICAL
 * comment already anticipated. Deliberately a PLAIN module (no
 * "use client"/"use server"/"server-only") — it runs in the browser
 * today (ProductConfigurator's live price preview, and the cart's own
 * line-total display) with zero DB access, and is written so a future
 * Faz 2 order-creation Server Action can import and reuse the exact same
 * function for its own server-authoritative repricing, never duplicating
 * this logic a second time.
 *
 * FAZ 1 SCOPE NOTE: nothing this function computes is ever written to a
 * database or trusted as a real charge — Faz 1 has no cart/order tables
 * at all (client-side-only localStorage cart, "Sipariş Ver" disabled).
 * This is a preview computation only. Faz 2's own order-creation action
 * MUST re-derive the real price server-side from fresh DB rows (product/
 * variant/addon ids only — never a client-supplied price/total), exactly
 * per productAddonFormSchema's own CRITICAL warning.
 */

export interface ComputedPrice {
  /** The base unit price before any addon deltas — either the matched variant's own price, or the product's base price. */
  basePrice: number;
  /** Mirrors basePrice's own source (variant or product) — addons are NEVER added to this, per spec. `null` = no "was" price to show. */
  baseCompareAtPrice: number | null;
  /** Sum of every currently-selected addon's priceDelta. */
  addonsTotal: number;
  /** basePrice + addonsTotal — the actual number to show/charge for one unit. */
  totalPrice: number;
  /** The variant this selection resolved to, if every option group has a selection AND that exact combination matches a real variant. `null` otherwise (falls back to the base product price). */
  matchedVariant: PublicProductVariant | null;
}

/**
 * Resolves the live unit price for a product given the customer's current
 * option-group selections and addon selections. Pure — no I/O, safe to
 * call on every keystroke/click from a Client Component.
 *
 * PRICE RESOLUTION (spec, uygulanan sıra):
 *   1. Every existing option_group must have a selection AND that exact
 *      set of selected option_value ids must match a real variant's own
 *      optionValueIds (order-independent) -> use THAT variant's own
 *      price/compareAtPrice (falling back to the base product's only when
 *      the variant's own field is null — migration 0018's documented
 *      null="inherit base" contract).
 *   2. Otherwise (no selection, partial selection, or a combination with
 *      no matching variant) -> the base product's own price/compareAtPrice.
 *   3. Every SELECTED addon's priceDelta is summed and added to whichever
 *      base price from (1)/(2) applies. compareAtPrice never gets an
 *      addon delta added to it (spec: "compareAtPrice'a addon eklenmez").
 */
export function computeConfiguredPrice(params: {
  productPrice: number;
  productCompareAtPrice: number | null;
  optionGroups: PublicOptionGroup[];
  variants: PublicProductVariant[];
  addons: PublicProductAddon[];
  /** option_group id -> selected option_value id. */
  selectedOptionValueIdByGroup: Record<string, string>;
  /** ids of currently-selected addons (required addons are always included by the caller — see resolveRequiredAddonIds). */
  selectedAddonIds: string[];
}): ComputedPrice {
  const { productPrice, productCompareAtPrice, optionGroups, variants } = params;

  const matchedVariant = findMatchingVariant(optionGroups, variants, params.selectedOptionValueIdByGroup);

  let basePrice = productPrice;
  let baseCompareAtPrice = productCompareAtPrice;

  if (matchedVariant) {
    basePrice = matchedVariant.price ?? productPrice;
    // Only inherit the base product's compareAtPrice when the variant's
    // own price ALSO came from the base (both null) — a variant with its
    // OWN price but no compareAtPrice should show no "was" price at all,
    // never the base product's (which was set relative to a different
    // price point and could otherwise render a nonsensical "was less,
    // now more" display).
    baseCompareAtPrice = matchedVariant.price !== null ? matchedVariant.compareAtPrice : productCompareAtPrice;
  }

  const selectedAddonIdSet = new Set(params.selectedAddonIds);
  const addonsTotal = params.addons
    .filter((a) => selectedAddonIdSet.has(a.id))
    .reduce((sum, a) => sum + a.priceDelta, 0);

  return {
    basePrice,
    baseCompareAtPrice,
    addonsTotal,
    totalPrice: basePrice + addonsTotal,
    matchedVariant,
  };
}

function findMatchingVariant(
  optionGroups: PublicOptionGroup[],
  variants: PublicProductVariant[],
  selectedOptionValueIdByGroup: Record<string, string>,
): PublicProductVariant | null {
  if (optionGroups.length === 0) return null;

  const allGroupsSelected = optionGroups.every((g) => Boolean(selectedOptionValueIdByGroup[g.id]));
  if (!allGroupsSelected) return null;

  const selectedIds = [...new Set(optionGroups.map((g) => selectedOptionValueIdByGroup[g.id]))].sort();

  return (
    variants.find((v) => {
      const variantIds = [...new Set(v.optionValueIds)].sort();
      return variantIds.length === selectedIds.length && variantIds.every((id, i) => id === selectedIds[i]);
    }) ?? null
  );
}

/** Addons the customer can never deselect — the caller merges these into its own selection state on mount/change of `addons`. */
export function resolveRequiredAddonIds(addons: PublicProductAddon[]): string[] {
  return addons.filter((a) => a.isRequired).map((a) => a.id);
}
