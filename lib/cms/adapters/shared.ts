import "server-only";

import { getCustomerPublicSupabaseClient } from "@/lib/cms/connection";
import type { CustomerDatabase } from "@/lib/cms/customer-types";

type TableName = keyof CustomerDatabase["public"]["Tables"];

/**
 * Shared "connect → query published rows → fall back on anything short
 * of success" logic for every list-shaped adapter (services, solutions,
 * projects, campaigns, testimonials, faqs, navigation_items).
 *
 * Fallback sequence, per Phase 5 instruction §15:
 *   1. Customer CMS published data (if connected and present)
 *   2. Static fallback (the caller's `fallback` argument — e.g.
 *      `lib/data/petra/solutions.ts`'s `petraSolutions`)
 *   3. Never fabricated data — if there's truly nothing, callers get
 *      back exactly the fallback they passed in, nothing invented here.
 *
 * Never throws. "Not connected yet" (no row in Platform `websites` for
 * this connectionKey, inactive website, missing env vars — see
 * lib/cms/connection.ts) is ordinary, silent, expected behavior for
 * every customer that doesn't have a Supabase project yet (Petra,
 * today). Only a genuine query error against an ALREADY-connected
 * project is logged — that's the "security/authorization errors must
 * not be silently swallowed" case from the Phase 5 instructions.
 */
export async function fetchPublishedList<Row, Fallback>(
  connectionKey: string,
  table: TableName,
  orderColumn: string,
  fallback: Fallback,
): Promise<Row[] | Fallback> {
  const client = await getCustomerPublicSupabaseClient(connectionKey);
  if (!client) return fallback;

  const { data, error } = await client
    .from(table)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic across every content table's row shape, narrowed by the caller's Row type param
    .select("*" as any)
    // `table` is the union of all 14 customer tables, only some of which
    // (the content ones this function is used for) actually have a
    // `status`/order column — the common-columns intersection across ALL
    // tables is just "id" | "created_at", so these keys need the same
    // cast as `.select("*" as any)` above.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
    .eq("status" as any, "published")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
    .order(orderColumn as any, { ascending: true });

  if (error) {
    console.error(`[cms/adapters] ${table} query failed for connectionKey="${connectionKey}":`, error.message);
    return fallback;
  }

  if (!data || data.length === 0) return fallback;

  return data as Row[];
}

/**
 * Single-row equivalent — used by site_settings (singleton-in-practice)
 * and hero_sections (site-wide hero: page_id IS NULL). Same fallback
 * rules as fetchPublishedList.
 */
export async function fetchPublishedSingle<Row, Fallback>(
  connectionKey: string,
  table: TableName,
  fallback: Fallback,
): Promise<Row | Fallback> {
  const client = await getCustomerPublicSupabaseClient(connectionKey);
  if (!client) return fallback;

  const { data, error } = await client
    .from(table)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic across table row shapes, narrowed by the caller's Row type param
    .select("*" as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment in fetchPublishedList above
    .eq("status" as any, "published")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`[cms/adapters] ${table} query failed for connectionKey="${connectionKey}":`, error.message);
    return fallback;
  }

  if (!data) return fallback;

  return data as Row;
}
