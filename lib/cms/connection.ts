import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CustomerDatabase } from "@/lib/cms/customer-types";

/**
 * The generic connection factory — this is what lets ONE codebase serve
 * every MB Digital Boost customer without any `if (customer === "petra")`
 * branching anywhere (see Phase 5 instruction §9/§13). Given a
 * `connectionKey` (e.g. "PETRA"), it resolves that customer's own,
 * separate Supabase project — never the Platform project.
 *
 * `connectionKey` is NEVER trusted as a raw env-var name on its own. It
 * must first be found as an ACTIVE website's `supabase_connection_key` in
 * the Platform database (migration 0001) — this is the only thing that
 * makes a key "real". Only after that lookup succeeds do we read the
 * matching env vars:
 *
 *   SUPABASE_URL_<KEY>
 *   SUPABASE_ANON_KEY_<KEY>            (public client)
 *   SUPABASE_SERVICE_ROLE_KEY_<KEY>    (service client)
 *
 * Every failure mode here — unknown key, inactive website, missing env
 * vars — returns `null`. Nothing in this file ever throws for a "not
 * configured yet" case; that is what lets a customer whose Supabase
 * project doesn't exist yet (Petra, today) fail soft into the CMS
 * adapter's static fallback instead of crashing the site. Only a genuine
 * unexpected DB error is logged (console.error) — a missing/inactive
 * connection is expected, ordinary state, not an error.
 */

async function resolveActiveConnectionKey(connectionKey: string): Promise<boolean> {
  if (!connectionKey) return false;

  try {
    const platformAdmin = createSupabaseAdminClient();
    const { data, error } = await platformAdmin
      .from("websites")
      .select("id")
      .eq("supabase_connection_key", connectionKey)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("[cms/connection] Platform lookup failed for connectionKey:", connectionKey, error.message);
      return false;
    }

    return Boolean(data);
  } catch (err) {
    // createSupabaseAdminClient() throws if the PLATFORM service-role env
    // vars themselves are missing (see lib/supabase/admin.ts) — that's a
    // platform-level misconfiguration, not a per-customer one, but it
    // still must not crash a page render. Log and fail soft like every
    // other case here.
    console.error("[cms/connection] Platform admin client unavailable:", err);
    return false;
  }
}

function readCustomerEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

/**
 * Anon-key client for that customer's project — respects that project's
 * RLS (0005_customer_rls.sql), so this can only ever read `published`
 * content. This is what the public CMS adapters (lib/cms/adapters/*) use.
 */
export async function getCustomerPublicSupabaseClient(
  connectionKey: string,
): Promise<SupabaseClient<CustomerDatabase> | null> {
  if (!(await resolveActiveConnectionKey(connectionKey))) return null;

  const url = readCustomerEnv(`SUPABASE_URL_${connectionKey}`);
  const anonKey = readCustomerEnv(`SUPABASE_ANON_KEY_${connectionKey}`);
  if (!url || !anonKey) return null;

  return createClient<CustomerDatabase>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Service-role client for that customer's project — bypasses that
 * project's RLS entirely, same trust level as
 * lib/supabase/admin.ts's createSupabaseAdminClient() for the Platform
 * project. `server-only` above makes importing this into a Client
 * Component a build error, so the service role key can never reach the
 * browser through this path. Not called by anything yet in this phase —
 * this is the primitive a future CMS editor / seed script will use.
 */
export async function getCustomerSupabaseClient(
  connectionKey: string,
): Promise<SupabaseClient<CustomerDatabase> | null> {
  if (!(await resolveActiveConnectionKey(connectionKey))) return null;

  const url = readCustomerEnv(`SUPABASE_URL_${connectionKey}`);
  const serviceRoleKey = readCustomerEnv(`SUPABASE_SERVICE_ROLE_KEY_${connectionKey}`);
  if (!url || !serviceRoleKey) return null;

  return createClient<CustomerDatabase>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
