import "server-only";

import { fetchPublishedList } from "@/lib/cms/adapters/shared";
import type { ClientReferenceRow } from "@/lib/cms/customer-types";

/** e.g. `getClientReferences("PETRA", petraReferences)` — see lib/data/petra/references.ts. */
export async function getClientReferences<T>(connectionKey: string, fallback: T): Promise<ClientReferenceRow[] | T> {
  return fetchPublishedList<ClientReferenceRow, T>(connectionKey, "client_references", "sort_order", fallback);
}
