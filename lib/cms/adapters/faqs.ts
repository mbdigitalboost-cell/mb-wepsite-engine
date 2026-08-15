import "server-only";

import { fetchPublishedList } from "@/lib/cms/adapters/shared";
import type { FaqRow } from "@/lib/cms/customer-types";

/** e.g. `getFaqs("PETRA", petraFaqs)` — see lib/data/petra/faqs.ts. */
export async function getFaqs<T>(connectionKey: string, fallback: T): Promise<FaqRow[] | T> {
  return fetchPublishedList<FaqRow, T>(connectionKey, "faqs", "sort_order", fallback);
}
