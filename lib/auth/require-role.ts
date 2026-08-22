import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { requireSession } from "@/lib/auth/require-session";
import { getCurrentMemberships, type Membership } from "@/lib/auth/get-memberships";
import { isAdminRole } from "@/lib/auth/roles";
import type { AppRole } from "@/lib/supabase/types";

export interface RoleContext {
  user: User;
  memberships: Membership[];
  isAdmin: boolean;
}

/**
 * Shared first step for every authorization check in this folder:
 * confirms there's a session (redirecting to /login if not — see
 * require-session.ts), then loads that user's `customer_users` rows.
 *
 * Does NOT reject anything based on role by itself — a page that needs
 * to render *differently* per role (e.g. app/dashboard/page.tsx: admins
 * see every customer, customer users get sent to their own) calls this
 * directly. A page that is simply admin-only, or scoped to one specific
 * customer, should use `requireRole()` / `requireAdmin()` /
 * `requireCustomerAccess()` instead — they express the intent more
 * clearly and reject automatically.
 */
export async function loadRoleContext(): Promise<RoleContext> {
  const { user } = await requireSession();
  const memberships = await getCurrentMemberships(user.id);
  const isAdmin = memberships.some((membership) => isAdminRole(membership.role));
  return { user, memberships, isAdmin };
}

/**
 * Requires a session AND at least one `customer_users` row with the
 * given role. Redirects to `/dashboard` (not `/login` — the user IS
 * logged in, they're just not allowed at whatever called this) when the
 * role requirement isn't met.
 *
 * This is an application-level convenience for fast, clean redirects —
 * the actual security boundary is Platform RLS (migration 0004), which
 * independently blocks the underlying Supabase queries regardless of
 * whether this check runs. See require-customer-access.ts for the
 * per-customer equivalent.
 */
export async function requireRole(role: AppRole): Promise<RoleContext> {
  const context = await loadRoleContext();

  const hasRole = context.memberships.some((membership) => membership.role === role);
  if (!hasRole) {
    redirect("/dashboard");
  }

  return context;
}
