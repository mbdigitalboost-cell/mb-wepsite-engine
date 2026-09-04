import "server-only";

import { fetchPublishedList } from "@/lib/cms/adapters/shared";
import type { ProductShowcaseItemRow } from "@/lib/cms/customer-types";

/** e.g. `getProductShowcaseItems("PETRA", petraProductShowcase)` — see lib/data/petra/product-showcase.ts. */
export async function getProductShowcaseItems<T>(
  connectionKey: string,
  fallback: T,
): Promise<ProductShowcaseItemRow[] | T> {
  return fetchPublishedList<ProductShowcaseItemRow, T>(connectionKey, "product_showcase_items", "sort_order", fallback);
}
