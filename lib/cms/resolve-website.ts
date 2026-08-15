import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface ResolvedWebsite {
  websiteId: string;
  customerId: string;
  connectionKey: string;
  name: string;
}

/**
 * Domain resolver: request host → Platform `websites.domain` → active
 * website → `customer_id` + `supabase_connection_key`.
 *
 * NOT wired into any public route, layout, or middleware yet — Phase 5
 * explicitly forbids that ("BU FAZDA PUBLIC ROUTE'LARI DOMAIN RESOLVER'A
 * BAĞLAMA"). This file exists so a later phase can plug it in without
 * redesigning the lookup itself.
 *
 * Zero customer-specific branching, by design — resolving
 * "petramuhendislik.com.tr" and resolving any future customer's domain
 * go through the exact same query. No `if (host === "...")` anywhere,
 * now or ever, per the Phase 5 instruction.
 */
export async function resolveWebsiteByHost(host: string): Promise<ResolvedWebsite | null> {
  // Strip a port (e.g. "localhost:3000" during local dev) before matching
  // against the bare domain stored in websites.domain.
  const normalizedHost = host.trim().toLowerCase().replace(/:\d+$/, "");
  if (!normalizedHost) return null;

  try {
    const platformAdmin = createSupabaseAdminClient();
    const { data, error } = await platformAdmin
      .from("websites")
      .select("id, customer_id, supabase_connection_key, name")
      .eq("domain", normalizedHost)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("[cms/resolve-website] lookup failed for host:", normalizedHost, error.message);
      return null;
    }
    if (!data) return null;

    return {
      websiteId: data.id,
      customerId: data.customer_id,
      connectionKey: data.supabase_connection_key,
      name: data.name,
    };
  } catch (err) {
    console.error("[cms/resolve-website] Platform admin client unavailable:", err);
    return null;
  }
}
