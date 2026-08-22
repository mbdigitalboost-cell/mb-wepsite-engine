import "server-only";

import { notFound } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { requireSession } from "@/lib/auth/require-session";
import { getCurrentMemberships } from "@/lib/auth/get-memberships";
import { isAdminRole, isStoreRole, isStoreWriteRole } from "@/lib/auth/roles";

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

  const isAdmin = memberships.some((membership) => isAdminRole(membership.role));
  const isMemberOfThisCustomer = memberships.some(
    (membership) => isStoreRole(membership.role) && membership.customerId === customerId,
  );

  if (!isAdmin && !isMemberOfThisCustomer) {
    notFound();
  }

  return { user, isAdmin };
}

/**
 * Phase 1 RBAC genişlemesi: `requireCustomerAccess`'in "yazma" eşdeğeri.
 * `store_viewer` (salt-okur bir mağaza kullanıcısı — bugün hiçbir gerçek
 * hesapta kullanılmıyor, ama Phase 2'nin Taktikalp46 için hedeflediği
 * rol) bu kontrolden GEÇEMEZ; sadece store_admin/store_editor ve her
 * zamanki gibi platform admin'ler geçer.
 *
 * DÜRÜSTLÜK NOTU (rapora da yazılmalı): bu, `requireCustomerAccess`'in
 * aksine bir RLS karşılığı OLMAYAN bir kontrol. Okuma tarafında gerçek
 * güvenlik sınırı Platform RLS'in `is_customer_member()` fonksiyonu —
 * ama site içeriği (hero/solutions/leads/...) tamamen AYRI bir müşteri
 * Supabase projesinde yaşıyor ve dashboard oraya SERVICE-ROLE anahtarıyla
 * bağlanıyor (bkz. lib/cms/connection.ts) — yani o projenin kendi RLS'i
 * bu isteğin hangi platform kullanıcısından geldiğini hiç bilmiyor.
 * `store_viewer` yazamasın kuralının TEK uygulama noktası bu fonksiyon —
 * bir action bunu çağırmayı unutursa, hiçbir veritabanı satırı bunu geri
 * yakalamaz. Bu yüzden her "değiştir/sil/yükle" action'ı MUTLAKA bunu
 * (okuma amaçlıysa requireCustomerAccess'i) çağırmalı.
 */
export async function requireCustomerWriteAccess(customerId: string): Promise<CustomerAccessContext> {
  const { user } = await requireSession();
  const memberships = await getCurrentMemberships(user.id);

  const isAdmin = memberships.some((membership) => isAdminRole(membership.role));
  const hasWriteAccess = memberships.some(
    (membership) => isStoreWriteRole(membership.role) && membership.customerId === customerId,
  );

  if (!isAdmin && !hasWriteAccess) {
    notFound();
  }

  return { user, isAdmin };
}
