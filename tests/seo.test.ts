import assert from "node:assert/strict";
import { test } from "node:test";
import { breadcrumbJsonLd, fallbackDescription, gtinField, onlineStoreJsonLd, productJsonLd } from "../lib/seo/store-structured-data.ts";
import { categoriesWithActiveProducts } from "../lib/seo/category-coverage.ts";
import { buildStoreSitemap } from "../lib/sites/store-sitemap.ts";

/** Faz 37 Kısım C — JSON-LD (Google Rich Results biçimi) ve boş kategoriler. */

test("Product JSON-LD: Offer with TRY price, availability, GTIN from barcode, brand; never ratings", () => {
  const json = productJsonLd({
    name: "Canik Uyumlu Kydex Tabanca Kılıfı – Coyote",
    description: "Canik uyumlu kydex kılıf.",
    url: "https://www.t46store.com/urun/canik",
    image: "https://www.t46store.com/paylasim/urun/canik?v=abc",
    sku: "0003",
    barcode: "8680000000018",
    brandName: "CANİK",
    price: 1000,
    highPrice: 1000,
    inStock: true,
    sellerName: "Taktikalp46",
  });
  assert.equal(json["@context"], "https://schema.org");
  assert.equal(json["@type"], "Product");
  assert.equal(json.gtin13, "8680000000018");
  assert.deepEqual(json.brand, { "@type": "Brand", name: "CANİK" });
  const offer = json.offers as Record<string, unknown>;
  assert.equal(offer["@type"], "Offer");
  assert.equal(offer.price, "1000.00");
  assert.equal(offer.priceCurrency, "TRY");
  assert.equal(offer.availability, "https://schema.org/InStock");
  assert.ok(!("aggregateRating" in json) && !("review" in json));
  // Farklı fiyatlı varyantlar → AggregateOffer; stok yok → OutOfStock; boş alanlar yazılmaz.
  const ranged = productJsonLd({ name: "X", description: null, url: "u", image: null, sku: null, barcode: "abc", brandName: null, price: 900, highPrice: 1200, inStock: false, sellerName: "S" });
  assert.equal((ranged.offers as Record<string, unknown>)["@type"], "AggregateOffer");
  assert.equal((ranged.offers as Record<string, unknown>).availability, "https://schema.org/OutOfStock");
  assert.ok(!("brand" in ranged) && !("image" in ranged) && !("sku" in ranged) && !("gtin13" in ranged));
  assert.deepEqual(gtinField("12345"), {});
});

test("BreadcrumbList and OnlineStore", () => {
  const crumbs = breadcrumbJsonLd([
    { name: "Ana Sayfa", url: "https://www.t46store.com/" },
    { name: "Kılıflar", url: "https://www.t46store.com/kategori/kiliflar" },
  ]);
  assert.equal(crumbs["@type"], "BreadcrumbList");
  assert.deepEqual((crumbs.itemListElement as Array<Record<string, unknown>>).map((item) => item.position), [1, 2]);
  const store = onlineStoreJsonLd({
    name: "Taktikalp46",
    legalName: "TAKTİKALP46",
    url: "https://www.t46store.com/",
    logo: null,
    telephone: "0537 322 26 46",
    email: null,
    address: "Vadi Mahallesi 97058 Sokak No:91 Onikişubat / Kahramanmaraş",
    sameAs: ["https://www.instagram.com/x", "javascript:alert(1)"],
  });
  assert.equal(store["@type"], "OnlineStore");
  assert.deepEqual(store.sameAs, ["https://www.instagram.com/x"]);
  assert.ok(!("email" in store) && !("logo" in store));
  assert.equal(fallbackDescription("Kılıflar", "Taktikalp46"), "Kılıflar — Taktikalp46 ürünleri ve alışveriş bilgileri.");
});

test("empty categories: a category counts as filled through its subcategories; inactive products don't count", () => {
  const categories = [
    { id: "silah", parentId: null },
    { id: "canik-kilif", parentId: "silah" },
    { id: "bicak", parentId: null },
    { id: "giyim", parentId: null },
  ];
  const filled = categoriesWithActiveProducts(
    categories,
    [
      { categoryId: "canik-kilif", productId: "canik" },
      { categoryId: "giyim", productId: "pasif" },
    ],
    new Set(["canik"]),
  );
  assert.deepEqual([...filled].sort(), ["canik-kilif", "silah"]);
  // Sitemap'e yalnız dolu kategoriler verilir (sitemap-data filtreler); builder verilenleri yazar.
  const entries = buildStoreSitemap({
    canonicalOrigin: "https://www.t46store.com",
    storeSlug: "taktikalp46",
    categories: categories.filter((c) => filled.has(c.id)).map((c) => ({ slug: c.id, isActive: true, updatedAt: null })),
    products: [],
    brands: [],
  });
  const urls = entries.map((entry) => entry.url);
  assert.ok(urls.includes("https://www.t46store.com/kategori/silah"));
  assert.ok(!urls.includes("https://www.t46store.com/kategori/bicak"));
  assert.ok(!urls.includes("https://www.t46store.com/kategori/giyim"));
});
