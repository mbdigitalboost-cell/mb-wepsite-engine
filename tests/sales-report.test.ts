import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildSeries,
  bucketStart,
  classifyOrder,
  computeSalesMetrics,
  enumerateBuckets,
  formatTrDay,
  parseTrDay,
  percentChange,
  previousRange,
  resolvePreset,
  suggestGrouping,
  topProducts,
  type ReportOrderRow,
} from "../lib/commerce/reports/sales.ts";

/** Faz 30 Kısım D — rapor tanımları (TR saat dilimi dahil). */

test("Istanbul day boundaries: 01:30 TR belongs to the TR day, not the UTC day", () => {
  const now = new Date("2026-11-15T22:30:00Z"); // TR: 16 Kasım 01:30
  const today = resolvePreset("today", now);
  assert.equal(today.from.toISOString(), "2026-11-15T21:00:00.000Z"); // 16 Kasım 00:00 TR
  assert.equal(today.to.toISOString(), "2026-11-16T21:00:00.000Z");
  assert.equal(formatTrDay(now), "2026-11-16");
  const yesterday = resolvePreset("yesterday", now);
  assert.equal(yesterday.from.toISOString(), "2026-11-14T21:00:00.000Z");
});

test("presets: week starts Monday, months, last N days inclusive of today", () => {
  const now = new Date("2026-11-15T09:00:00Z"); // Pazar, TR 12:00
  const week = resolvePreset("thisWeek", now);
  assert.equal(formatTrDay(week.from), "2026-11-09"); // Pazartesi
  assert.equal(formatTrDay(resolvePreset("thisMonth", now).from), "2026-11-01");
  const lastMonth = resolvePreset("lastMonth", now);
  assert.equal(formatTrDay(lastMonth.from), "2026-10-01");
  assert.equal(formatTrDay(lastMonth.to), "2026-11-01");
  assert.equal(formatTrDay(resolvePreset("last7", now).from), "2026-11-09");
  assert.equal(formatTrDay(resolvePreset("thisYear", now).from), "2026-01-01");
  const lastMonthJan = resolvePreset("lastMonth", new Date("2026-01-10T09:00:00Z"));
  assert.equal(formatTrDay(lastMonthJan.from), "2025-12-01");
});

test("custom range: inclusive end, swapped dates, invalid input", () => {
  const now = new Date("2026-11-15T09:00:00Z");
  const range = resolvePreset("custom", now, { from: "2026-11-10", to: "2026-11-12" });
  assert.equal(range.from.toISOString(), "2026-11-09T21:00:00.000Z");
  assert.equal(range.to.toISOString(), "2026-11-12T21:00:00.000Z"); // 12 Kasım dahil
  const swapped = resolvePreset("custom", now, { from: "2026-11-12", to: "2026-11-10" });
  assert.equal(swapped.from.toISOString(), range.from.toISOString());
  assert.equal(parseTrDay("2026-02-30"), null);
  assert.equal(parseTrDay("abc"), null);
});

test("previous period and grouping suggestion", () => {
  const range = resolvePreset("custom", new Date(), { from: "2026-11-10", to: "2026-11-12" });
  const prev = previousRange(range);
  assert.equal(formatTrDay(prev.from), "2026-11-07");
  assert.equal(prev.to.getTime(), range.from.getTime());
  assert.equal(suggestGrouping(range), "day");
  assert.equal(suggestGrouping(resolvePreset("custom", new Date(), { from: "2026-08-01", to: "2026-10-31" })), "week");
  assert.equal(suggestGrouping(resolvePreset("custom", new Date(), { from: "2025-01-01", to: "2026-10-31" })), "month");
});

test("buckets: weeks start Monday, months in TR time", () => {
  assert.equal(formatTrDay(bucketStart(new Date("2026-11-15T20:59:00Z"), "week")), "2026-11-09"); // Pazar 23:59 TR
  assert.equal(formatTrDay(bucketStart(new Date("2026-11-15T21:00:00Z"), "week")), "2026-11-16"); // Pazartesi 00:00 TR
  assert.equal(formatTrDay(bucketStart(new Date("2026-10-31T21:30:00Z"), "month")), "2026-11-01");
  const range = resolvePreset("custom", new Date(), { from: "2026-11-01", to: "2026-11-30" });
  assert.equal(enumerateBuckets(range, "day").length, 30);
  assert.equal(enumerateBuckets(range, "month").length, 1);
});

const row = (over: Partial<ReportOrderRow>): ReportOrderRow => ({
  order_id: "o",
  order_number: 1,
  created_at: "2026-11-10T10:00:00Z",
  status: "completed",
  payment_status: "paid",
  payment_method: "Kapıda Nakit",
  subtotal: 1000,
  discount_amount: 0,
  item_quantity: 1,
  refunded_amount: 0,
  ...over,
});

test("which orders count: cancelled and unpaid card excluded", () => {
  assert.equal(classifyOrder(row({})), "counted");
  assert.equal(classifyOrder(row({ status: "cancelled" })), "cancelled");
  assert.equal(classifyOrder(row({ payment_method: "Kredi Kartı", payment_status: "unpaid" })), "awaiting_card_payment");
  assert.equal(classifyOrder(row({ payment_method: "Kredi Kartı", payment_status: "paid" })), "counted");
  assert.equal(classifyOrder(row({ payment_method: "Kapıda Nakit", payment_status: "unpaid", status: "pending" })), "counted");
});

test("metrics: gross, discount, refunds, net, average, cancelled, awaiting", () => {
  const metrics = computeSalesMetrics([
    row({ subtotal: 1000, discount_amount: 100, item_quantity: 2 }),
    row({ subtotal: 500, discount_amount: 0, item_quantity: 1, refunded_amount: 200 }),
    row({ status: "cancelled", subtotal: 300, discount_amount: 30 }),
    row({ payment_method: "Kredi Kartı", payment_status: "unpaid", subtotal: 700 }),
  ]);
  assert.equal(metrics.gross, 1500);
  assert.equal(metrics.discount, 100);
  assert.equal(metrics.refunds, 200);
  assert.equal(metrics.net, 1200);
  assert.equal(metrics.orderCount, 2);
  assert.equal(metrics.averageBasket, 600);
  assert.equal(metrics.itemsSold, 3);
  assert.equal(metrics.cancelledCount, 1);
  assert.equal(metrics.cancelledAmount, 270);
  assert.equal(metrics.refundedOrderCount, 1);
  assert.equal(metrics.awaitingCardCount, 1);
  assert.equal(metrics.awaitingCardAmount, 700);
  assert.equal(percentChange(1200, 1000), 20);
  assert.equal(percentChange(1200, 0), null);
});

test("series puts orders in TR-day buckets and keeps empty buckets", () => {
  const range = resolvePreset("custom", new Date(), { from: "2026-11-10", to: "2026-11-11" });
  const series = buildSeries(
    [row({ created_at: "2026-11-10T22:30:00Z", subtotal: 100 }), row({ created_at: "2026-11-09T22:30:00Z", subtotal: 50 })],
    range,
    "day",
  );
  assert.deepEqual(
    series.map((p) => [formatTrDay(p.start), p.net]),
    [
      ["2026-11-10", 50], // 9 Kasım 22:30 UTC = 10 Kasım 01:30 TR
      ["2026-11-11", 100],
    ],
  );
});

test("top products split by variant", () => {
  const top = topProducts([
    { product_name: "Kılıf", variant_label: "Siyah", quantity: 2, line_total: 400 },
    { product_name: "Kılıf", variant_label: "Coyote", quantity: 3, line_total: 600 },
    { product_name: "Kılıf", variant_label: "Siyah", quantity: 2, line_total: 400 },
  ]);
  assert.deepEqual(top[0], { name: "Kılıf", variant: "Siyah", quantity: 4, revenue: 800 });
  assert.equal(top.length, 2);
});

test("Faz 31: shipping income and COD fee are separate; net stays product-based", () => {
  const metrics = computeSalesMetrics([
    row({ subtotal: 1900, shipping_fee: 250, cod_fee: 30 }),
    row({ subtotal: 2100, discount_amount: 200, shipping_fee: 0 }),
    row({ status: "cancelled", subtotal: 1000, shipping_fee: 250 }), // iptal: sayılmaz
    row({ subtotal: 500 }), // Faz 31 öncesi satır: ücret alanı yok → 0
  ]);
  assert.equal(metrics.shippingIncome, 250);
  assert.equal(metrics.codFeeIncome, 30);
  assert.equal(metrics.net, 4300); // 1900 + 1900 + 500 — ücretler nete eklenmez
});
