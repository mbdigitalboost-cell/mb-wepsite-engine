import "server-only";

import { fetchPublishedList } from "@/lib/cms/adapters/shared";
import type { NamedContentRow } from "@/lib/cms/customer-types";

/** e.g. `getCampaigns("PETRA", petraCampaigns)` — see lib/data/petra/campaigns.ts. */
export async function getCampaigns<T>(connectionKey: string, fallback: T): Promise<NamedContentRow[] | T> {
  return fetchPublishedList<NamedContentRow, T>(connectionKey, "campaigns", "sort_order", fallback);
}
