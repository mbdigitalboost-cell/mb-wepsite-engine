import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Looks up which customer-project `supabase_connection_key` the CMS
 * dashboard should use for a given Platform `customerId` — the first
 * active website belonging to that customer (migration 0001:
 * `websites.customer_id` / `websites.status` / `websites.supabase_connection_key`).
 *
 * Deliberately generic — no `if (customerId === "<petra-id>")` anywhere.
 * Works identically for any future customer the moment they get an
 * active website row with a connection key; today only Petra has one.
 * Returns `null` (never throws) if the customer has no active website
 * yet, same "fail soft" contract as lib/cms/connection.ts.
 */
export async function resolveConnectionKeyForCustomer(customerId: string): Promise<string | null> {
  try {
    const platformAdmin = createSupabaseAdminClient();
    const { data, error } = await platformAdmin
      .from("websites")
      .select("supabase_connection_key")
      .eq("customer_id", customerId)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[cms/resolve-customer-connection] lookup failed for customerId:", customerId, error.message);
      return null;
    }

    return data?.supabase_connection_key ?? null;
  } catch (err) {
    console.error("[cms/resolve-customer-connection] Platform admin client unavailable:", err);
    return null;
  }
}
