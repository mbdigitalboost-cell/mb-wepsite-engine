/**
 * FAZ 1 (mağaza sepeti/configurator) — previously duplicated as a local
 * `formatPrice` in urun/[productSlug]/page.tsx; pulled out here since this
 * phase adds 3 more places (product-configurator.tsx, the cart list,
 * store-header's own line items) that need the exact same TRY formatting
 * — a single shared function means they can never drift apart.
 */
export function formatPrice(value: number): string {
  return value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}
