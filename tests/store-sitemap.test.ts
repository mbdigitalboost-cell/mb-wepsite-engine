import assert from "node:assert/strict";
import { test } from "node:test";
import { findSite } from "../lib/sites/registry.ts";
import { buildStoreSitemap } from "../lib/sites/store-sitemap.ts";

/** Faz 28 — mağaza sitemap'i: yalnız kendi domaini + kendi /store/<slug> yolu, pasif kayıt yok. */
const t46 = findSite("taktikalp46");
assert.ok(t46?.storeSlug);

const entries = buildStoreSitemap({
  canonicalOrigin: t46.canonicalOrigin,
  storeSlug: t46.storeSlug,
  categories: [
    { slug: "silah-kiliflari", isActive: true, updatedAt: "2026-11-10T10:00:00Z" },
    { slug: "pasif-kategori", isActive: false, updatedAt: "2026-11-11T10:00:00Z" },
  ],
  products: [
    { slug: "canik-tp9", isActive: true, updatedAt: "2026-11-12T10:00:00Z" },
    { slug: "taslak-abc123", isActive: false, updatedAt: "2026-11-13T10:00:00Z" },
  ],
  brands: [{ slug: "canik", isActive: true, updatedAt: null }],
});
const urls = entries.map((e) => e.url);

test("no localhost, only the store's own origin and path", () => {
  for (const url of urls) {
    assert.doesNotMatch(url, /localhost/);
    assert.ok(url.startsWith("https://www.t46store.com/store/taktikalp46"), url);
  }
});

test("no other site's paths (Petra) and no personal pages", () => {
  for (const url of urls) assert.doesNotMatch(url, /iletisim|cozumler|hakkimizda|sepet|odeme|hesap|siparislerim|dashboard/);
});

test("inactive products/categories are excluded", () => {
  assert.ok(!urls.some((u) => u.includes("taslak-abc123")));
  assert.ok(!urls.some((u) => u.includes("pasif-kategori")));
});

test("expected entries and lastModified from updated_at", () => {
  assert.deepEqual(urls, [
    "https://www.t46store.com/store/taktikalp46",
    "https://www.t46store.com/store/taktikalp46/kategoriler",
    "https://www.t46store.com/store/taktikalp46/kategori/silah-kiliflari",
    "https://www.t46store.com/store/taktikalp46/urun/canik-tp9",
    "https://www.t46store.com/store/taktikalp46/silahini-sec",
    "https://www.t46store.com/store/taktikalp46/silahini-sec/canik",
  ]);
  assert.equal(entries[3].lastModified?.toISOString(), "2026-11-12T10:00:00.000Z");
  assert.equal(entries[0].lastModified?.toISOString(), "2026-11-12T10:00:00.000Z");
});

test("no brands → no /silahini-sec entry", () => {
  const none = buildStoreSitemap({ canonicalOrigin: t46.canonicalOrigin, storeSlug: "taktikalp46", categories: [], products: [], brands: [] });
  assert.deepEqual(none.map((e) => e.url), ["https://www.t46store.com/store/taktikalp46", "https://www.t46store.com/store/taktikalp46/kategoriler"]);
});
