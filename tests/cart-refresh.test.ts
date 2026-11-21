import assert from "node:assert/strict";
import { test } from "node:test";
import { planCartRefresh, priceChangeNote, removalNote } from "../lib/commerce/cart-refresh.ts";
import { freeShippingProgress, type ShippingFeeSettings } from "../lib/commerce/shipping-fee.ts";

/** Faz 34 Kısım B/C — sepet fiyat yenileme ve ücretsiz kargoya kalan. */

const TRY = (value: number) => value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
const T46: ShippingFeeSettings = { shippingFee: 250, freeShippingThreshold: 2000, thresholdBasis: "before_discount", codFee: 0 };

test("stale cart price is corrected with a note; unsellable lines are removed with a reason", () => {
  const plan = planCartRefresh(
    [
      { lineId: "canik|coyote", productName: "Canik Kılıf", unitPrice: 2000 },
      { lineId: "canik|siyah", productName: "Canik Kılıf", unitPrice: 1000 },
      { lineId: "eski", productName: "Eski Ürün", unitPrice: 500 },
      { lineId: "yeni", productName: "Yeni Eklenen", unitPrice: 300 },
    ],
    [
      { lineId: "canik|coyote", ok: true, unitPrice: 1000 },
      { lineId: "canik|siyah", ok: true, unitPrice: 1000.001 },
      { lineId: "eski", ok: false, reason: "Sepetinizdeki bir ürün artık mevcut değil." },
    ],
  );
  assert.deepEqual(plan.priceUpdates, [{ lineId: "canik|coyote", unitPrice: 1000, previousPrice: 2000 }]);
  assert.deepEqual(plan.removals, [{ lineId: "eski", productName: "Eski Ürün", reason: "Sepetinizdeki bir ürün artık mevcut değil." }]);
  assert.equal(priceChangeNote(2000, 1000, TRY), "Bu ürünün fiyatı güncellendi: ₺2.000,00 → ₺1.000,00");
  assert.equal(removalNote("Eski Ürün", "Sepetinizdeki bir ürün artık mevcut değil."), '"Eski Ürün" sepetinizden çıkarıldı: Sepetinizdeki bir ürün artık mevcut değil.');
});

test("free shipping progress: remaining amount on the pre-discount total, hidden without a threshold", () => {
  assert.deepEqual(freeShippingProgress(1000, T46), { show: true, reached: false, remaining: 1000, ratio: 0.5, threshold: 2000 });
  assert.deepEqual(freeShippingProgress(1900, T46).remaining, 100);
  // 2 adet × 1.000 → ücretsiz.
  assert.deepEqual(freeShippingProgress(2000, T46), { show: true, reached: true, remaining: 0, ratio: 1, threshold: 2000 });
  assert.equal(freeShippingProgress(2500, T46).ratio, 1);
  assert.equal(freeShippingProgress(1000, { ...T46, freeShippingThreshold: null }).show, false);
  assert.equal(freeShippingProgress(1000, { ...T46, shippingFee: 0 }).show, false);
});
