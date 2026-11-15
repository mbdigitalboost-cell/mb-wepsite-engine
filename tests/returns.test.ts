import assert from "node:assert/strict";
import { test } from "node:test";
import { canTransition } from "../lib/commerce/returns/state.ts";
import { computeFinalRefund, computeReturnRefund, orderNetAmount } from "../lib/commerce/returns/amounts.ts";
import { formatIban, isValidTrIban, maskIban, normalizeIban } from "../lib/commerce/returns/iban.ts";
import { canRequestCancel, canRequestReturn, isLinePersonalized, refundDaysLeft } from "../lib/commerce/returns/eligibility.ts";
import { createGuestReturnToken, verifyGuestReturnToken } from "../lib/commerce/returns/guest-token.ts";

/** Faz 30 — iptal/iade iş kuralları. */

test("state transitions: valid paths", () => {
  assert.ok(canTransition("cancel", "requested", "approved"));
  assert.ok(canTransition("cancel", "approved", "refunded"));
  assert.ok(canTransition("cancel", "approved", "closed"));
  assert.ok(canTransition("cancel", "requested", "rejected"));
  assert.ok(canTransition("return", "requested", "approved"));
  assert.ok(canTransition("return", "approved", "received"));
  assert.ok(canTransition("return", "received", "refunded"));
  assert.ok(canTransition("return", "approved", "cancelled_by_customer"));
});

test("state transitions: invalid paths rejected", () => {
  assert.equal(canTransition("return", "requested", "refunded"), false); // ürün gelmeden para iadesi yok
  assert.equal(canTransition("return", "requested", "received"), false);
  assert.equal(canTransition("cancel", "approved", "received"), false);
  assert.equal(canTransition("return", "refunded", "approved"), false);
  assert.equal(canTransition("return", "rejected", "approved"), false);
  assert.equal(canTransition("cancel", "refunded", "closed"), false);
});

test("refund: partial quantity + proportional discount share", () => {
  // Sipariş: A 2×500 = 1000, B 1×1000 = 1000 → brüt 2000, indirim 200, net 1800.
  const order = { subtotal: 2000, discountAmount: 200, alreadyRefunded: 0 };
  const result = computeReturnRefund(order, [
    { orderItemId: "A", lineTotal: 1000, quantity: 2, returnQuantity: 1, previouslyReturnedQuantity: 0 },
  ]);
  // 500 brüt − 500/2000×200 = 50 indirim payı → 450
  assert.equal(result.total, 450);
  assert.deepEqual(result.lines, [{ orderItemId: "A", refund: 450 }]);
});

test("refund: addon is part of line_total, refunded with the line", () => {
  // Kalem: 800 taban + 100 yazı eki = 900 birim, 1 adet; indirimsiz.
  const result = computeReturnRefund({ subtotal: 900, discountAmount: 0, alreadyRefunded: 0 }, [
    { orderItemId: "K", lineTotal: 900, quantity: 1, returnQuantity: 1, previouslyReturnedQuantity: 0 },
  ]);
  assert.equal(result.total, 900);
});

test("refund: final remainder absorbs rounding, never exceeds net paid", () => {
  const order = { subtotal: 100, discountAmount: 33.33, alreadyRefunded: 22.22 };
  const result = computeFinalRefund(
    order,
    [{ orderItemId: "A", lineTotal: 66.67, quantity: 2, returnQuantity: 2, previouslyReturnedQuantity: 0 }],
    true,
  );
  assert.equal(result.total, 44.45); // 100 − 33.33 − 22.22
  const capped = computeReturnRefund({ subtotal: 100, discountAmount: 0, alreadyRefunded: 90 }, [
    { orderItemId: "A", lineTotal: 100, quantity: 1, returnQuantity: 1, previouslyReturnedQuantity: 0 },
  ]);
  assert.equal(capped.total, 10);
});

test("refund: quantity above remaining is rejected", () => {
  assert.throws(() =>
    computeReturnRefund({ subtotal: 100, discountAmount: 0, alreadyRefunded: 0 }, [
      { orderItemId: "A", lineTotal: 100, quantity: 2, returnQuantity: 2, previouslyReturnedQuantity: 1 },
    ]),
  );
  assert.equal(orderNetAmount(1905, 0.75), 1904.25);
});

test("IBAN: mod-97, normalisation, masking", () => {
  assert.ok(isValidTrIban("TR33 0006 1005 1978 6457 8413 26"));
  assert.ok(isValidTrIban("tr330006100519786457841326"));
  assert.equal(isValidTrIban("TR340006100519786457841326"), false); // kontrol hanesi yanlış
  assert.equal(isValidTrIban("DE89370400440532013000"), false); // TR değil
  assert.equal(isValidTrIban("TR3300061005197864578413"), false); // kısa
  assert.equal(normalizeIban(" tr33-0006 "), "TR330006");
  assert.equal(maskIban("TR330006100519786457841326"), "TR33 **** **** **** **** **13 26");
  assert.equal(formatIban("TR330006100519786457841326"), "TR33 0006 1005 1978 6457 8413 26");
});

const enabled = { returnsEnabled: true, returnWindowDays: 14 };

test("cancel eligibility: only before shipment, only with settings on, one open request", () => {
  const base = { paymentStatus: "paid" as const, trackingNumber: null, deliveredAt: null };
  assert.equal(canRequestCancel({ ...base, status: "pending" }, enabled, []).allowed, true);
  assert.equal(canRequestCancel({ ...base, status: "preparing" }, enabled, []).allowed, true);
  assert.equal(canRequestCancel({ ...base, status: "shipped" }, enabled, []).allowed, false);
  assert.equal(canRequestCancel({ ...base, status: "preparing", trackingNumber: "BK1" }, enabled, []).allowed, false);
  assert.equal(canRequestCancel({ ...base, status: "pending" }, { ...enabled, returnsEnabled: false }, []).allowed, false);
  assert.equal(canRequestCancel({ ...base, status: "pending" }, enabled, ["requested"]).allowed, false);
  assert.equal(canRequestCancel({ ...base, status: "pending" }, enabled, ["rejected"]).allowed, true);
});

test("return eligibility: window from delivery, unknown delivery not blocked, min 14 days", () => {
  const now = new Date("2026-11-30T12:00:00Z");
  const order = { status: "completed" as const, paymentStatus: "paid" as const, trackingNumber: "BK1" };
  assert.equal(canRequestReturn({ ...order, deliveredAt: "2026-11-20T12:00:00Z" }, enabled, [], now).allowed, true);
  assert.equal(canRequestReturn({ ...order, deliveredAt: "2026-11-01T12:00:00Z" }, enabled, [], now).allowed, false);
  assert.equal(canRequestReturn({ ...order, deliveredAt: null }, enabled, [], now).allowed, true);
  // Ayar 7 gün girilse bile alt sınır 14: 10 gün önce teslim → hâlâ açık.
  assert.equal(canRequestReturn({ ...order, deliveredAt: "2026-11-20T12:00:00Z" }, { returnsEnabled: true, returnWindowDays: 7 }, [], now).allowed, true);
  assert.equal(canRequestReturn({ ...order, status: "preparing", deliveredAt: null }, enabled, [], now).allowed, false);
  assert.equal(canRequestReturn({ ...order, paymentStatus: "refunded", deliveredAt: null }, enabled, [], now).allowed, false);
});

test("personalized lines and the legal refund counter", () => {
  assert.equal(isLinePersonalized(false, [false, null]), false);
  assert.equal(isLinePersonalized(false, [true]), true);
  assert.equal(isLinePersonalized(true, []), true);
  const now = new Date("2026-11-20T00:00:00Z");
  assert.equal(refundDaysLeft("2026-11-10T00:00:00Z", null, now), 4);
  assert.equal(refundDaysLeft(null, "2026-11-01T00:00:00Z", now), -5);
  assert.equal(refundDaysLeft(null, null, now), null);
});

test("guest token: bound to store + order, expires", () => {
  const key = "test-key";
  const now = 1_800_000_000;
  const token = createGuestReturnToken(key, "store-a", "order-1", now);
  assert.ok(verifyGuestReturnToken(key, "store-a", "order-1", token, now + 60));
  assert.equal(verifyGuestReturnToken(key, "store-b", "order-1", token, now + 60), false); // başka mağaza
  assert.equal(verifyGuestReturnToken(key, "store-a", "order-2", token, now + 60), false); // başka sipariş
  assert.equal(verifyGuestReturnToken(key, "store-a", "order-1", token, now + 3 * 60 * 60), false); // süresi doldu
  assert.equal(verifyGuestReturnToken("other-key", "store-a", "order-1", token, now), false);
  assert.equal(verifyGuestReturnToken(key, "store-a", "order-1", "garbage", now), false);
});

test("refund method decision", async () => {
  const { refundMethodFor } = await import("../lib/commerce/returns/eligibility.ts");
  const card = { paymentMethod: "Kredi Kartı", paymentStatus: "paid" as const, paymentProviderPaymentId: "123" };
  assert.equal(refundMethodFor("return", card), "iyzico");
  assert.equal(refundMethodFor("cancel", card), "iyzico");
  assert.equal(refundMethodFor("cancel", { ...card, paymentStatus: "unpaid" }), "none");
  const cod = { paymentMethod: "Kapıda Nakit", paymentStatus: "unpaid" as const, paymentProviderPaymentId: null };
  assert.equal(refundMethodFor("return", cod), "iban"); // kapıda ödendi, sistemde işaretlenmemiş olabilir
  assert.equal(refundMethodFor("cancel", cod), "none"); // teslim yok, para alınmadı
  assert.equal(refundMethodFor("cancel", { paymentMethod: "Havale-EFT", paymentStatus: "paid", paymentProviderPaymentId: null }), "iban");
});
