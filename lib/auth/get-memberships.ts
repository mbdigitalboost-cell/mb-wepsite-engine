import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/types";
import { isAdminRole } from "@/lib/auth/roles";

export interface Membership {
  role: AppRole;
  /** `null` for an `admin` row — an admin isn't scoped to one customer. */
  customerId: string | null;
}

/**
 * Reads a user's `customer_users` rows — the basic "who is this person
 * allowed to see" infrastructure. Phase 2 deliberately stops here: no
 * dashboard page yet branches its rendering or its content on this, that
 * comes with the actual admin/customer panels in a later phase.
 *
 * Relies entirely on Platform RLS (migration 0004) to actually restrict
 * which rows come back — this function does not add its own filtering
 * beyond `user_id`, and doesn't need to: a customer user's session can
 * only ever see their own rows here regardless of what this query asks
 * for.
 */
export async function getCurrentMemberships(userId: string): Promise<Membership[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customer_users")
    .select("role, customer_id")
    .eq("user_id", userId);

  if (error) {
    // Fails closed: no memberships found reads as "no access" everywhere
    // this is used, never as "admin by default".
    console.error("[auth] failed to load customer_users memberships:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({ role: row.role, customerId: row.customer_id }));
}

export function isAdminMembership(memberships: Membership[]): boolean {
  return memberships.some((membership) => isAdminRole(membership.role));
}
