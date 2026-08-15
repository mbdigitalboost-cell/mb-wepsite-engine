import "server-only";

import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

/**
 * Reads the current Supabase Auth session, if any, without redirecting.
 * Use this when "not logged in" is a normal, expected outcome (e.g. the
 * login page checking whether to bounce an already-logged-in visitor
 * straight to /dashboard). For anything that must NOT render without a
 * session, use `requireSession()` instead.
 *
 * Returns `null` — never throws — when Supabase isn't configured yet, so
 * this foundation keeps working before a real Platform project exists.
 */
export async function getOptionalUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}
