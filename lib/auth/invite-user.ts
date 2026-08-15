import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/config/env";

export interface InviteUserInput {
  email: string;
  /** Stored on the auto-created `profiles` row via Supabase Auth user metadata + the handle_new_user trigger reading it isn't guaranteed, so callers should also update `profiles.full_name` themselves after invite — see app/dashboard/users/actions.ts. */
  fullName?: string;
  /**
   * Where the invite link sends the user after they click it. Defaults
   * to the auth callback with `?next=/auth/set-password`, so a freshly
   * invited user lands on the password-setup screen instead of straight
   * into the dashboard with no password of their own — closes the gap
   * flagged in the Phase 2 report ("davet sonrası şifre belirleme").
   * `app/auth/callback/route.ts` already reads and honors `next`, so
   * that route needed no changes for this — only this default.
   */
  redirectTo?: string;
}

export interface InviteUserResult {
  ok: boolean;
  userId?: string;
  error?: string;
}

/**
 * Sends a Supabase Auth invite email — the only way a new user account
 * gets created in this system. There is deliberately no "sign up" page:
 * an admin invites someone (via the "Kullanıcı Davet Et" form, Phase 4),
 * Supabase emails them a link, they click it and land in
 * `/auth/callback` already authenticated, then `/auth/set-password` to
 * choose their own password. The admin never sees or sets that password
 * themselves.
 *
 * Uses the service-role admin client — `server-only` (transitively, via
 * lib/supabase/admin.ts) makes it a build error to import this into a
 * Client Component, so the service role key can never reach the browser
 * through this path.
 */
export async function inviteUser({ email, fullName, redirectTo }: InviteUserInput): Promise<InviteUserResult> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectTo ?? `${publicEnv.siteUrl}/auth/callback?next=${encodeURIComponent("/auth/set-password")}`,
    data: fullName ? { full_name: fullName } : undefined,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, userId: data.user?.id };
}
