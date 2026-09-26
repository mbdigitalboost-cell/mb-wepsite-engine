import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptionsWithName } from "@supabase/ssr";
import { isSupabaseConfigured, publicEnv } from "@/lib/config/env";

/**
 * Refreshes the Supabase auth session cookie on every request.
 *
 * This is what keeps a logged-in user logged in across Server Component
 * navigations (Server Components can't write cookies themselves — only
 * Route Handlers and Proxy can). Called from the root `proxy.ts`.
 *
 * No-ops safely if Supabase env vars aren't configured yet, so a fresh
 * checkout of this foundation runs without a Supabase project.
 *
 * FAZ 5.1c added a SECOND, separate cookie namespace
 * (lib/supabase/storefront-server.ts's `sb-storefront-auth`) so a store
 * customer's session never gets confused with an admin's dashboard
 * session — but that change predates this file's own last edit and never
 * updated it, so only the default (dashboard) cookie was ever refreshed
 * here. A signed-in storefront customer's session was therefore exposed
 * to the exact same "silently never refreshed, eventually invalid" class
 * of bug this proxy exists to prevent for the dashboard. Fixed by
 * refreshing both cookie namespaces here, not just the default one.
 */
async function refreshCookieSession(
  request: NextRequest,
  response: NextResponse,
  cookieOptions?: CookieOptionsWithName,
): Promise<void> {
  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    ...(cookieOptions ? { cookieOptions } : {}),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Revalidates the session and refreshes it if needed. Do not remove —
  // omitting this call is a common source of random, hard-to-debug
  // logouts with Supabase SSR auth.
  await supabase.auth.getUser();
}

export async function updateSupabaseSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return response;
  }

  await refreshCookieSession(request, response); // dashboard/admin (default cookie name)
  await refreshCookieSession(request, response, { name: "sb-storefront-auth" }); // storefront customers (Faz 5.1c)

  return response;
}
