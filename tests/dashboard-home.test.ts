import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canAccessCustomer,
  resolveDashboardHome,
  storeMemberCustomerIds,
  storeUserHomeHref,
  type MembershipLike,
} from "../lib/auth/dashboard-home.ts";

/**
 * Faz 36 — panel giriş noktası, rol × üyelik matrisi. Gerçek DB yok:
 * customer_users satırları elle kurulur. Kök hata: /dashboard ham
 * `role === "customer"` karşılaştırıyordu, store_admin "Erişim Bekleniyor"
 * ekranına düşüyordu.
 */
const TAKTIKALP = "customer-taktikalp46";
const PETRA = "customer-petra";
const STORE = "store-taktikalp46";

const platformAdmin: MembershipLike[] = [{ role: "platform_admin", customerId: null }];
const storeRoles = ["store_admin", "store_editor", "store_viewer"] as const;

test("platform admin: özet kartları (davranış değişmedi)", () => {
  assert.deepEqual(resolveDashboardHome(platformAdmin), { kind: "admin" });
  assert.deepEqual(resolveDashboardHome([{ role: "super_admin", customerId: null }]), { kind: "admin" });
  // Eski "admin" satırı da admin sayılır.
  assert.deepEqual(resolveDashboardHome([{ role: "admin", customerId: null }]), { kind: "admin" });
});

test("admin + mağaza üyeliği: yine admin özeti", () => {
  const memberships: MembershipLike[] = [...platformAdmin, { role: "store_admin", customerId: TAKTIKALP }];
  assert.deepEqual(resolveDashboardHome(memberships), { kind: "admin" });
});

for (const role of storeRoles) {
  test(`tek müşterili ${role}: kendi müşterisine yönlenir, "Erişim Bekleniyor" değil`, () => {
    assert.deepEqual(resolveDashboardHome([{ role, customerId: TAKTIKALP }]), {
      kind: "single-customer",
      customerId: TAKTIKALP,
    });
  });
}

test("eski ham 'customer' rolü de mağaza rolü sayılır", () => {
  assert.deepEqual(resolveDashboardHome([{ role: "customer", customerId: TAKTIKALP }]), {
    kind: "single-customer",
    customerId: TAKTIKALP,
  });
});

test("üyeliği olmayan kullanıcı: Erişim Bekleniyor", () => {
  assert.deepEqual(resolveDashboardHome([]), { kind: "no-access" });
  // customer_id'si boş bozuk mağaza satırı kullanılabilir bir üyelik değildir.
  assert.deepEqual(resolveDashboardHome([{ role: "store_admin", customerId: null }]), { kind: "no-access" });
});

test("iki müşterili kullanıcı: seçim listesi", () => {
  const memberships: MembershipLike[] = [
    { role: "store_admin", customerId: TAKTIKALP },
    { role: "store_viewer", customerId: PETRA },
  ];
  assert.deepEqual(resolveDashboardHome(memberships), { kind: "pick-customer", customerIds: [TAKTIKALP, PETRA] });
});

test("aynı müşteriye iki satır: tek müşteri sayılır", () => {
  const memberships: MembershipLike[] = [
    { role: "store_admin", customerId: TAKTIKALP },
    { role: "store_viewer", customerId: TAKTIKALP },
  ];
  assert.deepEqual(storeMemberCustomerIds(memberships), [TAKTIKALP]);
  assert.equal(resolveDashboardHome(memberships).kind, "single-customer");
});

test("yönlendirme: tek mağaza → mağaza paneli, aksi halde müşteri sayfası", () => {
  assert.equal(storeUserHomeHref(TAKTIKALP, [STORE]), `/dashboard/customers/${TAKTIKALP}/stores/${STORE}`);
  assert.equal(storeUserHomeHref(TAKTIKALP, []), `/dashboard/customers/${TAKTIKALP}`);
  assert.equal(storeUserHomeHref(TAKTIKALP, [STORE, "store-2"]), `/dashboard/customers/${TAKTIKALP}`);
});

test("çapraz müşteri (Faz 29): mağaza kullanıcısı başka müşteriye erişemez → 404", () => {
  for (const role of storeRoles) {
    const memberships: MembershipLike[] = [{ role, customerId: TAKTIKALP }];
    assert.equal(canAccessCustomer(memberships, TAKTIKALP), true, `${role} kendi müşterisi`);
    assert.equal(canAccessCustomer(memberships, PETRA), false, `${role} başka müşteri`);
  }
  assert.equal(canAccessCustomer([], TAKTIKALP), false);
});

test("platform admin her müşteriye erişir", () => {
  assert.equal(canAccessCustomer(platformAdmin, TAKTIKALP), true);
  assert.equal(canAccessCustomer(platformAdmin, PETRA), true);
});
