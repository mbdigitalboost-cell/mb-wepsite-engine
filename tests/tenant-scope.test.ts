import assert from "node:assert/strict";
import { test } from "node:test";
import { contactIsKnown, rowBelongsToStore, storeMatchesCustomer, type OwnershipQueryClient } from "../lib/auth/tenant-scope.ts";

/**
 * Faz 29 — müşteri izolasyonu. Gerçek DB'ye yazılmaz: iki mağazalı sahte bir
 * veri kümesi üzerinden "A mağazasının storeId'si + B mağazasının kaydı →
 * reddedilir" kuralı sabitlenir. Bu yardımcılar mağaza action'larında
 * kullanılıyor (navigation parent/menu, indirim store_customer_id), guard da
 * storeMatchesCustomer ile URL müşterisini mağazanın gerçek müşterisine bağlıyor.
 */
const STORE_A = "store-a";
const STORE_B = "store-b";
const ROWS: Record<string, Array<{ id: string; store_id: string }>> = {
  products: [
    { id: "product-a1", store_id: STORE_A },
    { id: "product-b1", store_id: STORE_B },
  ],
  orders: [
    { id: "order-a1", store_id: STORE_A },
    { id: "order-b1", store_id: STORE_B },
  ],
  store_navigation_items: [{ id: "nav-b1", store_id: STORE_B }],
  store_customers: [{ id: "cust-b1", store_id: STORE_B }],
  // Faz 30 — iptal/iade.
  order_returns: [
    { id: "return-a1", store_id: STORE_A },
    { id: "return-b1", store_id: STORE_B },
  ],
  // Faz 33 — yasal metin sürümleri.
  store_legal_documents: [
    { id: "legal-a1", store_id: STORE_A },
    { id: "legal-b1", store_id: STORE_B },
  ],
};

/** Supabase'in .from().select().eq().eq().maybeSingle() zincirini taklit eder; RLS yokmuş gibi (platform admin) her satırı görür. */
function fakeClient(): OwnershipQueryClient {
  return {
    from(table) {
      return {
        select() {
          return {
            eq(col1, val1) {
              return {
                eq(col2, val2) {
                  return {
                    maybeSingle: async () => {
                      const row = (ROWS[table] ?? []).find(
                        (r) => (r as Record<string, string>)[col1] === val1 && (r as Record<string, string>)[col2] === val2,
                      );
                      return { data: row ?? null, error: null };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

test("A store + B store's product → rejected; own product → accepted", async () => {
  const client = fakeClient();
  assert.equal(await rowBelongsToStore(client, "products", "product-b1", STORE_A), false);
  assert.equal(await rowBelongsToStore(client, "products", "product-a1", STORE_A), true);
});

test("A store + B store's order / nav item / customer → rejected", async () => {
  const client = fakeClient();
  assert.equal(await rowBelongsToStore(client, "orders", "order-b1", STORE_A), false);
  assert.equal(await rowBelongsToStore(client, "store_navigation_items", "nav-b1", STORE_A), false);
  assert.equal(await rowBelongsToStore(client, "store_customers", "cust-b1", STORE_A), false);
});

test("empty ids and query errors fail closed", async () => {
  const client = fakeClient();
  assert.equal(await rowBelongsToStore(client, "products", "", STORE_A), false);
  assert.equal(await rowBelongsToStore(client, "products", null, STORE_A), false);
  const erroring: OwnershipQueryClient = {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "x" }, error: { message: "boom" } }) }) }) }),
    }),
  };
  assert.equal(await rowBelongsToStore(erroring, "products", "product-a1", STORE_A), false);
});

test("URL customer must be the store's real customer", () => {
  assert.equal(storeMatchesCustomer("customer-taktikalp46", "customer-taktikalp46"), true);
  assert.equal(storeMatchesCustomer("customer-taktikalp46", "customer-petra"), false);
  assert.equal(storeMatchesCustomer(null, "customer-petra"), false);
  assert.equal(storeMatchesCustomer("customer-taktikalp46", ""), false);
});

test("messages only go to the store's own audience", () => {
  const audience = ["ali@example.com", "0532 111 22 33", null];
  assert.equal(contactIsKnown(" Ali@Example.com ", audience), true);
  assert.equal(contactIsKnown("05321112233", audience), true);
  assert.equal(contactIsKnown("baskasi@example.com", audience), false);
  assert.equal(contactIsKnown("", audience), false);
});

test("Faz 30: A store + B store's return request → rejected (admin actions query id + store_id)", async () => {
  const client = fakeClient();
  assert.equal(await rowBelongsToStore(client, "order_returns", "return-b1", STORE_A), false);
  assert.equal(await rowBelongsToStore(client, "order_returns", "return-a1", STORE_A), true);
  assert.equal(await rowBelongsToStore(client, "orders", "order-b1", STORE_A), false); // talep açılacak sipariş de mağazaya ait olmalı
});

test("Faz 31: shipping fee settings action — another customer's URL for this store is rejected", () => {
  // updateShippingFeeSettingsAction → requireStoreAdminAccess(storeId, customerId) → storeMatchesCustomer;
  // ayar satırı store_id anahtarlı, RLS yazmayı is_store_admin_member(store_id) ile sınırlar.
  assert.equal(storeMatchesCustomer("customer-taktikalp46", "customer-petra"), false);
  assert.equal(storeMatchesCustomer("customer-taktikalp46", "customer-taktikalp46"), true);
});

test("Faz 33: A store + B store's legal document version → rejected (lawyer-review action checks id + store_id)", async () => {
  const client = fakeClient();
  assert.equal(await rowBelongsToStore(client, "store_legal_documents", "legal-b1", STORE_A), false);
  assert.equal(await rowBelongsToStore(client, "store_legal_documents", "legal-a1", STORE_A), true);
  // Satıcı bilgisi / yayımlama action'ları requireStoreAdminAccess(storeId, customerId) → storeMatchesCustomer.
  assert.equal(storeMatchesCustomer("customer-taktikalp46", "customer-petra"), false);
});

test("Faz 35: tracking settings — another customer's URL for this store is rejected; settings are keyed by store_id", () => {
  // updateTrackingSettingsAction → requireStoreAdminAccess(storeId, customerId) → storeMatchesCustomer;
  // vitrin getStoreTrackingSettings yalnız kendi store_id'sinin satırını okur (satırın store_id'si eşleşmezse "hiç araç yok").
  assert.equal(storeMatchesCustomer("customer-taktikalp46", "customer-petra"), false);
  assert.equal(storeMatchesCustomer("customer-taktikalp46", "customer-taktikalp46"), true);
});
