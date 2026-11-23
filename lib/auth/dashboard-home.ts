import type { AppRole } from "@/lib/supabase/types";
import { isAdminRole, isStoreRole } from "./roles.ts";

/**
 * Faz 36 — panel giriş noktası ve müşteri erişimi için saf kararlar
 * (tests/dashboard-home.test.ts). Sunucuya/DB'ye dokunmaz; çağıran taraf
 * üyelikleri (customer_users) ve gerekirse mağaza listesini verir.
 *
 * Neden: app/dashboard/page.tsx Migration 0005/0006'dan önce yazılmıştı ve
 * ham `role === "customer"` karşılaştırması yapıyordu. Roller
 * store_admin/store_editor/store_viewer olunca gerçek mağaza kullanıcısı
 * (Taktikalp46) hiçbir dala girmeyip "Erişim Bekleniyor" ekranına düşüyordu.
 * Rol kararları artık yalnız lib/auth/roles.ts yardımcılarından geçer.
 */
export interface MembershipLike {
  role: AppRole;
  customerId: string | null;
}

/** Kullanıcının mağaza rolüyle bağlı olduğu müşteriler (tekrarsız, ilk görülme sırasıyla). */
export function storeMemberCustomerIds(memberships: readonly MembershipLike[]): string[] {
  const ids: string[] = [];
  for (const membership of memberships) {
    if (isStoreRole(membership.role) && membership.customerId && !ids.includes(membership.customerId)) {
      ids.push(membership.customerId);
    }
  }
  return ids;
}

export type DashboardHome =
  | { kind: "admin" }
  | { kind: "single-customer"; customerId: string }
  | { kind: "pick-customer"; customerIds: string[] }
  | { kind: "no-access" };

/**
 * /dashboard açıldığında ne gösterileceği. Platform admin her zaman özet
 * kartlarını görür (aynı zamanda bir mağazaya da bağlı olsa bile — önceki
 * davranış). "no-access" yalnız kullanılabilir hiçbir üyeliği olmayan
 * kullanıcıda kalır.
 */
export function resolveDashboardHome(memberships: readonly MembershipLike[]): DashboardHome {
  if (memberships.some((membership) => isAdminRole(membership.role))) return { kind: "admin" };

  const customerIds = storeMemberCustomerIds(memberships);
  if (customerIds.length === 1) return { kind: "single-customer", customerId: customerIds[0] };
  if (customerIds.length > 1) return { kind: "pick-customer", customerIds };
  return { kind: "no-access" };
}

/**
 * Tek müşterili mağaza kullanıcısının yönlendirileceği adres: müşterinin
 * tek mağazası varsa doğrudan o mağazanın paneli (Faz 17 dashboard'u),
 * yoksa ya da birden fazlaysa müşteri sayfası.
 */
export function storeUserHomeHref(customerId: string, storeIds: readonly string[]): string {
  const customerHref = `/dashboard/customers/${customerId}`;
  return storeIds.length === 1 ? `${customerHref}/stores/${storeIds[0]}` : customerHref;
}

/**
 * Bir müşteriye ait sayfaya erişim: platform admin her müşteriye, mağaza
 * kullanıcısı yalnız kendi customer_users satırındaki müşteriye. Faz 29:
 * başka müşterinin id'si → false → çağıran 404 verir.
 */
export function canAccessCustomer(memberships: readonly MembershipLike[], customerId: string): boolean {
  return memberships.some(
    (membership) =>
      isAdminRole(membership.role) || (isStoreRole(membership.role) && membership.customerId === customerId),
  );
}
