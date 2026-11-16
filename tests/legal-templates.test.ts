import assert from "node:assert/strict";
import { test } from "node:test";
import { LEGAL_VARIABLES, renderLegalTemplate, validateLegalTemplate } from "../lib/legal/template.ts";
import { buildLegalValues, formatTry, type LegalOrderContext, type LegalStoreContext } from "../lib/legal/context.ts";
import { parseLegalInline, parseLegalMarkdown } from "../lib/legal/markdown.ts";
import { DEFAULT_LEGAL_TEMPLATES } from "../lib/legal/default-templates.ts";
import { computeShippingCharges, type ShippingFeeSettings } from "../lib/commerce/shipping-fee.ts";

/** Faz 33 Kısım B — şablon motoru, değerler ve varsayılan metinler. */

const T46_SHIPPING: ShippingFeeSettings = { shippingFee: 250, freeShippingThreshold: 2000, thresholdBasis: "before_discount", codFee: 0 };

const T46_STORE: LegalStoreContext = {
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
  shipping: T46_SHIPPING,
  returns: { enabled: true, windowDays: 14, carrierName: null, code: null, instructions: null, address: null },
  paymentMethods: ["Kapıda Nakit", "Kapıda Kart", "Havale-EFT"],
  cardPaymentEnabled: false,
};

function order(subtotal: number, discount: number, paymentMethod: string, settings = T46_SHIPPING): LegalOrderContext {
  const charges = computeShippingCharges({ itemsTotal: subtotal, discountAmount: discount, paymentMethod, settings });
  return {
    orderNumber: 42,
    date: new Date("2026-11-16T09:00:00Z"),
    buyer: { name: "Test Alıcı", phone: "0532 000 00 00", email: null },
    deliveryAddress: "Test Mahallesi, Kadıköy / İstanbul",
    billing: null,
    lines: [{ name: "Kılıf", variant: "Coyote", addons: [], quantity: 1, lineTotal: subtotal }],
    subtotal,
    discountAmount: discount,
    discountCode: discount > 0 ? "KOD10" : null,
    shippingFee: charges.shippingFee,
    codFee: charges.codFee,
    total: charges.grandTotal,
    paymentMethod,
  };
}

const lineOf = (text: string, label: string) => text.split("\n").find((line) => line.startsWith(`**${label}`)) ?? null;

test("empty value drops the whole line; default after | is used; unknown variable never leaks", () => {
  const out = renderLegalTemplate("A: {{satici.unvan}}\nMERSİS: {{satici.mersis}}\nT: {{siparis.toplam|Sonra belirlenir}}\nX: {{yok.boyle}}\nSon", {
    "satici.unvan": "TAKTİKALP46",
    "satici.mersis": "  ",
  });
  assert.equal(out, "A: TAKTİKALP46\nT: Sonra belirlenir\nSon");
});

test("{{#if}} blocks are kept only when the value is present", () => {
  const body = "Önce\n{{#if iade.kargo_firmasi}}\nFirma: {{iade.kargo_firmasi}}\n{{/if}}\nSonra";
  assert.equal(renderLegalTemplate(body, {}), "Önce\nSonra");
  assert.equal(renderLegalTemplate(body, { "iade.kargo_firmasi": "Aras" }), "Önce\nFirma: Aras\nSonra");
  assert.deepEqual(validateLegalTemplate("{{#if a.b}}\nx").structureErrors.length, 1);
  assert.deepEqual(validateLegalTemplate("{{yanlis.ad}}").unknownVariables, ["yanlis.ad"]);
});

test("default templates: only known variables, valid structure, no placeholder left after render", () => {
  for (const [kind, template] of Object.entries(DEFAULT_LEGAL_TEMPLATES)) {
    const validation = validateLegalTemplate(template.body);
    assert.deepEqual(validation.unknownVariables, [], kind);
    assert.deepEqual(validation.structureErrors, [], kind);
    for (const values of [buildLegalValues(T46_STORE), buildLegalValues(T46_STORE, order(1900, 0, "Havale-EFT")), buildLegalValues({ ...T46_STORE, seller: null })]) {
      const text = renderLegalTemplate(template.body, values);
      assert.doesNotMatch(text, /\{\{|\}\}|\[DOLDURUN|undefined|null/i, kind);
    }
  }
});

test("unknown seller fields (MERSİS, KEP, ETBİS) produce no line at all", () => {
  const text = renderLegalTemplate(DEFAULT_LEGAL_TEMPLATES.pre_information.body, buildLegalValues(T46_STORE));
  assert.doesNotMatch(text, /MERSİS|KEP adresi|ETBİS/);
  assert.match(text, /\*\*Vergi kimlik no:\*\* 52612445762/);
  const withMersis = renderLegalTemplate(
    DEFAULT_LEGAL_TEMPLATES.pre_information.body,
    buildLegalValues({ ...T46_STORE, seller: { ...T46_STORE.seller!, mersisNumber: "0123456789012345" } }),
  );
  assert.match(withMersis, /\*\*MERSİS no:\*\* 0123456789012345/);
});

test("pre-information amounts equal the Faz 31 shipping calculation", () => {
  const cases: Array<[number, number, string, ShippingFeeSettings]> = [
    [1900, 0, "Havale-EFT", T46_SHIPPING],
    [2100, 200, "Kapıda Nakit", T46_SHIPPING],
    [1500, 0, "Kapıda Nakit", { ...T46_SHIPPING, codFee: 30 }],
  ];
  for (const [subtotal, discount, method, settings] of cases) {
    const o = order(subtotal, discount, method, settings);
    const text = renderLegalTemplate(DEFAULT_LEGAL_TEMPLATES.pre_information.body, buildLegalValues({ ...T46_STORE, shipping: settings }, o));
    const charges = computeShippingCharges({ itemsTotal: subtotal, discountAmount: discount, paymentMethod: method, settings });
    assert.equal(lineOf(text, "Kargo:"), `**Kargo:** ${charges.shippingFee > 0 ? formatTry(charges.shippingFee) : "Ücretsiz"}`);
    assert.equal(lineOf(text, "Tüm vergiler dahil toplam:"), `**Tüm vergiler dahil toplam:** ${formatTry(charges.grandTotal)}`);
    assert.equal(lineOf(text, "Kapıda ödeme ücreti:"), charges.codFee > 0 ? `**Kapıda ödeme ücreti:** ${formatTry(charges.codFee)}` : null);
  }
  // 1.900 TL → 250 TL kargo; 2.100 TL + 200 TL indirim → ücretsiz (eşik indirim öncesine bakar).
  assert.equal(order(1900, 0, "Havale-EFT").shippingFee, 250);
  assert.equal(order(2100, 200, "Havale-EFT").shippingFee, 0);
});

test("returns page: online path when enabled, e-mail/WhatsApp path when disabled", () => {
  const on = renderLegalTemplate(DEFAULT_LEGAL_TEMPLATES.returns.body, buildLegalValues(T46_STORE));
  assert.match(on, /\[Siparişlerim\]\(\/siparislerim\) sayfasından siparişinizi açın/);
  assert.doesNotMatch(on, /Çevrimiçi iade talebi şu an/);
  const off = renderLegalTemplate(DEFAULT_LEGAL_TEMPLATES.returns.body, buildLegalValues({ ...T46_STORE, returns: { ...T46_STORE.returns, enabled: false } }));
  assert.match(off, /Çevrimiçi iade talebi şu an bu mağazada açık değildir; cayma hakkınız yasal olarak devam eder/);
  assert.match(off, /taktikalp46@gmail\.com/);
});

test("withdrawal window never shown below 14 days; every variable is documented", () => {
  assert.equal(buildLegalValues({ ...T46_STORE, returns: { ...T46_STORE.returns, windowDays: 7 } })["iade.sure_gun"], "14");
  for (const name of Object.keys(buildLegalValues(T46_STORE, order(100, 0, "Havale-EFT")))) assert.ok(name in LEGAL_VARIABLES, name);
});

test("markdown subset: headings, lists, paragraphs, safe links only", () => {
  const blocks = parseLegalMarkdown("## Başlık\nsatır 1\nsatır 2\n\n- a\n- b\n---\nson");
  assert.deepEqual(blocks.map((b) => b.type), ["heading", "paragraph", "list", "hr", "paragraph"]);
  const inline = parseLegalInline("**kalın** [iç](/kvkk) [kötü](javascript:alert(1)) [dış](//evil.com)");
  assert.equal(inline[0].type, "bold");
  assert.deepEqual(inline.filter((p) => p.type === "link").map((p) => (p as { href: string }).href), ["/kvkk"]);
  assert.ok(inline.some((p) => p.type === "text" && p.text === "kötü"));
});
