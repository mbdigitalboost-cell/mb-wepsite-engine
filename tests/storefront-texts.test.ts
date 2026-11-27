import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ANNOUNCEMENT_ITEM_MAX_LENGTH,
  ANNOUNCEMENT_MAX_ITEMS,
  EMPTY_STOREFRONT_TEXTS,
  STOREFRONT_TEXT_MAX_LENGTH,
  announcementBarItems,
  ownProductionBadge,
  parseAnnouncementLines,
  toStorefrontTexts,
  validateStorefrontTexts,
} from "../lib/commerce/storefront-texts.ts";

/** Faz 39 — mağazaya özel vitrin metinleri: boş ayar = parça yok (uydurma varsayılan yok). */

test("satırı olmayan mağaza: hiçbir metin yok", () => {
  assert.deepEqual(toStorefrontTexts(null), EMPTY_STOREFRONT_TEXTS);
  assert.equal(ownProductionBadge(EMPTY_STOREFRONT_TEXTS), null);
});

test("satır okunur; boş ve bozuk alanlar yok sayılır", () => {
  const texts = toStorefrontTexts({
    announcement_items: ["  Birinci  ", "", 5, "İkinci"],
    cta_band_title: "  Başlık ",
    cta_band_subtitle: "   ",
    own_production_title: null,
    own_production_subtitle: "Alt",
  });
  assert.deepEqual(texts.announcementItems, ["Birinci", "İkinci"]);
  assert.equal(texts.ctaBandTitle, "Başlık");
  assert.equal(texts.ctaBandSubtitle, null);
  assert.equal(texts.ownProductionTitle, null);
  // Başlık yoksa rozet de yok — alt metin tek başına rozet üretmez.
  assert.equal(ownProductionBadge(texts), null);
});

test("dizi olmayan madde alanı boş listeye düşer", () => {
  assert.deepEqual(toStorefrontTexts({ announcement_items: "tek metin" }).announcementItems, []);
});

test("duyuru şeridi sırası: ücretsiz kargo, iade, sonra mağazanın maddeleri", () => {
  assert.deepEqual(
    announcementBarItems({ freeShippingClaim: "Kargo", returnsClaim: "İade", storeItems: ["A", "B"] }),
    ["Kargo", "İade", "A", "B"],
  );
});

test("duyuru şeridi: ayar kapalıysa o madde yok; hepsi boşsa şerit boş", () => {
  assert.deepEqual(announcementBarItems({ freeShippingClaim: null, returnsClaim: null, storeItems: ["A"] }), ["A"]);
  assert.deepEqual(announcementBarItems({ freeShippingClaim: null, returnsClaim: null, storeItems: [] }), []);
  assert.deepEqual(announcementBarItems({ freeShippingClaim: null, returnsClaim: null, storeItems: ["  "] }), []);
});

test("duyuru şeridi: yinelenen madde bir kez gösterilir", () => {
  assert.deepEqual(announcementBarItems({ freeShippingClaim: null, returnsClaim: "İade", storeItems: ["İade", "A"] }), ["İade", "A"]);
});

test("rozet: başlık varsa döner, alt metin isteğe bağlı", () => {
  assert.deepEqual(ownProductionBadge({ ...EMPTY_STOREFRONT_TEXTS, ownProductionTitle: "Başlık" }), { title: "Başlık", subtitle: null });
  assert.deepEqual(ownProductionBadge({ ...EMPTY_STOREFRONT_TEXTS, ownProductionTitle: "Başlık", ownProductionSubtitle: "Alt" }), {
    title: "Başlık",
    subtitle: "Alt",
  });
});

test("admin formu: her satır bir madde; boş satır ve yineleme atılır", () => {
  assert.deepEqual(parseAnnouncementLines("A\r\n\n  B  \nA\n"), ["A", "B"]);
  assert.deepEqual(parseAnnouncementLines(""), []);
});

test("doğrulama: geçerli girdi ve tamamen boş girdi kabul edilir", () => {
  assert.equal(validateStorefrontTexts(EMPTY_STOREFRONT_TEXTS), null);
  assert.equal(
    validateStorefrontTexts({ announcementItems: ["A"], ctaBandTitle: "B", ctaBandSubtitle: "C", ownProductionTitle: "D", ownProductionSubtitle: null }),
    null,
  );
});

test("doğrulama: sınırlar ve başlıksız alt metin reddedilir", () => {
  const tooMany = Array.from({ length: ANNOUNCEMENT_MAX_ITEMS + 1 }, (_, index) => `madde ${index}`);
  assert.notEqual(validateStorefrontTexts({ ...EMPTY_STOREFRONT_TEXTS, announcementItems: tooMany }), null);
  assert.notEqual(validateStorefrontTexts({ ...EMPTY_STOREFRONT_TEXTS, announcementItems: ["x".repeat(ANNOUNCEMENT_ITEM_MAX_LENGTH + 1)] }), null);
  assert.notEqual(validateStorefrontTexts({ ...EMPTY_STOREFRONT_TEXTS, ctaBandTitle: "x".repeat(STOREFRONT_TEXT_MAX_LENGTH + 1) }), null);
  assert.notEqual(validateStorefrontTexts({ ...EMPTY_STOREFRONT_TEXTS, ctaBandSubtitle: "Alt" }), null);
  assert.notEqual(validateStorefrontTexts({ ...EMPTY_STOREFRONT_TEXTS, ownProductionSubtitle: "Alt" }), null);
});
