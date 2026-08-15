import "server-only";

import { notFound } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { requireSession } from "@/lib/auth/require-session";
import { getCurrentMemberships } from "@/lib/auth/get-memberships";

export interface CustomerAccessContext {
  user: User;
  isAdmin: boolean;
}

/**
 * Gate for a page/action scoped to ONE specific customer — e.g.
 * `/dashboard/customers/[customerId]`. Mirrors exactly what Platform
 * RLS's `is_customer_member(target_customer_id)` does (migration 0004):
 *   - a platform admin always passes (implicitly a member of every
 *     customer), regardless of `customerId`;
 *   - a customer user passes only if one of their own `customer_users`
 *     rows has this exact `customerId`.
 *
 * Uses `notFound()` (a 404), not a "you don't have permission" page —
 * deliberately. A customer who edits the URL to try a different
 * customer's ID should not be able to tell "wrong ID" apart from "right
 * ID, but not yours" — confirming a customer ID exists to someone not
 * allowed to see it is its own small information leak.
 *
 * IMPORTANT: this is a fast, clean UX check, NOT the real security
 * boundary. Even if a bug skipped this call entirely, Platform RLS
 * independently blocks the underlying `customers`/`websites` queries
 * from ever returning another customer's row — that's what was
 * functionally verified with 6 test scenarios in Phase 1 (see
 * supabase/platform/migrations/0004_platform_rls.sql). This function
 * existing just means the wrong-customer case fails fast with a clean
 * 404 instead of an empty or broken page after RLS silently returns
 * nothing.
 */
export async function requireCustomerAccess(customerId: string): Promise<CustomerAccessContext> {
  const { user } = await requireSession();
  const memberships = await getCurrentMemberships(user.id);

  const isAdmin = memberships.some((membership) => membership.role === "admin");
  const isMemberOfThisCustomer = memberships.some(
    (membership) => membership.role === "customer" && membership.customerId === customerId,
  );

  if (!isAdmin && !isMemberOfThisCustomer) {
    notFound();
  }

  return { user, isAdmin };
}
