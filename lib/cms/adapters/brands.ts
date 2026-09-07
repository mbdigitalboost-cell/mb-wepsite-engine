import "server-only";

import { fetchPublishedList } from "@/lib/cms/adapters/shared";
import type { BrandRow } from "@/lib/cms/customer-types";

/** e.g. `getBrands("PETRA", petraBrands)` — see lib/data/petra/brands.ts. */
export async function getBrands<T>(connectionKey: string, fallback: T): Promise<BrandRow[] | T> {
  return fetchPublishedList<BrandRow, T>(connectionKey, "brands", "sort_order", fallback);
}
