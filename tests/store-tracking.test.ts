import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GA4_ID_PATTERN,
  GOOGLE_ADS_ID_PATTERN,
  GOOGLE_ADS_LABEL_PATTERN,
  META_PIXEL_ID_PATTERN,
  NO_TRACKING,
  activeTools,
  activeToolsSignature,
  consentBannerText,
  decideTrackers,
  isTrackablePath,
  needsConsentPrompt,
  parseConsentCookie,
  readConsentCookie,
  serializeConsentCookie,
  thirdPartyCookieSection,
  trackingCookiesToClear,
  type ConsentChoice,
  type StoreTrackingSettings,
} from "../lib/tracking/store-tracking.ts";
import { shouldSendPurchase, purchaseOnceKey } from "../lib/tracking/store-events.ts";
import { renderLegalTemplate } from "../lib/legal/template.ts";
import { buildLegalValues, type LegalStoreContext } from "../lib/legal/context.ts";
import { DEFAULT_LEGAL_TEMPLATES } from "../lib/legal/default-templates.ts";

/** Faz 35 — çerez rızası ve takip betiği kapısı. */

const ALL: StoreTrackingSettings = {
  metaPixelId: "123456789012345",
  metaEnabled: true,
  ga4MeasurementId: "G-ABC123XYZ",
  ga4Enabled: true,
  googleAdsId: "AW-1234567890",
  googleAdsPurchaseLabel: "AbC-D_ef",
  googleAdsEnabled: true,
  consentVersion: 3,
};
const ID = "6f1c2f3e-1d2c-4b5a-9e8f-0a1b2c3d4e5f";
const consent = (a: boolean, m: boolean, v = 3): ConsentChoice => ({ v, a, m, id: ID, ts: 1700000000000 });

test("decideTrackers: no consent → nothing; analytics → GA4 only; marketing → Meta + Ads; disabled tool never loads", () => {
  assert.deepEqual(decideTrackers(ALL, null), { ga4MeasurementId: null, metaPixelId: null, googleAdsId: null, googleAdsPurchaseLabel: null, loadGtag: false });
  assert.deepEqual(decideTrackers(ALL, consent(false, false)), { ga4MeasurementId: null, metaPixelId: null, googleAdsId: null, googleAdsPurchaseLabel: null, loadGtag: false });
  const analyticsOnly = decideTrackers(ALL, consent(true, false));
  assert.equal(analyticsOnly.ga4MeasurementId, "G-ABC123XYZ");
  assert.equal(analyticsOnly.metaPixelId, null);
  assert.equal(analyticsOnly.googleAdsId, null);
  assert.equal(analyticsOnly.loadGtag, true);
  const marketingOnly = decideTrackers(ALL, consent(false, true));
  assert.equal(marketingOnly.ga4MeasurementId, null);
  assert.equal(marketingOnly.metaPixelId, "123456789012345");
  assert.equal(marketingOnly.googleAdsId, "AW-1234567890");
  assert.equal(marketingOnly.googleAdsPurchaseLabel, "AbC-D_ef");
  const disabled = decideTrackers({ ...ALL, ga4Enabled: false, metaEnabled: false, googleAdsEnabled: false }, consent(true, true));
  assert.equal(disabled.loadGtag || Boolean(disabled.metaPixelId), false);
  // Biçimi bozuk kimlik açık olsa da yüklenmez.
  assert.equal(decideTrackers({ ...ALL, ga4MeasurementId: "UA-1234", metaEnabled: false, googleAdsEnabled: false }, consent(true, true)).loadGtag, false);
});

test("consent version change asks again and loads nothing until the new choice", () => {
  assert.equal(needsConsentPrompt(ALL, null), true);
  assert.equal(needsConsentPrompt(ALL, consent(true, true)), false);
  assert.equal(needsConsentPrompt(ALL, consent(true, true, 2)), true);
  assert.equal(decideTrackers(ALL, consent(true, true, 2)).loadGtag, false);
  // Araç yoksa bant da yok (başka mağaza / ayarsız mağaza).
  assert.equal(needsConsentPrompt(NO_TRACKING, null), false);
  assert.equal(decideTrackers(NO_TRACKING, consent(true, true, 1)).loadGtag, false);
  assert.notEqual(activeToolsSignature(ALL), activeToolsSignature({ ...ALL, metaEnabled: false }));
  assert.equal(activeToolsSignature(ALL), activeToolsSignature({ ...ALL, googleAdsPurchaseLabel: "baska" }));
});

test("consent cookie round-trip; tampered values are ignored", () => {
  const raw = serializeConsentCookie(consent(true, false));
  assert.deepEqual(parseConsentCookie(raw), consent(true, false));
  assert.deepEqual(readConsentCookie(`a=1; mb_consent=${encodeURIComponent(raw)}`), consent(true, false));
  assert.equal(parseConsentCookie("v3.a1.m1.not-a-uuid.1"), null);
  assert.equal(parseConsentCookie("granted"), null);
  assert.equal(readConsentCookie("mb_consent=%E0%A4%A"), null);
});

test("no banner or scripts on panel, API, share-image or admin paths", () => {
  for (const path of ["/", "/urun/canik", "/sepet", "/kvkk", "/store/taktikalp46/urun/x"]) assert.equal(isTrackablePath(path), true, path);
  for (const path of ["/api/webhooks/iyzico", "/paylasim/urun/x", "/store/taktikalp46/paylasim/kategori/y", "/dashboard", "/login", "/mfa-challenge", "/auth/callback"]) {
    assert.equal(isTrackablePath(path), false, path);
  }
});

test("withdrawal clears only the official tracking cookies", () => {
  assert.deepEqual(trackingCookiesToClear(["_ga", "_ga_ABC123", "_gcl_au", "_fbp", "_fbc", "mb_consent", "sb-storefront-auth", "_gads"]), ["_ga", "_ga_ABC123", "_gcl_au", "_fbp", "_fbc"]);
});

test("banner text names only the enabled tools", () => {
  assert.match(consentBannerText(ALL), /ziyaret istatistikleri \(Google Analytics\) ve reklam ölçümü \(Meta, Google Ads\)/);
  const metaOnly = consentBannerText({ ...ALL, ga4Enabled: false, googleAdsEnabled: false });
  assert.match(metaOnly, /reklam ölçümü \(Meta\)/);
  assert.doesNotMatch(metaOnly, /Google/);
  assert.equal(activeTools({ ...ALL, ga4Enabled: false }).analytics, false);
});

test("cookie policy third-party section reflects the real settings, no placeholders", () => {
  assert.match(thirdPartyCookieSection(NO_TRACKING), /bugün analitik, reklam veya pazarlama amaçlı üçüncü taraf çerezi kullanılmamaktadır/);
  const all = thirdPartyCookieSection(ALL);
  for (const name of ["_ga", "_ga_<kimlik>", "_gcl_", "_fbp", "_fbc"]) assert.ok(all.includes(name), name);
  assert.match(all, /2 yıl/);
  assert.match(all, /90 gün/);
  const store: LegalStoreContext = {
    storeName: "Taktikalp46",
    siteUrl: "https://www.t46store.com",
    seller: null,
    shipping: { shippingFee: 250, freeShippingThreshold: 2000, thresholdBasis: "before_discount", codFee: 0 },
    returns: { enabled: true, windowDays: 14, carrierName: null, code: null, instructions: null, address: null },
    paymentMethods: ["Kapıda Nakit"],
    cardPaymentEnabled: false,
  };
  const off = renderLegalTemplate(DEFAULT_LEGAL_TEMPLATES.cookies.body, buildLegalValues(store));
  assert.doesNotMatch(off, /\{\{|mb_consent/);
  const on = renderLegalTemplate(DEFAULT_LEGAL_TEMPLATES.cookies.body, buildLegalValues({ ...store, tracking: ALL }));
  assert.doesNotMatch(on, /\{\{/);
  assert.match(on, /\*\*mb_consent\*\* \(çerez\)/);
  assert.match(on, /Meta Pixel/);
});

test("ID formats and Purchase is sent once per order", () => {
  assert.ok(META_PIXEL_ID_PATTERN.test("123456789012345"));
  assert.ok(!META_PIXEL_ID_PATTERN.test("12345"));
  assert.ok(GA4_ID_PATTERN.test("G-ABC123XYZ"));
  assert.ok(!GA4_ID_PATTERN.test("UA-12345-1"));
  assert.ok(GOOGLE_ADS_ID_PATTERN.test("AW-1234567890"));
  assert.ok(!GOOGLE_ADS_ID_PATTERN.test("AW-ABC"));
  assert.ok(GOOGLE_ADS_LABEL_PATTERN.test("AbC-D_ef"));
  assert.ok(!GOOGLE_ADS_LABEL_PATTERN.test("<script>"));
  const store = new Map<string, string>();
  const storage = { getItem: (key: string) => store.get(key) ?? null };
  assert.equal(shouldSendPurchase(storage, "order-1"), true);
  store.set(purchaseOnceKey("order-1"), "1");
  assert.equal(shouldSendPurchase(storage, "order-1"), false);
  assert.equal(shouldSendPurchase(storage, "order-2"), true);
  assert.equal(shouldSendPurchase(storage, ""), false);
});
