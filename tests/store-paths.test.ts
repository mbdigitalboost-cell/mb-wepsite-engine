import assert from "node:assert/strict";
import { test } from "node:test";
import { buildStoreHref, cleanToInternal, internalToClean, isCleanStorePath, storeBaseFor } from "../lib/sites/store-paths.ts";

/** Faz 29 Kısım B — temiz mağaza adresleri (storeHref'in saf çekirdeği). */

test("clean store site: links have no /store/<slug> prefix", () => {
  assert.equal(buildStoreHref("taktikalp46", "taktikalp46"), "/");
  assert.equal(buildStoreHref("taktikalp46", "taktikalp46", "/urun/canik"), "/urun/canik");
  assert.equal(buildStoreHref("taktikalp46", "taktikalp46", "/sepet?siparis=1"), "/sepet?siparis=1");
  assert.equal(buildStoreHref("taktikalp46", "taktikalp46", "?q=1"), "/?q=1");
  assert.equal(storeBaseFor("taktikalp46", "taktikalp46"), "");
});

test("another store / non-store deploy keeps the internal path", () => {
  assert.equal(buildStoreHref("taktikalp46", "baska-magaza", "/urun/x"), "/store/baska-magaza/urun/x");
  assert.equal(buildStoreHref("", "taktikalp46"), "/store/taktikalp46");
  assert.equal(buildStoreHref(undefined, "taktikalp46", "/kategoriler"), "/store/taktikalp46/kategoriler");
  assert.equal(storeBaseFor(undefined, "taktikalp46"), "/store/taktikalp46");
});

test("clean <-> internal mapping", () => {
  assert.equal(cleanToInternal("taktikalp46", "/"), "/store/taktikalp46");
  assert.equal(cleanToInternal("taktikalp46", "/urun/x"), "/store/taktikalp46/urun/x");
  assert.equal(internalToClean("taktikalp46", "/store/taktikalp46"), "/");
  assert.equal(internalToClean("taktikalp46", "/store/taktikalp46/"), "/");
  assert.equal(internalToClean("taktikalp46", "/store/taktikalp46/hesap/giris"), "/hesap/giris");
  assert.equal(internalToClean("taktikalp46", "/store/taktikalp46x/urun"), null);
  assert.equal(internalToClean("taktikalp46", "/store/baska/urun"), null);
});

test("only storefront roots are clean paths", () => {
  for (const p of ["/", "/urun/x", "/kategori/y", "/kategoriler", "/silahini-sec", "/sepet", "/odeme/1", "/hesap", "/siparislerim", "/paylasim", "/paylasim/urun/x", "/iletisim", "/kvkk", "/sozlesmeler/mesafeli-satis", "/iade-ve-cayma", "/cayma-formu", "/cerez-politikasi"]) {
    assert.ok(isCleanStorePath(p), p);
  }
  for (const p of ["/kvkk-aydinlatma-metni", "/cozumler/a", "/urunler", "/kategorilerx", "/dashboard", "/store/taktikalp46"]) {
    assert.ok(!isCleanStorePath(p), p);
  }
});
