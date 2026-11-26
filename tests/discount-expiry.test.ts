import assert from "node:assert/strict";
import { test } from "node:test";
import { discountExpiresAtFromDay, isDiscountExpired } from "../lib/commerce/discount-rules.ts";

/** Faz 37 Kısım F — "süresi doldu" kuralı ve "Son geçerlilik tarihi" günü. */

test("isDiscountExpired: NULL is open-ended; the end instant itself counts as expired", () => {
  const end = "2026-11-20T20:59:59.999Z";
  assert.equal(isDiscountExpired(null, new Date("2030-01-01T00:00:00Z")), false);
  assert.equal(isDiscountExpired(end, new Date("2026-11-20T20:00:00Z")), false);
  assert.equal(isDiscountExpired(end, new Date(end)), true);
  assert.equal(isDiscountExpired(end, new Date("2026-11-21T00:00:00Z")), true);
});

test("discountExpiresAtFromDay: the chosen day stays valid until 23:59:59 Turkey time", () => {
  const iso = discountExpiresAtFromDay("2026-11-20");
  assert.equal(iso, "2026-11-20T20:59:59.999Z");
  // Seçilen günün akşamı (TR 22:00) hâlâ geçerli; ertesi gün 00:00 (TR) geçersiz.
  assert.equal(isDiscountExpired(iso, new Date("2026-11-20T19:00:00Z")), false);
  assert.equal(isDiscountExpired(iso, new Date("2026-11-20T21:00:00Z")), true);
  assert.equal(discountExpiresAtFromDay(""), null);
  assert.equal(discountExpiresAtFromDay("20.11.2026"), null);
  assert.equal(discountExpiresAtFromDay("2026-13-45"), null);
});
