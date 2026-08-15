import "server-only";

import { fetchPublishedList } from "@/lib/cms/adapters/shared";
import type { NamedContentRow } from "@/lib/cms/customer-types";

/** e.g. `getProjects("PETRA", petraProjects)` — see lib/data/petra/projects.ts. */
export async function getProjects<T>(connectionKey: string, fallback: T): Promise<NamedContentRow[] | T> {
  return fetchPublishedList<NamedContentRow, T>(connectionKey, "projects", "sort_order", fallback);
}
