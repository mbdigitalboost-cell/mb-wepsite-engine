import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LEGAL_ACCEPTANCE_ERROR,
  MARKETING_CONSENT_TEXT,
  buildAcceptanceRecord,
  isChecked,
  legalAcceptanceError,
  legalOrderFromCheckout,
  type CheckoutLegalInput,
} from "../lib/legal/acceptance.ts";
import { buildLegalValues, type LegalStoreContext } from "../lib/legal/context.ts";
import { renderLegalTemplate } from "../lib/legal/template.ts";
import { DEFAULT_LEGAL_TEMPLATES } from "../lib/legal/default-templates.ts";
import { buildStoreSitemap } from "../lib/sites/store-sitemap.ts";

/** Faz 33 Kısım C — ödeme adımı onayı, anlık görüntü, sitemap. (Çerez kapısı: Faz 35, tests/store-tracking.test.ts) */

const STORE: LegalStoreContext = {
  storeName: "Taktikalp46",
  siteUrl: "https://www.t46store.com",
  seller: {
    legalName: "TAKTİKALP46",
    ownerName: "Alperen Önsel",
    taxNumber: "52612445762",
    taxOffice: "Aslanbey VD",
    mersisNumber: null,
    address: "Vadi Mahallesi 97058 Sokak No:91 Onikişubat / Kahramanmaraş",
    phone: "0537 322 26 46",
    email: "taktikalp46@gmail.com",
    kepAddress: null,
    etbisInfo: null,
    etbisUrl: null,
  },
  shipping: { shippingFee: 250, freeShippingThreshold: 2000, thresholdBasis: "before_discount", codFee: 0 },
  returns: { enabled: true, windowDays: 14, carrierName: null, code: null, instructions: null, address: null },
  paymentMethods: ["Kapıda Nakit", "Kapıda Kart", "Havale-EFT"],
  cardPaymentEnabled: false,
};

const CHECKOUT: CheckoutLegalInput = {
  orderNumber: 77,
  date: new Date("2026-11-16T10:00:00Z"),
  customerName: "Test Alıcı",
  customerPhone: "0532 000 00 00",
  customerEmail: null,
  address: { neighborhood: "Test Mah.", line: "Test Sk. 1", district: "Kadıköy", city: "İstanbul" },
  billing: { type: "individual", name: null, taxOffice: null, sameAsShipping: true, addressLine: null, district: null, city: null },
  lines: [{ productName: "Kılıf", variantLabel: "Coyote", addons: [{ addonName: "Kılıf üstü yazı" }], quantity: 1, lineTotal: 2150 }],
  subtotal: 2150,
  discountAmount: 0,
  discountCode: null,
  shippingFee: 0,
  codFee: 0,
  total: 2150,
  paymentMethod: "Kapıda Nakit",
};

test("order without the required box is rejected on the server; marketing consent is optional", () => {
  assert.equal(legalAcceptanceError(true, null), LEGAL_ACCEPTANCE_ERROR);
  assert.equal(legalAcceptanceError(true, "off"), LEGAL_ACCEPTANCE_ERROR);
  assert.equal(legalAcceptanceError(true, "on"), null);
  // Metinler yayımlanmamış mağaza: akış eskisi gibi (kutu yok, şart yok).
  assert.equal(legalAcceptanceError(false, null), null);
  // Ticari ileti onayı işaretsizken de sipariş geçer; yalnız "on" onaydır.
  assert.equal(isChecked(null), false);
  assert.equal(isChecked("on"), true);
});

test("snapshot keeps the text the customer accepted even after the template changes", () => {
  const order = legalOrderFromCheckout(CHECKOUT);
  const v1 = renderLegalTemplate(DEFAULT_LEGAL_TEMPLATES.distance_sales.body, buildLegalValues(STORE, order));
  const record = buildAcceptanceRecord({
    storeId: "store-a",
    orderId: "order-1",
    preInformation: { documentId: "pre-1", version: 1, text: renderLegalTemplate(DEFAULT_LEGAL_TEMPLATES.pre_information.body, buildLegalValues(STORE, order)) },
    distanceSales: { documentId: "ds-1", version: 1, text: v1 },
    marketingConsent: false,
    acceptedAt: CHECKOUT.date,
  });
  const v2 = renderLegalTemplate(`${DEFAULT_LEGAL_TEMPLATES.distance_sales.body}\n\nYENİ MADDE`, buildLegalValues(STORE, order));
  assert.notEqual(v2, v1);
  assert.equal(record.distance_sales_snapshot, v1);
  assert.equal(record.distance_sales_version, 1);
  assert.match(record.distance_sales_snapshot, /\*\*Sipariş no:\*\* #77/);
  assert.match(record.distance_sales_snapshot, /Kılıf \(Coyote, Kılıf üstü yazı\) × 1 — ₺2\.150,00/);
  assert.equal(record.marketing_consent, false);
  assert.equal(record.marketing_consent_text, null);
  const withConsent = buildAcceptanceRecord({ ...{ storeId: "s", orderId: "o", preInformation: { documentId: "p", version: 1, text: "x" }, distanceSales: { documentId: "d", version: 1, text: "y" } }, marketingConsent: true, acceptedAt: CHECKOUT.date });
  assert.equal(withConsent.marketing_consent_text, MARKETING_CONSENT_TEXT);
});

test("contract never contains the identity/tax number; billing is summarized", () => {
  const order = legalOrderFromCheckout({ ...CHECKOUT, billing: { type: "corporate", name: "Örnek Ltd.", taxOffice: "Kadıköy VD", sameAsShipping: false, addressLine: "Fatura Sk. 2", district: "Üsküdar", city: "İstanbul" } });
  assert.equal(order.billing, "Kurumsal — Örnek Ltd.; Vergi dairesi: Kadıköy VD; Adres: Fatura Sk. 2, Üsküdar / İstanbul");
  assert.equal(order.deliveryAddress, "Test Mah., Test Sk. 1, Kadıköy / İstanbul");
  const text = renderLegalTemplate(DEFAULT_LEGAL_TEMPLATES.distance_sales.body, buildLegalValues(STORE, order));
  assert.doesNotMatch(text, /\b\d{10,11}\b(?<!52612445762)/); // satıcının VKN'si dışında 10-11 haneli numara yok
});

test("sitemap lists only the published legal pages, on the clean origin", () => {
  const entries = buildStoreSitemap({
    canonicalOrigin: "https://www.t46store.com",
    storeSlug: "taktikalp46",
    categories: [],
    products: [],
    brands: [],
    legalPaths: ["/kvkk", "/sozlesmeler/mesafeli-satis", "/iletisim", "https://evil.com", "/../x"],
  });
  const urls = entries.map((e) => e.url);
  assert.ok(urls.includes("https://www.t46store.com/kvkk"));
  assert.ok(urls.includes("https://www.t46store.com/sozlesmeler/mesafeli-satis"));
  assert.ok(urls.includes("https://www.t46store.com/iletisim"));
  assert.ok(!urls.some((u) => u.includes("evil") || u.includes("..")));
});
