import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
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
 */
export async function updateSupabaseSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return response;
  }

  const supabase = createServerClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
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
    },
  );

  // Revalidates the session and refreshes it if needed. Do not remove —
  // omitting this call is a common source of random, hard-to-debug
  // logouts with Supabase SSR auth.
  await supabase.auth.getUser();

  return response;
}
