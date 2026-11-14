import assert from "node:assert/strict";
import { test } from "node:test";
import { SITES, findSite, normalizeOrigin, resolveSite } from "../lib/sites/registry.ts";

/** Faz 28 — site kaydının değişmezleri. Yeni site eklerken bu testler de geçmeli. */

test("every canonicalOrigin is https without a trailing slash", () => {
  for (const site of SITES) {
    assert.match(site.canonicalOrigin, /^https:\/\//, site.key);
    assert.equal(site.canonicalOrigin, normalizeOrigin(site.canonicalOrigin), site.key);
    assert.doesNotMatch(site.canonicalOrigin, /localhost/, site.key);
  }
});

test("site keys and origins are unique", () => {
  assert.equal(new Set(SITES.map((s) => s.key)).size, SITES.length);
  assert.equal(new Set(SITES.map((s) => s.canonicalOrigin)).size, SITES.length);
});

test("every store has a unique storeSlug; non-stores have none", () => {
  const slugs = SITES.filter((s) => s.kind === "store").map((s) => s.storeSlug);
  for (const slug of slugs) assert.ok(slug && /^[a-z0-9-]+$/.test(slug));
  assert.equal(new Set(slugs).size, slugs.length);
  for (const site of SITES.filter((s) => s.kind !== "store")) assert.equal(site.storeSlug, undefined, site.key);
});

test("exactly one panel site", () => {
  assert.equal(SITES.filter((s) => s.kind === "panel").length, 1);
});

test("resolveSite: explicit key, legacy fallbacks, unknown key throws", () => {
  assert.equal(resolveSite({ siteKey: "taktikalp46" }).site.key, "taktikalp46");
  assert.equal(resolveSite({ siteKey: " Panel " }).explicit, true);
  assert.equal(resolveSite({ panelOnlyMode: true }).site.key, "panel");
  assert.equal(resolveSite({}).site.key, "taktikalp46");
  assert.equal(resolveSite({}).explicit, false);
  assert.throws(() => resolveSite({ siteKey: "taktik" }), /registry'de yok/);
  assert.equal(findSite("yok"), undefined);
});
