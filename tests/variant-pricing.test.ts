import assert from "node:assert/strict";
import { test } from "node:test";
import { computeConfiguredPrice, displayPriceFor, variantEffectivePrice } from "../lib/commerce/pricing.ts";
import { followPlanSummary, normalizeVariantCompareAt, normalizeVariantPrice, planVariantsAfterProductPriceChange } from "../lib/commerce/variant-pricing.ts";

/** Faz 34 Kısım A — varyant fiyatı ürün fiyatını izler; kart = ürün sayfası. */

const TRY = (value: number) => value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
const group = { id: "g-renk", name: "Renk", sortOrder: 0, values: [{ id: "v-siyah", value: "Siyah" }, { id: "v-coyote", value: "Coyote" }] };
const variant = (id: string, valueId: string, price: number | null, compareAtPrice: number | null = null) =>
  ({ id, name: id, price, compareAtPrice, stock: 5, inStock: true, sortOrder: 0, optionValueIds: [valueId] }) as never;

test("NULL variant price falls back to the product price (and its compare price)", () => {
  assert.deepEqual(variantEffectivePrice(1000, 3000, { price: null, compareAtPrice: null }), { price: 1000, compareAtPrice: 3000 });
  assert.deepEqual(variantEffectivePrice(1000, 3000, { price: 1200, compareAtPrice: null }), { price: 1200, compareAtPrice: null });
  const priced = computeConfiguredPrice({
    productPrice: 1000,
    productCompareAtPrice: 3000,
    optionGroups: [group] as never,
    variants: [variant("siyah", "v-siyah", null), variant("coyote", "v-coyote", null)],
    addons: [],
    selectedOptionValueIdByGroup: { "g-renk": "v-coyote" },
    selectedAddonIds: [],
  });
  assert.equal(priced.totalPrice, 1000);
  assert.equal(priced.baseCompareAtPrice, 3000);
});

test("card and product page show the same price (display = what a selection costs)", () => {
  // Bugünkü Canik verisi: ürün 1000, iki renk 2000'de kopya kalmış → vitrin 2000 gösterir (kart ve sayfa aynı).
  const stale = displayPriceFor(1000, 3000, [{ price: 2000, compareAtPrice: 3000 }, { price: 2000, compareAtPrice: 3000 }]);
  assert.deepEqual(stale, { price: 2000, compareAtPrice: 3000, from: false });
  // Renkler ürün fiyatını izlerse (NULL) → 1000 / 3000.
  assert.deepEqual(displayPriceFor(1000, 3000, [{ price: null, compareAtPrice: null }, { price: null, compareAtPrice: null }]), {
    price: 1000,
    compareAtPrice: 3000,
    from: false,
  });
  // Farklı fiyatlı renk → en düşük + "seçeneğe göre değişir".
  assert.deepEqual(displayPriceFor(1000, 3000, [{ price: null, compareAtPrice: null }, { price: 1200, compareAtPrice: null }]), {
    price: 1000,
    compareAtPrice: 3000,
    from: true,
  });
  // Varyantsız ürün; eski fiyat düşükse gösterilmez.
  assert.deepEqual(displayPriceFor(500, 400, []), { price: 500, compareAtPrice: null, from: false });
  for (const v of [null, 2000]) {
    const display = displayPriceFor(1000, 3000, [{ price: v, compareAtPrice: null }]);
    const configured = computeConfiguredPrice({
      productPrice: 1000,
      productCompareAtPrice: 3000,
      optionGroups: [group] as never,
      variants: [variant("only", "v-siyah", v)],
      addons: [],
      selectedOptionValueIdByGroup: { "g-renk": "v-siyah" },
      selectedAddonIds: [],
    });
    assert.equal(display.price, configured.totalPrice);
  }
});

test("admin: a variant price equal to the product price is saved as NULL (keeps following)", () => {
  assert.equal(normalizeVariantPrice(1000, 1000), null);
  assert.equal(normalizeVariantPrice(1000.004, 1000), null);
  assert.equal(normalizeVariantPrice(1200, 1000), 1200);
  assert.equal(normalizeVariantPrice(null, 1000), null);
  assert.equal(normalizeVariantCompareAt(3000, null), null);
  assert.equal(normalizeVariantCompareAt(1500, 1200), 1500);
});

test("product price change: variants equal to the OLD price follow, different ones are kept", () => {
  const plan = planVariantsAfterProductPriceChange(2000, [
    { id: "siyah", price: 2000, compareAtPrice: 3000 },
    { id: "coyote", price: 2000, compareAtPrice: 3000 },
    { id: "ozel", price: 2400, compareAtPrice: null },
    { id: "izleyen", price: null, compareAtPrice: null },
  ]);
  assert.deepEqual(plan.toFollow, ["siyah", "coyote"]);
  assert.deepEqual(plan.alreadyFollowing, ["izleyen"]);
  assert.deepEqual(plan.kept, [{ id: "ozel", price: 2400 }]);
  assert.equal(followPlanSummary(plan, TRY), "3 seçeneğin fiyatı ürün fiyatını izliyor; 1 seçeneğin özel fiyatı korundu (₺2.400,00).");
  // Canik bugün: ürün 2000 → 1000 yapılmıştı ama varyantlar 2000; kayıt anında eski fiyat 1000 → eşit değil, korunur (kullanıcı onayı ayrı).
  assert.deepEqual(planVariantsAfterProductPriceChange(1000, [{ id: "siyah", price: 2000, compareAtPrice: 3000 }]).toFollow, []);
});
