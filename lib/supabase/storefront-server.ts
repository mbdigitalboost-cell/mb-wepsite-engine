import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/config/env";
import type { Database } from "@/lib/supabase/types";

/**
 * FAZ 5.1c — Supabase client for the storefront customer auth surface
 * (app/store/[storeSlug]/**: layout.tsx, hesap/**, sepet/**) ONLY.
 *
 * BUG THIS FIXES (reported live, reproduced): a platform admin logged
 * into /dashboard was ALSO shown as "logged in" on a store's own
 * /hesap page, and signing out of one signed the other out too. Root
 * cause — both surfaces called the same `createSupabaseServerClient()`
 * (lib/supabase/server.ts), which uses @supabase/ssr's default cookie
 * name — so despite being two conceptually different accounts/audiences
 * (platform staff vs. a store's own customer), they were literally one
 * Supabase Auth session sharing one cookie. Not an authorization bug
 * (every role check still reads from its own table — customer_users for
 * the dashboard, store_customers for a store — so neither surface could
 * ever read the other's data), but a real session/UX contamination bug:
 * an admin's browser could silently "become" a store customer and vice
 * versa.
 *
 * FIX: this client sets `cookieOptions.name` to a distinct base cookie
 * name, so the storefront's session lives in entirely separate cookies
 * from `createSupabaseServerClient()`'s default ones. Same Supabase Auth
 * user pool either way (per Faz 5.1's own architecture — reusing
 * auth.users, not a second auth system) — a person CAN be logged into
 * both surfaces at once with the same or different accounts, but each
 * surface's session is now independent: signing out of one has zero
 * effect on the other.
 *
 * `/dashboard`, `/login`, `/mfa-challenge`, and every other admin-side
 * route are UNTOUCHED — they keep using `createSupabaseServerClient()`
 * (lib/supabase/server.ts) and its default cookie name exactly as
 * before. `/auth/callback/route.ts` is the one shared route that must
 * pick between the two clients (see its own comment) since it's reached
 * by both an admin invite/reset link AND a storefront password-reset
 * link.
 */
export async function createSupabaseStorefrontServerClient() {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    throw new Error(
      "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.local.example to .env.local and fill in your project's values.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookieOptions: { name: "sb-storefront-auth" },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component that can't set cookies (e.g.
          // during static rendering). Safe to ignore as long as session
          // refresh also happens in middleware.
        }
      },
    },
  });
}
