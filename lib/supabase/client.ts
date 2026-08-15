"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/config/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Supabase client for use inside Client Components.
 *
 * Uses only the public URL + anon key, both of which are safe to ship to
 * the browser. Row Level Security on every table is what actually keeps
 * tenants isolated — this client must never be trusted with elevated
 * privileges.
 */
export function createSupabaseBrowserClient() {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    throw new Error(
      "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.local.example to .env.local and fill in your project's values.",
    );
  }

  return createBrowserClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
  );
}
