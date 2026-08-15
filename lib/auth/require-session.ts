import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getOptionalUser } from "@/lib/auth/get-optional-user";

export interface RequiredSession {
  user: User;
}

/**
 * Server-side session guard. Call this at the top of any Server
 * Component or Server Action that must not run without a logged-in
 * user — today that's `app/dashboard/layout.tsx`, which protects every
 * `/dashboard/*` route in one place.
 *
 * This is the ONLY thing that gates dashboard access. There is no
 * client-side "hide the button if not logged in" check anywhere —
 * that's explicitly not a security boundary, only a session check that
 * runs on the server, before anything renders, counts.
 *
 * Redirects to /login (never throws a raw error to the page) when:
 *  - there is no session, or
 *  - Supabase isn't configured yet (no Platform project connected) —
 *    fails safe to "you must log in" rather than silently allowing
 *    access.
 */
export async function requireSession(): Promise<RequiredSession> {
  const user = await getOptionalUser();

  if (!user) {
    redirect("/login");
  }

  return { user };
}
