import "server-only";

import { fetchPublishedList } from "@/lib/cms/adapters/shared";
import type { NamedContentRow } from "@/lib/cms/customer-types";

/** e.g. `getServices("PETRA", petraServices)` — see lib/data/petra/services.ts. */
export async function getServices<T>(connectionKey: string, fallback: T): Promise<NamedContentRow[] | T> {
  return fetchPublishedList<NamedContentRow, T>(connectionKey, "services", "sort_order", fallback);
}
