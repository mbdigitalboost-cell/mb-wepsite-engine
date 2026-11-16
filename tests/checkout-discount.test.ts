import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GENERIC_CODE_ERROR,
  RATE_LIMITED_CODE_ERROR,
  discountErrorMessage,
  normalizePhoneForMatch,
  resolveDiscount,
  type DiscountDataSource,
  type DiscountRequest,
  type DiscountRow,
} from "../lib/commerce/discount-rules.ts";
import {
  codeErrorFor,
  composeQuote,
  orderAmountsFromQuote,
  parseExpectedTotal,
  previewFromQuote,
  totalChangedMessage,
  totalsMatch,
} from "../lib/commerce/checkout/quote.ts";
import {
  CODE_ATTEMPT_LIMIT,
  CODE_ATTEMPT_WINDOW_MS,
  createMemoryAttemptStore,
  isCodeAttemptBlocked,
  recordFailedCodeAttempt,
  withFallback,
  type AttemptStore,
} from "../lib/commerce/checkout/code-attempts.ts";
import { orderGrandTotal, type ShippingFeeSettings } from "../lib/commerce/shipping-fee.ts";

/**
 * Faz 32 — indirim kodu önizlemesi. Gerçek DB'ye yazılmaz: iki mağazalı
 * bellek-içi veri kaynağı, sunucudaki Supabase kaynağıyla aynı arayüzü
 * (DiscountDataSource) uygular; önizleme ve sipariş aynı resolveDiscount +
 * composeQuote yolundan geçer.
 */
const NOW = new Date("2026-11-16T12:00:00Z");
const T46: ShippingFeeSettings = { shippingFee: 250, freeShippingThreshold: 2000, thresholdBasis: "before_discount", codFee: 0 };

type Row = DiscountRow & { store_id: string; is_active: boolean };
const base = {
  expires_at: null,
  max_uses: null,
  min_order_amount: null,
  store_customer_id: null,
  guest_email: null,
  guest_phone: null,
  is_active: true,
} as const;
const ROWS: Row[] = [
  { ...base, id: "d-yuzde", store_id: "A", discount_type: "code", code: "YUZDE10", value_type: "percentage", value: 10, guest_email: "ali@example.com" },
  { ...base, id: "d-sabit", store_id: "A", discount_type: "code", code: "SABIT200", value_type: "fixed", value: 200, guest_phone: "05551112233" },
  { ...base, id: "d-min", store_id: "A", discount_type: "code", code: "MIN1000", value_type: "fixed", value: 50, min_order_amount: 1000, guest_email: "ali@example.com" },
  { ...base, id: "d-limit", store_id: "A", discount_type: "code", code: "LIMIT1", value_type: "fixed", value: 50, max_uses: 1, guest_email: "ali@example.com" },
  { ...base, id: "d-eski", store_id: "A", discount_type: "code", code: "ESKI", value_type: "fixed", value: 50, expires_at: "2026-09-29T00:00:00Z", guest_email: "ali@example.com" },
  { ...base, id: "d-pasif", store_id: "A", discount_type: "code", code: "PASIF", value_type: "fixed", value: 50, is_active: false, guest_email: "ali@example.com" },
  { ...base, id: "d-hesap", store_id: "A", discount_type: "code", code: "HESAP", value_type: "fixed", value: 100, store_customer_id: "cust-1" },
  { ...base, id: "d-auto", store_id: "A", discount_type: "auto", code: null, value_type: "percentage", value: 5, store_customer_id: "cust-2" },
  { ...base, id: "d-b", store_id: "B", discount_type: "code", code: "BKOD", value_type: "fixed", value: 100, guest_email: "ali@example.com" },
];
const STORE_CUSTOMERS: Record<string, string> = { "A:user-1": "cust-1", "A:user-2": "cust-2", "A:user-3": "cust-3" };
const USAGE: Record<string, number> = { "d-limit": 1 };

const ds: DiscountDataSource = {
  async listActiveCodes(storeId) {
    return ROWS.filter((r) => r.store_id === storeId && r.discount_type === "code" && r.is_active);
  },
  async findStoreCustomerId(storeId, userId) {
    return STORE_CUSTOMERS[`${storeId}:${userId}`] ?? null;
  },
  async findActiveAuto(storeId, storeCustomerId) {
    return ROWS.find((r) => r.store_id === storeId && r.discount_type === "auto" && r.store_customer_id === storeCustomerId && r.is_active) ?? null;
  },
  async countUsage(id) {
    return USAGE[id] ?? 0;
  },
};

const guest = { email: "ali@example.com", phone: "0532 000 00 00" };
const resolve = (over: Partial<DiscountRequest>) =>
  resolveDiscount(ds, { storeId: "A", subtotal: 2100, userId: null, contact: guest, now: NOW, ...over });

test("percentage and fixed codes apply; case and surrounding spaces are ignored", async () => {
  const pct = await resolve({ enteredCode: "  yuzde10 " });
  assert.equal(pct.status, "applied");
  assert.equal(pct.status === "applied" && pct.discount.amount, 210);
  const fixed = await resolve({ enteredCode: "sabit200", contact: { phone: "0555 111 22 33" } });
  assert.equal(fixed.status === "applied" && fixed.discount.amount, 200);
  assert.equal(normalizePhoneForMatch("+90 555 111 22 33"), normalizePhoneForMatch("05551112233"));
});

test("another store's code, expired, inactive or unknown → one generic message", async () => {
  for (const code of ["BKOD", "ESKI", "PASIF", "YOKBOYLE"]) {
    const result = await resolve({ enteredCode: code });
    assert.equal(result.status, "invalid_code", code);
    assert.equal(discountErrorMessage(result, 2100), GENERIC_CODE_ERROR);
  }
  // B mağazasında aynı kod geçerli — izolasyon mağaza kimliğinden.
  assert.equal((await resolve({ storeId: "B", enteredCode: "bkod" })).status, "applied");
});

test("code bound to someone else (other guest contact or other account) → generic message", async () => {
  const otherGuest = await resolve({ enteredCode: "YUZDE10", contact: { email: "veli@example.com", phone: "05320000000" } });
  assert.equal(otherGuest.status, "invalid_code");
  const otherAccount = await resolve({ enteredCode: "HESAP", userId: "user-3" });
  assert.equal(otherAccount.status, "invalid_code");
  assert.equal(discountErrorMessage(otherAccount, 2100), GENERIC_CODE_ERROR);
});

test("account-bound code: guest is asked to sign in, owner gets it", async () => {
  const asGuest = await resolve({ enteredCode: "HESAP" });
  assert.equal(asGuest.status, "login_required");
  assert.equal(discountErrorMessage(asGuest, 2100), "Bu kod için giriş yapmanız gerekiyor.");
  const owner = await resolve({ enteredCode: "HESAP", userId: "user-1" });
  assert.equal(owner.status === "applied" && owner.discount.amount, 100);
});

test("minimum order and usage limit give specific messages", async () => {
  const min = await resolve({ enteredCode: "MIN1000", subtotal: 900 });
  assert.equal(min.status, "min_order_not_met");
  assert.equal(discountErrorMessage(min, 900), "Bu kod 1.000 TL ve üzeri siparişlerde geçerli. ₺100,00 daha ekleyin.");
  const limit = await resolve({ enteredCode: "LIMIT1" });
  assert.equal(discountErrorMessage(limit, 2100), "Bu kodun kullanım hakkı dolmuş.");
  assert.equal(discountErrorMessage({ status: "rate_limited" }, 2100), RATE_LIMITED_CODE_ERROR);
});

test("account auto discount shows without a code; an entered code wins over it", async () => {
  const auto = await resolve({ userId: "user-2" });
  assert.equal(auto.status === "applied" && auto.discount.code, null);
  const quote = composeQuote({ subtotal: 2100, resolution: auto, paymentMethod: "Havale-EFT", settings: T46 });
  assert.equal(previewFromQuote(quote).discount?.source, "auto");
  const withCode = await resolve({ userId: "user-2", enteredCode: "YUZDE10" });
  assert.equal(withCode.status === "applied" && withCode.discount.id, "d-yuzde");
  assert.equal((await resolve({ userId: null })).status, "none");
});

test("shipping threshold looks at the pre-discount amount", async () => {
  const q2100 = composeQuote({ subtotal: 2100, resolution: await resolve({ enteredCode: "SABIT200", contact: { phone: "5551112233" } }), paymentMethod: "Kapıda Nakit", settings: T46 });
  assert.equal(q2100.charges.shippingFee, 0);
  assert.equal(q2100.charges.grandTotal, 1900);
  const q1900 = composeQuote({ subtotal: 1900, resolution: await resolve({ enteredCode: "YUZDE10", subtotal: 1900 }), paymentMethod: "Havale-EFT", settings: T46 });
  assert.equal(q1900.discount?.amount, 190);
  assert.equal(q1900.charges.shippingFee, 250);
  assert.equal(q1900.charges.grandTotal, 1960);
});

test("preview and order use the same numbers", async () => {
  for (const [subtotal, code, method] of [
    [2100, "YUZDE10", "Kapıda Nakit"],
    [1900, "YUZDE10", "Havale-EFT"],
    [1500, null, "Kredi Kartı"],
  ] as const) {
    const resolution = await resolve({ subtotal, enteredCode: code });
    const quote = composeQuote({ subtotal, resolution, paymentMethod: method, settings: { ...T46, codFee: 30 } });
    const preview = previewFromQuote(quote);
    const order = orderAmountsFromQuote(quote);
    assert.equal(orderGrandTotal(order), preview.total);
    assert.equal(order.discount_amount, preview.discount?.amount ?? 0);
    assert.equal(order.shipping_fee, preview.shippingFee);
    assert.equal(order.cod_fee, preview.codFee);
  }
});

test("expectedTotal mismatch blocks the order", () => {
  assert.equal(totalsMatch(parseExpectedTotal("1960"), 1960), true);
  assert.equal(totalsMatch(parseExpectedTotal("1960.004"), 1960), true);
  assert.equal(totalsMatch(parseExpectedTotal("1900"), 1960), false); // kod bu arada düştü
  assert.equal(totalsMatch(parseExpectedTotal(null), 1960), false); // ekranda hiç toplam görülmedi
  assert.equal(totalsMatch(parseExpectedTotal("abc"), 1960), false);
  assert.equal(totalChangedMessage(1960), "Tutar değişti: yeni toplam ₺1.960,00. Lütfen kontrol edip tekrar onaylayın.");
  assert.equal(codeErrorFor("", { status: "invalid_code" }, 100), null);
  assert.equal(codeErrorFor("x", { status: "invalid_code" }, 100), GENERIC_CODE_ERROR);
});

test("attempt limit: only failures count, window expires, falls back to memory", async () => {
  const store = createMemoryAttemptStore();
  const t0 = new Date("2026-11-16T12:00:00Z");
  for (let i = 0; i < CODE_ATTEMPT_LIMIT; i += 1) {
    assert.equal(await isCodeAttemptBlocked(store, "k", t0), false);
    await recordFailedCodeAttempt(store, "k", t0);
  }
  assert.equal(await isCodeAttemptBlocked(store, "k", t0), true);
  assert.equal(await isCodeAttemptBlocked(store, "other-ip", t0), false);
  assert.equal(await isCodeAttemptBlocked(store, "k", new Date(t0.getTime() + CODE_ATTEMPT_WINDOW_MS + 1)), false);

  const broken: AttemptStore = { countSince: async () => null, record: async () => false };
  const fallback = createMemoryAttemptStore();
  const combined = withFallback(broken, fallback);
  for (let i = 0; i < CODE_ATTEMPT_LIMIT; i += 1) await recordFailedCodeAttempt(combined, "k", t0);
  assert.equal(await isCodeAttemptBlocked(combined, "k", t0), true);
});
