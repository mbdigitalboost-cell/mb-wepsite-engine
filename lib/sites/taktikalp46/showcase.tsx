import type { StorefrontShowcase } from "@/lib/commerce/public/storefront-showcase-types";
import { brandFallback } from "@/lib/sites/taktikalp46/brand-assets";
import { StorefrontHome } from "@/lib/sites/taktikalp46/storefront-home";

/** Taktikalp46 mağazasının vitrini — ortak motor bunu storefront-showcases.ts kaydından okur. */
export const showcase: StorefrontShowcase = {
  storeSlug: "taktikalp46",
  Home: StorefrontHome,
  brandFallback,
};
