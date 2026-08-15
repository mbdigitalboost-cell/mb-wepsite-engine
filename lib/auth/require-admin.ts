import "server-only";

import type { User } from "@supabase/supabase-js";
import { requireRole } from "@/lib/auth/require-role";

export interface AdminContext {
  user: User;
}

/**
 * Gate for admin-only pages and Server Actions — today that's
 * `/dashboard/websites` (a cross-customer list; nothing a single
 * customer should see) and, later, "yeni müşteri oluştur" /
 * "kullanıcı davet et" style actions.
 *
 * Redirects any non-admin (including a logged-in customer user) back to
 * `/dashboard` before any admin-only content or data fetch happens.
 * Never relies on the client to have hidden the link — see
 * components/navigation/dashboard-nav.tsx, which hides admin-only nav
 * items for customers as a UX nicety, not as the actual guard.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const { user } = await requireRole("admin");
  return { user };
}
