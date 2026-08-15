import "server-only";

import { fetchPublishedList } from "@/lib/cms/adapters/shared";
import type { NamedContentRow } from "@/lib/cms/customer-types";

/** e.g. `getSolutions("PETRA", petraSolutions)` — see lib/data/petra/solutions.ts. */
export async function getSolutions<T>(connectionKey: string, fallback: T): Promise<NamedContentRow[] | T> {
  return fetchPublishedList<NamedContentRow, T>(connectionKey, "solutions", "sort_order", fallback);
}
