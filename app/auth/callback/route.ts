import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Handles every Supabase Auth "click a link in an email" flow: invite
 * acceptance, password recovery, magic link. Supabase sends the user
 * here with a `?code=...` query param; exchanging it for a session sets
 * the auth cookies (via the same cookie-writing Supabase server client
 * used everywhere else), then we forward the user on.
 *
 * `next` lets a specific flow choose where to land afterwards (defaults
 * to the dashboard). Not used yet by anything in this phase — invite
 * emails currently just redirect to /auth/callback with no `next`, which
 * lands the invited user in /dashboard, already authenticated. Setting
 * their own password from there is deferred to a later phase (see
 * lib/auth/invite-user.ts) — this route only establishes the session.
 *
 * GET /auth/callback?code=...&next=/dashboard
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
