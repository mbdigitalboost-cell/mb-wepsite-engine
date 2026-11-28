import { parseLegalInline, parseLegalMarkdown } from "../../legal/markdown.ts";
import type { RenderedEmail } from "./dispatch.ts";

/**
 * Faz 40 — SİPARİŞ E-POSTASI ŞABLONLARI (saf; yalnız verilen veriden üretir).
 *
 * İÇERİK KURALLARI:
 *  - Bu dosyada HİÇBİR mağazanın adı, ürünü ya da sloganı sabit yazılmaz; her
 *    şey parametreyle gelir (mağaza verisi). `check:isolation` bunu denetler.
 *  - Uydurma yok: teslimat süresi, stok/aciliyet ifadesi, yorum isteği,
 *    kampanya, indirim çağrısı YOK. Sipariş e-postası ticari ileti değildir.
 *  - Tutarlar siparişte kayıtlı anlık değerlerdir; burada yeniden hesap yok.
 *  - Bağlantı yalnız veri gerçekten varsa konur (ör. kargo takip bağlantısı
 *    sistemde tutulmadığı için YOK; yalnız firma adı ve takip numarası yazılır).
 *  - Telefon ve kimlik/vergi numarası müşteri e-postasında yazılmaz.
 */

export interface EmailLink {
  label: string;
  url: string;
}

export interface EmailSeller {
  legalName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  /** Yalnız 10 haneli vergi kimlik numarası (şahıs TCKN'si buraya verilmez). */
  taxNumber: string | null;
  taxOffice: string | null;
  mersisNumber: string | null;
}

export interface EmailStore {
  name: string;
  homeUrl: string;
  /** Mutlak https adresi; yoksa mağaza adı yazıyla gösterilir. */
  logoUrl: string | null;
  /**
   * Başlık şeridinin arka plan rengi (#rgb ya da #rrggbb), mağaza verisinden.
   * Yoksa ya da geçersizse nötr koyu renk kullanılır; şablonda mağazaya özel
   * sabit renk yoktur.
   */
  headerBackground?: string | null;
  /** "Siparişlerim" sayfasının mutlak adresi. */
  ordersUrl: string;
  /** Yayınlanmış yasal sayfaların bağlantıları (altbilgi). */
  legalLinks: EmailLink[];
  /** İade ve cayma koşulları sayfası; yayınlanmamışsa null. */
  returnsPolicyUrl: string | null;
  /** Cayma formu sayfası; yayınlanmamışsa null. */
  withdrawalFormUrl: string | null;
  seller: EmailSeller | null;
}

export interface EmailOrderItem {
  name: string;
  variantLabel: string | null;
  addons: Array<{ name: string; priceDelta: number }>;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface EmailOrder {
  orderNumber: number;
  createdAt: string;
  isTest: boolean;
  /** Üye olmadan verilen sipariş (sipariş numarası + telefonla sorgulanır). */
  isGuest: boolean;
  customerName: string;
  items: EmailOrderItem[];
  subtotal: number;
  discountAmount: number;
  discountCode: string | null;
  shippingFee: number;
  codFee: number;
  total: number;
  paymentMethod: string | null;
  address: { neighborhood: string | null; line: string; district: string; city: string };
  billing: {
    type: "individual" | "corporate";
    name: string | null;
    taxOffice: string | null;
    sameAsShipping: boolean;
    line: string | null;
    district: string | null;
    city: string | null;
  };
  carrier: string | null;
  trackingNumber: string | null;
  /**
   * Ödenmemiş Havale/EFT siparişinde mağazanın kendi girdiği hesap bilgileri
   * (IBAN dörderli gruplarla biçimlenmiş); mağaza girmemişse null — o zaman
   * e-postada ödeme talimatı YER ALMAZ (uydurma talimat yok).
   */
  bankTransfer: { accountHolder: string; bankName: string; iban: string } | null;
}

export interface EmailLegalTexts {
  preInformation: string;
  distanceSales: string;
}

// ---------------------------------------------------------------------------
// Biçimlendirme
// ---------------------------------------------------------------------------

export function formatMoney(value: number): string {
  return value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "long", timeStyle: "short" });
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const esc = escapeHtml;

/** Deneme siparişlerinde konunun başına [TEST] eklenir. */
export function emailSubject(subject: string, isTest: boolean): string {
  return isTest ? `[TEST] ${subject}` : subject;
}

function addressLines(address: { neighborhood?: string | null; line: string | null; district: string | null; city: string | null }): string[] {
  const first = [address.neighborhood, address.line].filter((part): part is string => Boolean(part && part.trim())).join(", ");
  const second = [address.district, address.city].filter((part): part is string => Boolean(part && part.trim())).join(" / ");
  return [first, second].filter(Boolean);
}

function itemLabel(item: EmailOrderItem): string {
  return item.variantLabel ? `${item.name} (${item.variantLabel})` : item.name;
}

// ---------------------------------------------------------------------------
// Ortak parçalar (HTML + düz metin)
// ---------------------------------------------------------------------------

const STYLE = {
  body: "margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;",
  card: "max-width:600px;margin:0 auto;background:#ffffff;",
  content: "padding:24px;background:#ffffff;",
  h1: "margin:0 0 12px;font-size:20px;line-height:1.3;color:#18181b;",
  h2: "margin:24px 0 8px;font-size:15px;line-height:1.3;color:#18181b;",
  p: "margin:0 0 10px;font-size:14px;line-height:1.5;color:#27272a;",
  muted: "margin:0 0 6px;font-size:12px;line-height:1.5;color:#71717a;",
  cell: "padding:6px 0;font-size:14px;line-height:1.4;color:#27272a;vertical-align:top;",
  link: "color:#18181b;text-decoration:underline;",
};

function sellerLines(seller: EmailSeller | null): string[] {
  if (!seller) return [];
  const lines = [seller.legalName];
  if (seller.address) lines.push(seller.address);
  const contact = [seller.phone, seller.email].filter((part): part is string => Boolean(part));
  if (contact.length > 0) lines.push(contact.join(" · "));
  if (seller.taxNumber) lines.push(`Vergi no: ${seller.taxNumber}${seller.taxOffice ? ` (${seller.taxOffice} V.D.)` : ""}`);
  if (seller.mersisNumber) lines.push(`MERSİS no: ${seller.mersisNumber}`);
  return lines;
}

/** Mağaza rengi verilmemişse başlık şeridinde kullanılan nötr koyu renk. */
export const NEUTRAL_HEADER_BACKGROUND = "#18181b";

/**
 * Başlık şeridinin renkleri. Arka plan mağaza verisinden gelir (geçerli bir
 * hex değilse nötr koyu renk); yazı rengi arka plana göre seçilir ki logo
 * yüklenmediğinde alt metin (mağaza adı) okunabilsin.
 */
export function resolveHeaderBand(color: string | null | undefined): { background: string; foreground: string } {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((color ?? "").trim());
  if (!match) return { background: NEUTRAL_HEADER_BACKGROUND, foreground: "#ffffff" };
  const hex = (match[1].length === 3 ? match[1].replace(/./g, "$&$&") : match[1]).toLowerCase();
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  // WCAG karşıtlığı: beyaz yazı mı koyu yazı mı daha okunaklı?
  const whiteContrast = 1.05 / (luminance + 0.05);
  const darkContrast = (luminance + 0.05) / 0.0601;
  return { background: `#${hex}`, foreground: whiteContrast >= darkContrast ? "#ffffff" : "#18181b" };
}

/**
 * Bütün e-posta türlerinin ortak başlığı: koyu şerit üzerinde logo (48 px).
 * Şerit bir tablo hücresidir; renk hem `bgcolor` özniteliğiyle hem `style`
 * ile verilir (Outlook `style` arka planını yok sayabilir). Logo açık renkli
 * ve saydam olabildiği için beyaz zeminde görünmüyordu.
 */
function headerHtml(store: EmailStore): string {
  const band = resolveHeaderBand(store.headerBackground);
  const text = `font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:24px;font-weight:bold;color:${band.foreground};`;
  const inner = store.logoUrl
    ? `<a href="${esc(store.homeUrl)}" style="${text}text-decoration:none;"><img src="${esc(store.logoUrl)}" alt="${esc(store.name)}" height="48" style="height:48px;width:auto;border:0;outline:none;display:block;${text}"></a>`
    : `<a href="${esc(store.homeUrl)}" style="${text}text-decoration:none;">${esc(store.name)}</a>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td bgcolor="${band.background}" style="background:${band.background};background-color:${band.background};padding:16px 24px;">${inner}</td></tr></table>`;
}

function layout(store: EmailStore, title: string, bodyHtml: string, note: string): string {
  const seller = sellerLines(store.seller)
    .map((line) => `<p style="${STYLE.muted}">${esc(line)}</p>`)
    .join("");
  const links = store.legalLinks.map((link) => `<a href="${esc(link.url)}" style="color:#71717a;text-decoration:underline;">${esc(link.label)}</a>`).join(" · ");
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title></head><body style="${STYLE.body}"><div style="${STYLE.card}">${headerHtml(store)}<div style="${STYLE.content}">${bodyHtml}<div style="margin-top:28px;padding-top:16px;border-top:1px solid #e4e4e7;">${seller}${links ? `<p style="${STYLE.muted}">${links}</p>` : ""}<p style="${STYLE.muted}">${esc(note)}</p></div></div></div></body></html>`;
}

function footerText(store: EmailStore, note: string): string {
  const lines = ["", "--", ...sellerLines(store.seller)];
  for (const link of store.legalLinks) lines.push(`${link.label}: ${link.url}`);
  lines.push(note);
  return lines.join("\n");
}

const CUSTOMER_NOTE = "Bu e-posta, siparişinizle ilgili bilgilendirme amacıyla gönderilmiştir.";
const STORE_NOTE = "Bu e-posta, mağazanıza gelen sipariş hakkında bilgilendirme amacıyla gönderilmiştir.";

function p(text: string): string {
  return `<p style="${STYLE.p}">${esc(text)}</p>`;
}

function h2(text: string): string {
  return `<h2 style="${STYLE.h2}">${esc(text)}</h2>`;
}

function linkP(label: string, url: string): string {
  return `<p style="${STYLE.p}"><a href="${esc(url)}" style="${STYLE.link}">${esc(label)}</a></p>`;
}

function itemsHtml(order: EmailOrder): string {
  const rows = order.items
    .map((item) => {
      const addons = item.addons
        .map((addon) => `<div style="font-size:12px;color:#71717a;">+ ${esc(addon.name)}${addon.priceDelta ? ` (${esc(formatMoney(addon.priceDelta))})` : ""}</div>`)
        .join("");
      return `<tr><td style="${STYLE.cell}border-bottom:1px solid #f4f4f5;">${esc(itemLabel(item))}${addons}<div style="font-size:12px;color:#71717a;">${item.quantity} adet × ${esc(formatMoney(item.unitPrice))}</div></td><td style="${STYLE.cell}border-bottom:1px solid #f4f4f5;text-align:right;white-space:nowrap;">${esc(formatMoney(item.lineTotal))}</td></tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>`;
}

function totalsRows(order: EmailOrder): Array<[string, string, boolean]> {
  const rows: Array<[string, string, boolean]> = [["Ürünler ara toplamı", formatMoney(order.subtotal), false]];
  if (order.discountAmount > 0) rows.push([order.discountCode ? `İndirim (${order.discountCode})` : "İndirim", `-${formatMoney(order.discountAmount)}`, false]);
  rows.push(["Kargo ücreti", formatMoney(order.shippingFee), false]);
  if (order.codFee > 0) rows.push(["Kapıda ödeme ücreti", formatMoney(order.codFee), false]);
  rows.push(["Genel toplam", formatMoney(order.total), true]);
  return rows;
}

function totalsHtml(order: EmailOrder): string {
  const rows = totalsRows(order)
    .map(([label, value, strong]) => {
      const weight = strong ? "font-weight:bold;" : "";
      return `<tr><td style="${STYLE.cell}${weight}">${esc(label)}</td><td style="${STYLE.cell}${weight}text-align:right;white-space:nowrap;">${esc(value)}</td></tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:8px;">${rows}</table>`;
}

function itemsText(order: EmailOrder): string[] {
  const lines: string[] = [];
  for (const item of order.items) {
    lines.push(`- ${itemLabel(item)} — ${item.quantity} adet × ${formatMoney(item.unitPrice)} = ${formatMoney(item.lineTotal)}`);
    for (const addon of item.addons) lines.push(`    + ${addon.name}${addon.priceDelta ? ` (${formatMoney(addon.priceDelta)})` : ""}`);
  }
  return lines;
}

function totalsText(order: EmailOrder): string[] {
  return totalsRows(order).map(([label, value]) => `${label}: ${value}`);
}

function billingLines(order: EmailOrder): string[] {
  const lines = [order.billing.type === "corporate" ? "Kurumsal fatura" : "Bireysel fatura"];
  if (order.billing.name) lines.push(order.billing.name);
  if (order.billing.type === "corporate" && order.billing.taxOffice) lines.push(`Vergi dairesi: ${order.billing.taxOffice}`);
  if (order.billing.sameAsShipping) lines.push("Fatura adresi teslimat adresiyle aynı.");
  else lines.push(...addressLines({ line: order.billing.line, district: order.billing.district, city: order.billing.city }));
  return lines;
}

function linesHtml(lines: string[]): string {
  return `<p style="${STYLE.p}">${lines.map(esc).join("<br>")}</p>`;
}

/** Yasal metin (Faz 33 anlık görüntüsü, markdown) → e-posta HTML'i. Göreli bağlantılar mağaza adresine çevrilir. */
export function legalTextToHtml(source: string, homeUrl: string): string {
  const origin = homeUrl.replace(/\/+$/, "");
  const inline = (text: string) =>
    parseLegalInline(text)
      .map((part) => {
        if (part.type === "bold") return `<strong>${esc(part.text)}</strong>`;
        if (part.type === "link") {
          const href = part.href.startsWith("/") ? `${origin}${part.href}` : part.href;
          return `<a href="${esc(href)}" style="${STYLE.link}">${esc(part.text)}</a>`;
        }
        return esc(part.text);
      })
      .join("");
  const small = "font-size:12px;line-height:1.5;color:#3f3f46;";
  return parseLegalMarkdown(source)
    .map((block) => {
      if (block.type === "heading") return `<p style="margin:14px 0 6px;font-size:13px;font-weight:bold;color:#18181b;">${inline(block.text)}</p>`;
      if (block.type === "list") return `<ul style="margin:0 0 8px;padding-left:18px;${small}">${block.items.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`;
      if (block.type === "hr") return `<hr style="border:0;border-top:1px solid #e4e4e7;margin:12px 0;">`;
      return `<p style="margin:0 0 8px;${small}">${block.lines.map(inline).join("<br>")}</p>`;
    })
    .join("");
}

/**
 * Yasal metin (Faz 33 anlık görüntüsü, markdown) → e-postanın DÜZ METİN
 * sürümü. Anlık görüntünün kendisi değişmez; yalnız e-postaya dönüştürülür:
 * başlık (#) ve kalın (**) işaretleri kaldırılır, bağlantılar mutlak adresle
 * "metin (https://…)" biçiminde yazılır (göreli yol mağaza adresine çevrilir).
 */
export function legalTextToPlain(source: string, homeUrl: string): string {
  const origin = homeUrl.replace(/\/+$/, "");
  const inline = (text: string) =>
    parseLegalInline(text)
      .map((part) => {
        if (part.type !== "link") return part.text;
        const href = part.href.startsWith("/") ? `${origin}${part.href}` : part.href.replace(/^(mailto|tel):/, "");
        return href === part.text.trim() ? part.text : `${part.text} (${href})`;
      })
      .join("");
  const blocks = parseLegalMarkdown(source).map((block) => {
    if (block.type === "heading") return inline(block.text);
    if (block.type === "list") return block.items.map((item) => `- ${inline(item)}`).join("\n");
    if (block.type === "hr") return "----------";
    return block.lines.map(inline).join("\n");
  });
  return blocks.join("\n\n");
}

// ---------------------------------------------------------------------------
// Türler
// ---------------------------------------------------------------------------

/**
 * Sipariş onayı (müşteri). Sonuna, sipariş anında kabul edilen Ön Bilgilendirme
 * Formu ve Mesafeli Satış Sözleşmesi'nin TAM METNİ eklenir (kalıcı veri
 * saklayıcısıyla iletim; ek dosya değil, e-posta gövdesi — ekler bazı
 * sağlayıcılarda engellenebildiği için gövde tercih edildi).
 */
export function renderOrderConfirmation(store: EmailStore, order: EmailOrder, legal: EmailLegalTexts | null): RenderedEmail {
  const subject = emailSubject(`${store.name}: #${order.orderNumber} numaralı siparişiniz alındı`, order.isTest);
  const lookup = order.isGuest
    ? "Siparişinizin durumunu, sipariş numaranız ve siparişte verdiğiniz telefon numarasıyla Siparişlerim sayfasından sorgulayabilirsiniz."
    : "Siparişinizin durumunu hesabınızdaki Siparişlerim sayfasından takip edebilirsiniz.";
  const shipping = addressLines(order.address);
  const billing = billingLines(order);

  const html: string[] = [
    `<h1 style="${STYLE.h1}">Siparişiniz alındı</h1>`,
    p(`Sayın ${order.customerName}, siparişiniz bize ulaştı.`),
    linesHtml([`Sipariş no: #${order.orderNumber}`, `Tarih: ${formatDateTime(order.createdAt)}`]),
    h2("Sipariş içeriği"),
    itemsHtml(order),
    totalsHtml(order),
  ];
  const text: string[] = [
    "Siparişiniz alındı",
    "",
    `Sayın ${order.customerName}, siparişiniz bize ulaştı.`,
    "",
    `Sipariş no: #${order.orderNumber}`,
    `Tarih: ${formatDateTime(order.createdAt)}`,
    "",
    "SİPARİŞ İÇERİĞİ",
    ...itemsText(order),
    "",
    ...totalsText(order),
  ];

  if (order.paymentMethod) {
    html.push(h2("Ödeme yöntemi"), p(order.paymentMethod));
    text.push("", `Ödeme yöntemi: ${order.paymentMethod}`);
  }
  if (order.bankTransfer) {
    const bank = [
      `Hesap sahibi: ${order.bankTransfer.accountHolder}`,
      `Banka: ${order.bankTransfer.bankName}`,
      `IBAN: ${order.bankTransfer.iban}`,
      `Ödenecek tutar: ${formatMoney(order.total)}`,
      `Sipariş no: #${order.orderNumber}`,
    ];
    html.push(h2("Havale / EFT bilgileri"), linesHtml(bank));
    text.push("", "HAVALE / EFT BİLGİLERİ", ...bank);
  }
  html.push(h2("Teslimat adresi"), linesHtml([order.customerName, ...shipping]));
  text.push("", "TESLİMAT ADRESİ", order.customerName, ...shipping);
  html.push(h2("Fatura bilgileri"), linesHtml(billing));
  text.push("", "FATURA BİLGİLERİ", ...billing);

  html.push(h2("Sipariş takibi"), p(lookup), linkP("Siparişlerim", store.ordersUrl));
  text.push("", "SİPARİŞ TAKİBİ", lookup, `Siparişlerim: ${store.ordersUrl}`);

  if (store.returnsPolicyUrl || store.withdrawalFormUrl) {
    html.push(h2("Cayma hakkı ve iade"));
    text.push("", "CAYMA HAKKI VE İADE");
    html.push(p("Cayma hakkınıza ve iade koşullarına ilişkin bilgiler aşağıdaki sayfalarda ve bu e-postanın sonundaki sözleşme metninde yer alır."));
    text.push("Cayma hakkınıza ve iade koşullarına ilişkin bilgiler aşağıdaki sayfalarda ve bu e-postanın sonundaki sözleşme metninde yer alır.");
    if (store.returnsPolicyUrl) {
      html.push(linkP("İade ve Cayma Koşulları", store.returnsPolicyUrl));
      text.push(`İade ve Cayma Koşulları: ${store.returnsPolicyUrl}`);
    }
    if (store.withdrawalFormUrl) {
      html.push(linkP("Cayma Formu", store.withdrawalFormUrl));
      text.push(`Cayma Formu: ${store.withdrawalFormUrl}`);
    }
  }

  if (legal) {
    html.push(
      `<div style="margin-top:28px;padding-top:16px;border-top:2px solid #18181b;">`,
      p("Aşağıda, siparişinizi verirken onayladığınız Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi'nin sipariş bilgilerinizle doldurulmuş tam metni yer almaktadır. Lütfen bu e-postayı saklayınız."),
      h2("Ön Bilgilendirme Formu"),
      legalTextToHtml(legal.preInformation, store.homeUrl),
      h2("Mesafeli Satış Sözleşmesi"),
      legalTextToHtml(legal.distanceSales, store.homeUrl),
      `</div>`,
    );
    text.push(
      "",
      "==================================================",
      "Aşağıda, siparişinizi verirken onayladığınız Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi'nin sipariş bilgilerinizle doldurulmuş tam metni yer almaktadır. Lütfen bu e-postayı saklayınız.",
      "",
      "ÖN BİLGİLENDİRME FORMU",
      "",
      legalTextToPlain(legal.preInformation, store.homeUrl),
      "",
      "--------------------------------------------------",
      "MESAFELİ SATIŞ SÖZLEŞMESİ",
      "",
      legalTextToPlain(legal.distanceSales, store.homeUrl),
    );
  }

  return { subject, html: layout(store, subject, html.join(""), CUSTOMER_NOTE), text: text.join("\n") + footerText(store, CUSTOMER_NOTE) };
}

/** Mağazaya "yeni sipariş" bildirimi. Alıcı mağazanın kendisidir; müşteri iletişim bilgisi sipariş işlemek için yer alır. */
export function renderStoreNewOrder(
  store: EmailStore,
  order: EmailOrder,
  extra: { adminOrderUrl: string | null; customerPhone: string | null; customerEmail: string | null; note: string | null },
): RenderedEmail {
  const subject = emailSubject(`Yeni sipariş #${order.orderNumber} — ${formatMoney(order.total)}`, order.isTest);
  const shipping = addressLines(order.address);
  const contact = [order.customerName, extra.customerPhone ? `Telefon: ${extra.customerPhone}` : null, extra.customerEmail ? `E-posta: ${extra.customerEmail}` : null].filter(
    (line): line is string => Boolean(line),
  );

  const html: string[] = [
    `<h1 style="${STYLE.h1}">Yeni sipariş #${order.orderNumber}</h1>`,
    linesHtml([`Tarih: ${formatDateTime(order.createdAt)}`, order.paymentMethod ? `Ödeme yöntemi: ${order.paymentMethod}` : "Ödeme yöntemi: belirtilmedi"]),
    h2("Sipariş içeriği"),
    itemsHtml(order),
    totalsHtml(order),
    h2("Müşteri"),
    linesHtml(contact),
    h2("Teslimat adresi"),
    linesHtml(shipping),
  ];
  const text: string[] = [
    `Yeni sipariş #${order.orderNumber}`,
    "",
    `Tarih: ${formatDateTime(order.createdAt)}`,
    order.paymentMethod ? `Ödeme yöntemi: ${order.paymentMethod}` : "Ödeme yöntemi: belirtilmedi",
    "",
    "SİPARİŞ İÇERİĞİ",
    ...itemsText(order),
    "",
    ...totalsText(order),
    "",
    "MÜŞTERİ",
    ...contact,
    "",
    "TESLİMAT ADRESİ",
    ...shipping,
  ];
  if (extra.note) {
    html.push(h2("Müşteri notu"), p(extra.note));
    text.push("", "MÜŞTERİ NOTU", extra.note);
  }
  if (extra.adminOrderUrl) {
    html.push(linkP("Siparişi panelde aç", extra.adminOrderUrl));
    text.push("", `Siparişi panelde aç: ${extra.adminOrderUrl}`);
  }
  return { subject, html: layout(store, subject, html.join(""), STORE_NOTE), text: text.join("\n") + footerText(store, STORE_NOTE) };
}

/** Kargoya verildi (müşteri). Takip bağlantısı sistemde tutulmadığı için yalnız firma ve takip numarası yazılır. */
export function renderShipped(store: EmailStore, order: EmailOrder): RenderedEmail {
  const subject = emailSubject(`${store.name}: #${order.orderNumber} numaralı siparişiniz kargoya verildi`, order.isTest);
  const details = [`Sipariş no: #${order.orderNumber}`];
  if (order.carrier) details.push(`Kargo firması: ${order.carrier}`);
  if (order.trackingNumber) details.push(`Takip numarası: ${order.trackingNumber}`);
  const shipping = addressLines(order.address);

  const html = [
    `<h1 style="${STYLE.h1}">Siparişiniz kargoya verildi</h1>`,
    p(`Sayın ${order.customerName}, siparişiniz kargoya teslim edildi.`),
    linesHtml(details),
    h2("Teslimat adresi"),
    linesHtml([order.customerName, ...shipping]),
    h2("Sipariş içeriği"),
    itemsHtml(order),
    linkP("Siparişlerim", store.ordersUrl),
  ];
  const text = [
    "Siparişiniz kargoya verildi",
    "",
    `Sayın ${order.customerName}, siparişiniz kargoya teslim edildi.`,
    "",
    ...details,
    "",
    "TESLİMAT ADRESİ",
    order.customerName,
    ...shipping,
    "",
    "SİPARİŞ İÇERİĞİ",
    ...itemsText(order),
    "",
    `Siparişlerim: ${store.ordersUrl}`,
  ];
  return { subject, html: layout(store, subject, html.join(""), CUSTOMER_NOTE), text: text.join("\n") + footerText(store, CUSTOMER_NOTE) };
}

/** Sipariş iptal edildi (müşteri). Ödeme iadesi hakkında vaat verilmez; iade yapılınca ayrı e-posta gider. */
export function renderCancelled(store: EmailStore, order: EmailOrder, extra: { returnNumber: number | null }): RenderedEmail {
  const subject = emailSubject(`${store.name}: #${order.orderNumber} numaralı siparişiniz iptal edildi`, order.isTest);
  const details = [`Sipariş no: #${order.orderNumber}`];
  if (extra.returnNumber !== null) details.push(`Talep no: #${extra.returnNumber}`);
  const lead = extra.returnNumber !== null ? "İptal talebiniz onaylandı ve siparişiniz iptal edildi." : "Siparişiniz iptal edildi.";

  const html = [
    `<h1 style="${STYLE.h1}">Siparişiniz iptal edildi</h1>`,
    p(`Sayın ${order.customerName}, ${lead.charAt(0).toLocaleLowerCase("tr-TR")}${lead.slice(1)}`),
    linesHtml(details),
    h2("Sipariş içeriği"),
    itemsHtml(order),
    totalsHtml(order),
    linkP("Siparişlerim", store.ordersUrl),
  ];
  const text = [
    "Siparişiniz iptal edildi",
    "",
    `Sayın ${order.customerName}, ${lead.charAt(0).toLocaleLowerCase("tr-TR")}${lead.slice(1)}`,
    "",
    ...details,
    "",
    "SİPARİŞ İÇERİĞİ",
    ...itemsText(order),
    "",
    ...totalsText(order),
    "",
    `Siparişlerim: ${store.ordersUrl}`,
  ];
  return { subject, html: layout(store, subject, html.join(""), CUSTOMER_NOTE), text: text.join("\n") + footerText(store, CUSTOMER_NOTE) };
}

export type ReturnEmailEvent = "requested" | "approved" | "rejected" | "refunded";

export interface ReturnEmailDetails {
  event: ReturnEmailEvent;
  /** "cancel" = iptal talebi, "return" = iade talebi. */
  requestKind: "cancel" | "return";
  returnNumber: number;
  refundAmount: number | null;
  returnCode: string | null;
  carrierName: string | null;
  instructions: string | null;
  rejectionReason: string | null;
}

/** İptal/iade talebi e-postaları (Faz 30 metinleri; mağaza ayarındaki gönderenle ve kayıtla). */
export function renderReturnEmail(store: EmailStore, order: { orderNumber: number; isTest: boolean; customerName: string }, details: ReturnEmailDetails): RenderedEmail {
  const Noun = details.requestKind === "cancel" ? "İptal" : "İade";
  const ref = [`Sipariş no: #${order.orderNumber}`, `Talep no: #${details.returnNumber}`];
  let title = "";
  const lines: string[] = [];

  switch (details.event) {
    case "requested":
      title = `${Noun} talebiniz bize ulaştı`;
      lines.push(`${Noun} talebiniz bize ulaştı. İnceleyip size bilgi vereceğiz.`);
      break;
    case "approved":
      title = `${Noun} talebiniz onaylandı`;
      lines.push(`${Noun} talebiniz onaylandı.`);
      if (details.requestKind === "return") {
        if (details.carrierName) lines.push(`Kargo firması: ${details.carrierName}`);
        if (details.returnCode) lines.push(`İade kodu: ${details.returnCode}`);
        if (details.instructions) lines.push(details.instructions);
        lines.push("Ürünü kargoya verdikten sonra sipariş sayfanızdan \"Kargoya teslim ettim\" butonuna basın.");
      }
      break;
    case "rejected":
      title = `${Noun} talebiniz hakkında`;
      lines.push(`${Noun} talebiniz onaylanmadı.`);
      if (details.rejectionReason) lines.push(`Gerekçe: ${details.rejectionReason}`);
      break;
    case "refunded":
      title = "Ödemeniz iade edildi";
      lines.push(`${formatMoney(details.refundAmount ?? 0)} tutarındaki ödemeniz iade edildi. Tutarın hesabınıza yansıma süresi bankanıza göre değişebilir.`);
      break;
  }

  const subject = emailSubject(`${store.name}: ${title.charAt(0).toLocaleLowerCase("tr-TR")}${title.slice(1)}`, order.isTest);
  const html = [`<h1 style="${STYLE.h1}">${esc(title)}</h1>`, linesHtml(ref), ...lines.map((line) => linesHtml(line.split("\n"))), linkP("Siparişlerim", store.ordersUrl)];
  const text = [title, "", ...ref, "", ...lines, "", `Siparişlerim: ${store.ordersUrl}`];
  return { subject, html: layout(store, subject, html.join(""), CUSTOMER_NOTE), text: text.join("\n") + footerText(store, CUSTOMER_NOTE) };
}

/** Admin'in "Bana test e-postası gönder" düğmesi. */
export function renderTestEmail(store: EmailStore, sender: { fromName: string; fromEmail: string }): RenderedEmail {
  const subject = `${store.name}: test e-postası`;
  const message = "Bu bir test e-postasıdır. Mağazanızın e-posta ayarı çalışıyor.";
  const details = [`Gönderen adı: ${sender.fromName}`, `Gönderen adresi: ${sender.fromEmail}`];
  const note = "Bu e-posta, yönetim panelindeki test düğmesiyle gönderilmiştir.";
  const html = [`<h1 style="${STYLE.h1}">Test e-postası</h1>`, p(message), linesHtml(details)];
  const text = ["Test e-postası", "", message, "", ...details];
  return { subject, html: layout(store, subject, html.join(""), note), text: text.join("\n") + footerText(store, note) };
}
