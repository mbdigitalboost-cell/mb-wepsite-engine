import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NO_SHIPPING_FEE_SETTINGS,
  computeShippingCharges,
  freeShippingClaim,
  orderGrandTotal,
  productQualifiesForFreeShipping,
  type ShippingFeeSettings,
} from "../lib/commerce/shipping-fee.ts";

/** Faz 31 — kargo ücreti kuralları. */
const T46: ShippingFeeSettings = { shippingFee: 250, freeShippingThreshold: 2000, thresholdBasis: "before_discount", codFee: 0 };
const charge = (itemsTotal: number, discountAmount = 0, paymentMethod: string | null = "Havale-EFT", settings = T46) =>
  computeShippingCharges({ itemsTotal, discountAmount, paymentMethod, settings });

test("threshold: below → fee, exactly at → free, above → free", () => {
  assert.equal(charge(1900).shippingFee, 250);
  assert.equal(charge(1900).grandTotal, 2150);
  assert.equal(charge(1900).amountToFreeShipping, 100);
  assert.equal(charge(2000).shippingFee, 0);
  assert.equal(charge(2000).freeShipping, true);
  assert.equal(charge(2100).shippingFee, 0);
  assert.equal(charge(1999.99).shippingFee, 250);
});

test("before_discount (user rule): 2.100 TL − 200 TL code stays free; 1.900 TL pays 250", () => {
  const withCode = charge(2100, 200);
  assert.equal(withCode.shippingFee, 0);
  assert.equal(withCode.grandTotal, 1900);
  assert.equal(charge(1900, 0).shippingFee, 250);
});

test("after_discount basis (optional setting): the code can push below the threshold", () => {
  const after = { ...T46, thresholdBasis: "after_discount" as const };
  assert.equal(charge(2100, 200, "Havale-EFT", after).shippingFee, 250);
  assert.equal(charge(2100, 200, "Havale-EFT", after).grandTotal, 2150);
  assert.equal(charge(2200, 200, "Havale-EFT", after).shippingFee, 0);
});

test("no threshold → always fee; no settings row → no fee and no claim", () => {
  assert.equal(charge(5000, 0, "Havale-EFT", { ...T46, freeShippingThreshold: null }).shippingFee, 250);
  assert.equal(charge(100, 0, "Kapıda Nakit", NO_SHIPPING_FEE_SETTINGS).grandTotal, 100);
  assert.equal(freeShippingClaim(NO_SHIPPING_FEE_SETTINGS), null);
});

test("cash-on-delivery fee only for Kapıda Nakit / Kapıda Kart", () => {
  const cod = { ...T46, codFee: 30 };
  assert.equal(charge(1900, 0, "Kapıda Nakit", cod).codFee, 30);
  assert.equal(charge(1900, 0, "Kapıda Kart", cod).grandTotal, 2180);
  assert.equal(charge(1900, 0, "Kredi Kartı", cod).codFee, 0);
  assert.equal(charge(1900, 0, "Havale-EFT", cod).codFee, 0);
  assert.equal(charge(1900, 0, "Kapıda Nakit").codFee, 0); // varsayılan 0 → satır gösterilmez
});

test("kuruş rounding is consistent", () => {
  assert.equal(charge(1999.995 /* → 2000.00 kuruş */).shippingFee, 0);
  const odd = computeShippingCharges({ itemsTotal: 10.1, discountAmount: 0.2, paymentMethod: "Kapıda Nakit", settings: { ...T46, shippingFee: 0.3, codFee: 0.1 } });
  assert.equal(odd.grandTotal, 10.3);
});

test("stored order total (single definition)", () => {
  assert.equal(orderGrandTotal({ subtotal: 1900, discount_amount: 0, shipping_fee: 250, cod_fee: 0 }), 2150);
  assert.equal(orderGrandTotal({ subtotal: "1905.00", discount_amount: "0.75" }), 1904.25); // Faz 31 öncesi
  assert.equal(orderGrandTotal({ subtotal: 100, discount_amount: 150 }), 0); // indirim ürünü aşamaz
});

test("announcement and product claims come from settings", () => {
  assert.equal(freeShippingClaim(T46), "2.000 TL Üzeri Ücretsiz Kargo");
  assert.equal(freeShippingClaim({ ...T46, freeShippingThreshold: 1500.5 }), "1.500,5 TL Üzeri Ücretsiz Kargo");
  assert.equal(freeShippingClaim({ ...T46, freeShippingThreshold: null }), null);
  assert.equal(freeShippingClaim({ ...T46, shippingFee: 0 }), null); // ücret yoksa "sınır üzeri ücretsiz" iddiası anlamsız
  assert.equal(productQualifiesForFreeShipping(2000, T46), true);
  assert.equal(productQualifiesForFreeShipping(1999, T46), false);
  assert.equal(productQualifiesForFreeShipping(5000, { ...T46, freeShippingThreshold: null }), false);
});
