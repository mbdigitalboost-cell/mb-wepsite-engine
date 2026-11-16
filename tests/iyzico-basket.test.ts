import assert from "node:assert/strict";
import { test } from "node:test";
import { buildIyzicoBasket } from "../lib/commerce/payments/iyzico-basket.ts";
import { orderGrandTotal } from "../lib/commerce/shipping-fee.ts";

/** Faz 31 — iyzico sepeti: kalemler toplamı price'a EŞİT (iyzico 5062), kargo ayrı VIRTUAL satır. */
const sum = (items: Array<{ price: string }>) => Math.round(items.reduce((s, i) => s + Number(i.price) * 100, 0)) / 100;
const lines = [
  { id: "a", name: "Kılıf (Siyah)", lineTotal: 1000 },
  { id: "b", name: "Kılıf (Coyote)", lineTotal: 900 },
];

test("1.900 TL + 250 TL kargo: basket sums to price, shipping is a VIRTUAL line", () => {
  const order = { subtotal: 1900, discount_amount: 0, shipping_fee: 250, cod_fee: 0 };
  const basket = buildIyzicoBasket(lines, order);
  assert.equal(basket.price, "2150.00");
  assert.equal(sum(basket.items), 2150);
  assert.equal(Number(basket.price), orderGrandTotal(order)); // callback tutar kontrolüyle aynı tanım
  const shipping = basket.items.find((i) => i.id === "KARGO");
  assert.deepEqual(shipping && { price: shipping.price, itemType: shipping.itemType }, { price: "250.00", itemType: "VIRTUAL" });
});

test("free shipping + discount with odd kuruş: products absorb the discount, totals still equal", () => {
  const order = { subtotal: 2100, discount_amount: 200.01, shipping_fee: 0, cod_fee: 0 };
  const basket = buildIyzicoBasket(lines.map((l) => ({ ...l, lineTotal: l.lineTotal + 100 / 2 })), order);
  assert.equal(basket.price, "1899.99");
  assert.equal(sum(basket.items), 1899.99);
  assert.equal(basket.items.some((i) => i.id === "KARGO"), false);
});

test("pre-Faz 31 order (no fee columns) keeps the old basket", () => {
  const basket = buildIyzicoBasket(lines, { subtotal: 1900, discount_amount: 100 });
  assert.equal(basket.price, "1800.00");
  assert.equal(basket.items.length, 2);
});

test("Basit Kargo collect amount = customer total (products − discount + shipping + COD fee)", () => {
  // basit-kargo.ts buildOrderBody: body.collect = roundMoney(orderGrandTotal(order)) (kapıda ödeme + ödenmemiş).
  assert.equal(orderGrandTotal({ subtotal: 1900, discount_amount: 0, shipping_fee: 250, cod_fee: 30 }), 2180);
  assert.equal(orderGrandTotal({ subtotal: 2100, discount_amount: 200, shipping_fee: 0, cod_fee: 0 }), 1900);
});
