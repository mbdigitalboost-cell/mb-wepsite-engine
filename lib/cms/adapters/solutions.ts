import "server-only";

import { fetchPublishedList } from "@/lib/cms/adapters/shared";
import type { SolutionRow } from "@/lib/cms/customer-types";

/** e.g. `getSolutions("PETRA", petraSolutions)` — see lib/data/petra/solutions.ts. */
export async function getSolutions<T>(connectionKey: string, fallback: T): Promise<SolutionRow[] | T> {
  return fetchPublishedList<SolutionRow, T>(connectionKey, "solutions", "sort_order", fallback);
}
