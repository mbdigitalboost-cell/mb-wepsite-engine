import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  canSendOrderPlacedEmails,
  canSendShippedEmail,
  dispatchEmail,
  type DispatchDeps,
  type EmailLogWrite,
  type ExistingEmailLog,
  type OutgoingEmail,
} from "../lib/commerce/order-emails/dispatch.ts";
import {
  emailIdempotencyKey,
  isKindEnabled,
  parseEmailList,
  resolveSender,
  toStoreEmailSettings,
  validateStoreEmailSettings,
  type StoreEmailSettings,
} from "../lib/commerce/order-emails/settings.ts";
import {
  renderCancelled,
  renderOrderConfirmation,
  renderReturnEmail,
  renderShipped,
  renderStoreNewOrder,
  renderTestEmail,
  type EmailOrder,
  type EmailStore,
} from "../lib/commerce/order-emails/templates.ts";
import { SITES } from "../lib/sites/registry.ts";

/** Faz 40 — sipariş e-postaları: gönderen kuralı, tekrar koruması, tetik koşulları, şablonlar. */

const CARD = "Kredi Kartı";

function settings(overrides: Partial<StoreEmailSettings> = {}): StoreEmailSettings {
  return {
    fromName: "A Mağazası",
    fromEmail: "siparis@a-magazasi.example",
    replyToEmail: null,
    orderNotificationEmails: ["sahip@a-magazasi.example"],
    sendOrderConfirmation: true,
    sendShipped: true,
    sendCancelRefund: true,
    sendStoreNewOrder: true,
    ...overrides,
  };
}

interface Harness {
  deps: DispatchDeps;
  sent: OutgoingEmail[];
  logs: EmailLogWrite[];
}

function harness(options: {
  settingsByStore?: Record<string, StoreEmailSettings | null>;
  existing?: ExistingEmailLog | null;
  send?: (email: OutgoingEmail) => Promise<{ ok: true; messageId: string | null } | { ok: false; error: string }>;
  writeLog?: () => Promise<void>;
  loadSettings?: () => Promise<StoreEmailSettings | null>;
}): Harness {
  const sent: OutgoingEmail[] = [];
  const logs: EmailLogWrite[] = [];
  return {
    sent,
    logs,
    deps: {
      loadSettings: options.loadSettings ?? (async (storeId) => options.settingsByStore?.[storeId] ?? null),
      findLog: async () => options.existing ?? null,
      send: async (email) => {
        sent.push(email);
        return options.send ? options.send(email) : { ok: true, messageId: "msg_1" };
      },
      writeLog:
        options.writeLog ??
        (async (entry) => {
          logs.push(entry);
        }),
    },
  };
}

const RENDERED = { subject: "Konu", html: "<p>x</p>", text: "x" };
const request = (overrides: Partial<Parameters<typeof dispatchEmail>[1]> = {}) => ({
  storeId: "store-a",
  orderId: "order-1",
  returnId: null,
  kind: "order_confirmation" as const,
  customerRecipient: "musteri@example.com",
  render: () => RENDERED,
  ...overrides,
});

// --- gönderen kuralı ---------------------------------------------------------

test("gönderen yalnız verilen mağaza ayarından üretilir; ayar yoksa null", () => {
  assert.equal(resolveSender(null), null);
  assert.deepEqual(resolveSender(settings()), { from: '"A Mağazası" <siparis@a-magazasi.example>', replyTo: null });
  assert.deepEqual(resolveSender(settings({ replyToEmail: "destek@a-magazasi.example" }))?.replyTo, "destek@a-magazasi.example");
  // Ad içindeki tehlikeli karakterler atılır; adres bozuksa gönderen yok.
  assert.equal(resolveSender(settings({ fromName: 'Kötü"<ad>' }))?.from, '"Kötüad" <siparis@a-magazasi.example>');
  assert.equal(resolveSender(settings({ fromEmail: "adres-degil" })), null);
});

test("gönderen kuralında yedek adres yok: kaynakta ortam adresi ya da deneme adresi geçmez", () => {
  for (const file of ["lib/commerce/order-emails/settings.ts", "lib/commerce/order-emails/dispatch.ts", "lib/notifications/resend.ts", "lib/notifications/send-email.ts"]) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /onboarding@resend\.dev/, file);
    assert.doesNotMatch(source, /resendFromEmail|process\.env\.RESEND_FROM_EMAIL/, file);
  }
});

test("ayar yoksa gönderim yapılmaz ve kayıt 'skipped' olur", async () => {
  const h = harness({ settingsByStore: {} });
  const outcome = await dispatchEmail(h.deps, request());
  assert.deepEqual(outcome, { status: "skipped", reason: "no_settings" });
  assert.equal(h.sent.length, 0);
  assert.equal(h.logs[0].status, "skipped");
});

test("A mağazasının siparişinde B mağazasının göndereni kullanılmaz; A'nın ayarı yoksa B'ye düşülmez", async () => {
  const b = settings({ fromName: "B Mağazası", fromEmail: "siparis@b-magazasi.example", orderNotificationEmails: ["sahip@b-magazasi.example"] });
  const both = harness({ settingsByStore: { "store-a": settings(), "store-b": b } });
  await dispatchEmail(both.deps, request({ storeId: "store-a" }));
  await dispatchEmail(both.deps, request({ storeId: "store-b", orderId: "order-2" }));
  assert.equal(both.sent[0].from, '"A Mağazası" <siparis@a-magazasi.example>');
  assert.equal(both.sent[1].from, '"B Mağazası" <siparis@b-magazasi.example>');

  const onlyB = harness({ settingsByStore: { "store-b": b } });
  const outcome = await dispatchEmail(onlyB.deps, request({ storeId: "store-a" }));
  assert.equal(outcome.status, "skipped");
  assert.equal(onlyB.sent.length, 0);
});

test("mağaza bildirimi ayardaki adreslere gider; adres yoksa gönderilmez", async () => {
  const h = harness({ settingsByStore: { "store-a": settings({ orderNotificationEmails: ["bir@example.com", "iki@example.com"] }) } });
  await dispatchEmail(h.deps, request({ kind: "store_new_order", customerRecipient: null }));
  assert.deepEqual(h.sent[0].to, ["bir@example.com", "iki@example.com"]);

  const none = harness({ settingsByStore: { "store-a": settings({ orderNotificationEmails: [] }) } });
  assert.deepEqual(await dispatchEmail(none.deps, request({ kind: "store_new_order", customerRecipient: null })), { status: "skipped", reason: "no_recipient" });
  assert.equal(none.sent.length, 0);
});

test("müşteri e-postası yoksa ya da tür kapalıysa gönderilmez", async () => {
  const noRecipient = harness({ settingsByStore: { "store-a": settings() } });
  assert.deepEqual(await dispatchEmail(noRecipient.deps, request({ customerRecipient: null })), { status: "skipped", reason: "no_recipient" });
  const disabled = harness({ settingsByStore: { "store-a": settings({ sendOrderConfirmation: false }) } });
  assert.deepEqual(await dispatchEmail(disabled.deps, request()), { status: "skipped", reason: "disabled" });
  assert.equal(noRecipient.sent.length + disabled.sent.length, 0);
});

test("tür anahtarları: iptal ve iade türleri aynı anahtara bağlı, test her zaman açık", () => {
  const off = settings({ sendCancelRefund: false, sendShipped: false, sendStoreNewOrder: false, sendOrderConfirmation: false });
  for (const kind of ["cancelled", "return_requested", "return_approved", "return_rejected", "refund_completed", "shipped", "store_new_order", "order_confirmation"] as const) {
    assert.equal(isKindEnabled(off, kind), false, kind);
    assert.equal(isKindEnabled(settings(), kind), true, kind);
  }
  assert.equal(isKindEnabled(off, "test"), true);
});

// --- tekrar koruması ----------------------------------------------------------

test("(sipariş, tür) için gönderilmiş e-posta ikinci kez gitmez ve kaydı değişmez", async () => {
  const h = harness({ settingsByStore: { "store-a": settings() }, existing: { id: "log-1", status: "sent", attempts: 1 } });
  assert.deepEqual(await dispatchEmail(h.deps, request()), { status: "duplicate" });
  assert.equal(h.sent.length, 0);
  assert.equal(h.logs.length, 0);
});

test("tekrar-koruma anahtarı <sipariş>:<tür>; yeniden denemede yeni anahtar", async () => {
  assert.equal(emailIdempotencyKey({ kind: "shipped", orderId: "o1", returnId: null, attempt: 1 }), "o1:shipped");
  assert.equal(emailIdempotencyKey({ kind: "shipped", orderId: "o1", returnId: null, attempt: 3 }), "o1:shipped:r3");
  assert.equal(emailIdempotencyKey({ kind: "return_approved", orderId: "o1", returnId: "r9", attempt: 1 }), "r9:return_approved");

  const first = harness({ settingsByStore: { "store-a": settings() } });
  await dispatchEmail(first.deps, request());
  assert.equal(first.sent[0].idempotencyKey, "order-1:order_confirmation");
  assert.deepEqual(first.logs[0], {
    storeId: "store-a",
    orderId: "order-1",
    returnId: null,
    kind: "order_confirmation",
    existingId: null,
    recipient: "musteri@example.com",
    status: "sent",
    providerMessageId: "msg_1",
    error: null,
    attempts: 1,
  });

  const retry = harness({ settingsByStore: { "store-a": settings() }, existing: { id: "log-1", status: "failed", attempts: 1 } });
  await dispatchEmail(retry.deps, request());
  assert.equal(retry.sent[0].idempotencyKey, "order-1:order_confirmation:r2");
  assert.equal(retry.logs[0].existingId, "log-1");
  assert.equal(retry.logs[0].attempts, 2);
});

// --- e-posta hatası hiçbir şeyi engellemez -------------------------------------

test("sağlayıcı hatası, istisna ve kayıt hatası FIRLATILMAZ; sonuç 'failed' döner", async () => {
  const refused = harness({ settingsByStore: { "store-a": settings() }, send: async () => ({ ok: false, error: "Sağlayıcı hatası 422" }) });
  assert.deepEqual(await dispatchEmail(refused.deps, request()), { status: "failed", error: "Sağlayıcı hatası 422" });
  assert.equal(refused.logs[0].status, "failed");
  assert.equal(refused.logs[0].error, "Sağlayıcı hatası 422");

  const thrown = harness({
    settingsByStore: { "store-a": settings() },
    send: async () => {
      throw new Error("ağ koptu");
    },
  });
  assert.equal((await dispatchEmail(thrown.deps, request())).status, "failed");
  assert.equal(thrown.logs[0].status, "failed");

  const logBroken = harness({
    settingsByStore: { "store-a": settings() },
    writeLog: async () => {
      throw new Error("tablo yok");
    },
  });
  assert.equal((await dispatchEmail(logBroken.deps, request())).status, "sent");

  const settingsBroken = harness({
    loadSettings: async () => {
      throw new Error("veritabanı yok");
    },
  });
  assert.equal((await dispatchEmail(settingsBroken.deps, request())).status, "failed");
  assert.equal(settingsBroken.sent.length, 0);

  const renderBroken = harness({ settingsByStore: { "store-a": settings() } });
  const outcome = await dispatchEmail(
    renderBroken.deps,
    request({
      render: () => {
        throw new Error("şablon hatası");
      },
    }),
  );
  assert.equal(outcome.status, "failed");
});

test("kayda içerik yazılmaz: yalnız tür, alıcı, durum, mesaj kimliği, hata", async () => {
  const h = harness({ settingsByStore: { "store-a": settings() } });
  await dispatchEmail(h.deps, request());
  assert.deepEqual(Object.keys(h.logs[0]).sort(), ["attempts", "error", "existingId", "kind", "orderId", "providerMessageId", "recipient", "returnId", "status", "storeId"]);
});

// --- tetik koşulları -----------------------------------------------------------

test("kart siparişinde ödeme doğrulanmadan onay e-postası yok", () => {
  assert.equal(canSendOrderPlacedEmails({ paymentMethod: CARD, paymentStatus: "unpaid", status: "pending" }, CARD), false);
  assert.equal(canSendOrderPlacedEmails({ paymentMethod: CARD, paymentStatus: "paid", status: "pending" }, CARD), true);
  assert.equal(canSendOrderPlacedEmails({ paymentMethod: "Kapıda Nakit", paymentStatus: "unpaid", status: "pending" }, CARD), true);
  assert.equal(canSendOrderPlacedEmails({ paymentMethod: "Havale-EFT", paymentStatus: "unpaid", status: "pending" }, CARD), true);
  assert.equal(canSendOrderPlacedEmails({ paymentMethod: "Kapıda Nakit", paymentStatus: "unpaid", status: "cancelled" }, CARD), false);
});

test("kargo e-postası: yalnız 'shipped' ve takip numarası varsa", () => {
  assert.equal(canSendShippedEmail({ status: "shipped", trackingNumber: "TR123" }), true);
  assert.equal(canSendShippedEmail({ status: "shipped", trackingNumber: null }), false);
  assert.equal(canSendShippedEmail({ status: "shipped", trackingNumber: "  " }), false);
  assert.equal(canSendShippedEmail({ status: "preparing", trackingNumber: "TR123" }), false);
});

// --- ayar okuma / doğrulama ------------------------------------------------------

test("ayar satırı: bozuk gönderen ayar yok sayılır; bildirim adresleri süzülür", () => {
  assert.equal(toStoreEmailSettings(null), null);
  assert.equal(toStoreEmailSettings({ from_name: "", from_email: "a@b.co" }), null);
  assert.equal(toStoreEmailSettings({ from_name: "Ad", from_email: "bozuk" }), null);
  const parsed = toStoreEmailSettings({
    from_name: " Ad ",
    from_email: "a@b.co",
    reply_to_email: "  ",
    order_notification_emails: ["x@y.co", "bozuk", "x@y.co", 5],
    send_shipped: false,
  });
  assert.deepEqual(parsed, {
    fromName: "Ad",
    fromEmail: "a@b.co",
    replyToEmail: null,
    orderNotificationEmails: ["x@y.co"],
    sendOrderConfirmation: true,
    sendShipped: false,
    sendCancelRefund: true,
    sendStoreNewOrder: true,
  });
});

test("admin girdisi: adres listesi ayrıştırılır ve sınırlar denetlenir", () => {
  assert.deepEqual(parseEmailList("a@b.co\n c@d.co, a@b.co ; e@f.co"), ["a@b.co", "c@d.co", "e@f.co"]);
  assert.equal(validateStoreEmailSettings(settings()), null);
  assert.notEqual(validateStoreEmailSettings(settings({ fromName: "" })), null);
  assert.notEqual(validateStoreEmailSettings(settings({ fromName: "Ad <x>" })), null);
  assert.notEqual(validateStoreEmailSettings(settings({ fromEmail: "bozuk" })), null);
  assert.notEqual(validateStoreEmailSettings(settings({ replyToEmail: "bozuk" })), null);
  assert.notEqual(validateStoreEmailSettings(settings({ orderNotificationEmails: ["1@a.co", "2@a.co", "3@a.co", "4@a.co", "5@a.co", "6@a.co"] })), null);
  assert.notEqual(validateStoreEmailSettings(settings({ orderNotificationEmails: ["bozuk"] })), null);
});

// --- şablonlar -------------------------------------------------------------------

const STORE: EmailStore = {
  name: "Örnek Mağaza",
  homeUrl: "https://ornek-magaza.example/",
  logoUrl: null,
  ordersUrl: "https://ornek-magaza.example/siparislerim",
  legalLinks: [{ label: "KVKK Aydınlatma Metni", url: "https://ornek-magaza.example/kvkk" }],
  returnsPolicyUrl: "https://ornek-magaza.example/iade-ve-cayma",
  withdrawalFormUrl: "https://ornek-magaza.example/cayma-formu",
  seller: { legalName: "ÖRNEK LTD. ŞTİ.", address: "Örnek Mah. 1. Sk. No:1", phone: "0212 000 00 00", email: "bilgi@ornek-magaza.example", taxNumber: "1234567890", taxOffice: "Örnek", mersisNumber: null },
};

const ORDER: EmailOrder = {
  orderNumber: 1042,
  createdAt: "2026-11-28T10:15:00.000Z",
  isTest: false,
  isGuest: true,
  customerName: "Ayşe Yılmaz",
  items: [
    { name: "Ürün Bir", variantLabel: "Siyah / L", addons: [{ name: "Ek Parça", priceDelta: 50 }], quantity: 2, unitPrice: 550, lineTotal: 1100 },
    { name: "Ürün <İki>", variantLabel: null, addons: [], quantity: 1, unitPrice: 200, lineTotal: 200 },
  ],
  subtotal: 1300,
  discountAmount: 100,
  discountCode: "HOSGELDIN",
  shippingFee: 250,
  codFee: 30,
  total: 1480,
  paymentMethod: "Kapıda Nakit",
  address: { neighborhood: "Örnek Mah.", line: "2. Sk. No:3", district: "Çankaya", city: "Ankara" },
  billing: { type: "individual", name: null, taxOffice: null, sameAsShipping: true, line: null, district: null, city: null },
  carrier: "Örnek Kargo",
  trackingNumber: "TR000111222",
  bankTransfer: null,
};

const LEGAL = { preInformation: "# Ön Bilgilendirme\n\n**Satıcı:** ÖRNEK LTD.\n\n- Madde bir\n- [İade](/iade-ve-cayma)", distanceSales: "# Sözleşme\n\nMadde 1 — Taraflar" };

function allRendered() {
  return [
    renderOrderConfirmation(STORE, ORDER, LEGAL),
    renderStoreNewOrder(STORE, ORDER, { adminOrderUrl: "https://panel.example/o/1", customerPhone: "0555 000 00 00", customerEmail: "ayse@example.com", note: "Zili çalmayın" }),
    renderShipped(STORE, ORDER),
    renderCancelled(STORE, ORDER, { returnNumber: null }),
    renderCancelled(STORE, ORDER, { returnNumber: 7 }),
    ...(["requested", "approved", "rejected", "refunded"] as const).flatMap((event) =>
      (["cancel", "return"] as const).map((requestKind) =>
        renderReturnEmail(STORE, ORDER, { event, requestKind, returnNumber: 7, refundAmount: 1480, returnCode: "IADE1", carrierName: "Örnek Kargo", instructions: "Kutuyu kapatın.", rejectionReason: "Süre doldu" }),
      ),
    ),
    renderTestEmail(STORE, { fromName: "Örnek Mağaza", fromEmail: "siparis@ornek-magaza.example" }),
  ];
}

test("şablonlarda sabit marka adı yok: kaynakta ve çıktıda hiçbir sitenin ifadesi geçmez", () => {
  // Müşteri sitelerinin ifadeleri (panel anahtarı "panel" sıradan bir sözcük olduğu için hariç).
  const tokens = SITES.filter((site) => site.kind !== "panel")
    .flatMap((site) => [...site.leakTokens, site.key])
    .map((token) => token.toLocaleLowerCase("tr-TR"));
  assert.ok(tokens.length > 0);
  const source = readFileSync(new URL("../lib/commerce/order-emails/templates.ts", import.meta.url), "utf8").toLocaleLowerCase("tr-TR");
  for (const token of tokens) assert.equal(source.includes(token), false, `templates.ts içinde "${token}"`);
  for (const email of allRendered()) {
    const output = `${email.subject}\n${email.html}\n${email.text}`.toLocaleLowerCase("tr-TR");
    for (const token of tokens) assert.equal(output.includes(token), false, `çıktıda "${token}"`);
  }
});

test("sipariş onayı: sipariş no, kalemler, tutarlar, adres, sözleşme tam metni; telefon yok", () => {
  const email = renderOrderConfirmation(STORE, ORDER, LEGAL);
  assert.equal(email.subject, "Örnek Mağaza: #1042 numaralı siparişiniz alındı");
  for (const body of [email.html, email.text]) {
    assert.match(body, /#1042/);
    assert.match(body, /Siyah \/ L/);
    assert.match(body, /Ek Parça/);
    assert.match(body, /₺1\.300,00/);
    assert.match(body, /HOSGELDIN/);
    assert.match(body, /₺250,00/);
    assert.match(body, /₺30,00/);
    assert.match(body, /₺1\.480,00/);
    assert.match(body, /Kapıda Nakit/);
    assert.match(body, /Çankaya \/ Ankara/);
    assert.match(body, /Ön Bilgilendirme Formu/i);
    assert.match(body, /Madde 1 — Taraflar/);
    assert.match(body, /https:\/\/ornek-magaza\.example\/siparislerim/);
    assert.match(body, /https:\/\/ornek-magaza\.example\/cayma-formu/);
    assert.match(body, /telefon numarasıyla/);
    assert.doesNotMatch(body, /0555/);
  }
  // HTML'de kullanıcı verisi kaçışlanır; sözleşmedeki göreli bağlantı mağaza adresine çevrilir.
  assert.match(email.html, /Ürün &lt;İki&gt;/);
  assert.doesNotMatch(email.html, /Ürün <İki>/);
  assert.match(email.html, /href="https:\/\/ornek-magaza\.example\/iade-ve-cayma"/);
  assert.match(email.html, /<strong>Satıcı:<\/strong>/);
});

test("sipariş onayı: sözleşme kaydı yoksa metin eklenmez; üye siparişinde telefonla sorgu cümlesi yok", () => {
  const email = renderOrderConfirmation(STORE, { ...ORDER, isGuest: false }, null);
  assert.doesNotMatch(email.text, /MESAFELİ SATIŞ SÖZLEŞMESİ/);
  assert.doesNotMatch(email.text, /telefon numarasıyla/);
  assert.match(email.text, /hesabınızdaki Siparişlerim/);
});

test("uydurma yok: teslimat süresi, kampanya, yorum isteği, ödeme talimatı ifadesi geçmez", () => {
  const banned = /iş günü|yarın|bugün kargoda|stok|son \d+|kampanya|fırsat|indirim kodu kazan|yorum yap|değerlendir|iban|hesap numaras/i;
  for (const email of allRendered()) {
    assert.doesNotMatch(email.text, banned, email.subject);
  }
  const transfer = renderOrderConfirmation(STORE, { ...ORDER, paymentMethod: "Havale-EFT", codFee: 0 }, null);
  assert.doesNotMatch(transfer.text, /iban|hesab[ıi]na|dekont/i);
  assert.doesNotMatch(transfer.html, /iban/i);
});

test("Havale bilgisi yalnız mağaza girmişse onay e-postasında yer alır; başka türlerde yer almaz", () => {
  const withBank = { ...ORDER, paymentMethod: "Havale-EFT", codFee: 0, bankTransfer: { accountHolder: "ÖRNEK LTD. ŞTİ.", bankName: "Örnek Bankası", iban: "TR33 0006 1005 1978 6457 8413 26" } };
  const email = renderOrderConfirmation(STORE, withBank, null);
  for (const body of [email.html, email.text]) {
    assert.match(body, /Hesap sahibi: ÖRNEK LTD\. ŞTİ\./);
    assert.match(body, /Banka: Örnek Bankası/);
    assert.match(body, /IBAN: TR33 0006 1005 1978 6457 8413 26/);
    assert.match(body, /Ödenecek tutar: ₺1\.480,00/);
  }
  const others = [
    renderShipped(STORE, withBank),
    renderCancelled(STORE, withBank, { returnNumber: null }),
    renderStoreNewOrder(STORE, withBank, { adminOrderUrl: null, customerPhone: null, customerEmail: null, note: null }),
  ];
  for (const other of others) {
    assert.doesNotMatch(other.text, /TR33/);
    assert.doesNotMatch(other.html, /TR33/);
  }
});

test("deneme siparişinde konu [TEST] ile başlar", () => {
  const testOrder = { ...ORDER, isTest: true };
  assert.match(renderOrderConfirmation(STORE, testOrder, null).subject, /^\[TEST\] /);
  assert.match(renderStoreNewOrder(STORE, testOrder, { adminOrderUrl: null, customerPhone: null, customerEmail: null, note: null }).subject, /^\[TEST\] /);
  assert.match(renderShipped(STORE, testOrder).subject, /^\[TEST\] /);
  assert.match(renderCancelled(STORE, testOrder, { returnNumber: null }).subject, /^\[TEST\] /);
  assert.doesNotMatch(renderShipped(STORE, ORDER).subject, /TEST/);
});

test("kargo e-postası: firma ve takip numarası var, takip bağlantısı uydurulmaz", () => {
  const email = renderShipped(STORE, ORDER);
  assert.match(email.text, /Kargo firması: Örnek Kargo/);
  assert.match(email.text, /Takip numarası: TR000111222/);
  const links = [...email.html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(links.length > 0);
  for (const link of links) assert.ok(link.startsWith("https://ornek-magaza.example/"), link);
});

test("mağaza bildirimi müşteri iletişimini ve panel bağlantısını içerir", () => {
  const email = renderStoreNewOrder(STORE, ORDER, { adminOrderUrl: "https://panel.example/o/1", customerPhone: "0555 000 00 00", customerEmail: "ayse@example.com", note: "Zili çalmayın" });
  assert.match(email.subject, /^Yeni sipariş #1042 — ₺1\.480,00$/);
  assert.match(email.text, /Telefon: 0555 000 00 00/);
  assert.match(email.text, /Zili çalmayın/);
  assert.match(email.text, /https:\/\/panel\.example\/o\/1/);
});

test("altbilgi satıcı kimliğinden gelir; satıcı kaydı yoksa kimlik satırı yok", () => {
  const withSeller = renderShipped(STORE, ORDER);
  assert.match(withSeller.text, /ÖRNEK LTD\. ŞTİ\./);
  assert.match(withSeller.text, /Vergi no: 1234567890 \(Örnek V\.D\.\)/);
  assert.match(withSeller.text, /KVKK Aydınlatma Metni: https:\/\/ornek-magaza\.example\/kvkk/);
  const without = renderShipped({ ...STORE, seller: null }, ORDER);
  assert.doesNotMatch(without.text, /Vergi no/);
});

test("iptal talebi onayı ve iade metinleri", () => {
  assert.match(renderCancelled(STORE, ORDER, { returnNumber: 7 }).text, /iptal talebiniz onaylandı ve siparişiniz iptal edildi/);
  const approved = renderReturnEmail(STORE, ORDER, { event: "approved", requestKind: "return", returnNumber: 7, refundAmount: null, returnCode: "IADE1", carrierName: "Örnek Kargo", instructions: null, rejectionReason: null });
  assert.match(approved.text, /İade kodu: IADE1/);
  const refunded = renderReturnEmail(STORE, ORDER, { event: "refunded", requestKind: "return", returnNumber: 7, refundAmount: 1480, returnCode: null, carrierName: null, instructions: null, rejectionReason: null });
  assert.match(refunded.subject, /ödemeniz iade edildi/);
  assert.match(refunded.text, /₺1\.480,00 tutarındaki ödemeniz iade edildi/);
});
