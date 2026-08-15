import "server-only";

import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/config/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Admin Supabase client using the service role key. This BYPASSES Row
 * Level Security entirely.
 *
 * Rules:
 *  - Server-only. The `server-only` import above makes it a build error to
 *    pull this into a Client Component bundle.
 *  - Use only for operations that legitimately need to cross tenant
 *    boundaries (e.g. provisioning a new customer). Everything else should
 *    go through `createSupabaseServerClient` and rely on RLS.
 *  - Never log the service role key or return it to a client.
 */
export function createSupabaseAdminClient() {
  const serviceRoleKey = serverEnv.supabaseServiceRoleKey;

  if (!publicEnv.supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY for the admin client.",
    );
  }

  return createClient<Database>(publicEnv.supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
