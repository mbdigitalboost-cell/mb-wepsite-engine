import { hasFreeShippingOffer, type ShippingFeeSettings } from "../commerce/shipping-fee.ts";
import type { LegalValues } from "./template.ts";

/**
 * Faz 33 — şablon değişkenlerinin değerleri (saf; testli). Tutarlar
 * çağıranın verdiği SUNUCU hesabından gelir (sipariş anında Faz 32
 * quoteCheckout → composeQuote → Faz 31 computeShippingCharges); burada
 * yeniden hesap yok, yalnız biçimlendirme var. Bilinmeyen alan boş döner →
 * şablonda o satır çıkar.
 */

export interface SellerIdentity {
  legalName: string;
  ownerName: string | null;
  taxNumber: string | null;
  taxOffice: string | null;
  mersisNumber: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  kepAddress: string | null;
  etbisInfo: string | null;
  etbisUrl: string | null;
}

export interface LegalReturnInfo {
  enabled: boolean;
  windowDays: number;
  carrierName: string | null;
  code: string | null;
  instructions: string | null;
  address: string | null;
}

export interface LegalStoreContext {
  storeName: string;
  /** Mağazanın kanonik adresi (ör. https://www.t46store.com). */
  siteUrl: string | null;
  seller: SellerIdentity | null;
  shipping: ShippingFeeSettings;
  returns: LegalReturnInfo;
  /** Vitrinde seçilebilen ödeme yöntemleri (sunucu kararı). */
  paymentMethods: readonly string[];
  /** Mağazanın iyzico entegrasyonu aktif mi (kart cümlesi yalnız o zaman). */
  cardPaymentEnabled: boolean;
}

export interface LegalOrderLine {
  name: string;
  variant: string | null;
  addons: string[];
  quantity: number;
  lineTotal: number;
}

export interface LegalOrderContext {
  orderNumber: number | null;
  date: Date;
  buyer: { name: string; phone: string; email: string | null };
  deliveryAddress: string;
  billing: string | null;
  lines: LegalOrderLine[];
  subtotal: number;
  discountAmount: number;
  discountCode: string | null;
  shippingFee: number;
  codFee: number;
  total: number;
  paymentMethod: string;
}

export const MIN_WITHDRAWAL_DAYS = 14;

export function formatTry(value: number): string {
  return value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

export function formatTrDateTime(date: Date): string {
  return date.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "long", timeStyle: "short" });
}

const clean = (value: string | null | undefined) => (value && value.trim() ? value.trim() : null);

function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ve ${items[items.length - 1]}`;
}

export function formatOrderLines(lines: LegalOrderLine[]): string {
  return lines
    .map((line) => {
      const extras = [line.variant, ...line.addons].filter((part): part is string => Boolean(part && part.trim()));
      const label = extras.length > 0 ? `${line.name} (${extras.join(", ")})` : line.name;
      return `- ${label} × ${line.quantity} — ${formatTry(line.lineTotal)}`;
    })
    .join("\n");
}

export function buildLegalValues(store: LegalStoreContext, order?: LegalOrderContext | null, now: Date = new Date()): LegalValues {
  const seller = store.seller;
  const shipping = store.shipping;
  const feeApplies = shipping.shippingFee > 0;
  const values: LegalValues = {
    "satici.unvan": clean(seller?.legalName) ?? store.storeName,
    "satici.yetkili": clean(seller?.ownerName),
    "satici.vergi_no": clean(seller?.taxNumber),
    "satici.vergi_dairesi": clean(seller?.taxOffice),
    "satici.mersis": clean(seller?.mersisNumber),
    "satici.adres": clean(seller?.address),
    "satici.telefon": clean(seller?.phone),
    "satici.eposta": clean(seller?.email),
    "satici.kep": clean(seller?.kepAddress),
    "satici.etbis": clean(seller?.etbisInfo),
    "satici.web": clean(store.siteUrl),
    "magaza.adi": store.storeName,
    "odeme.yontemleri": store.paymentMethods.length > 0 ? joinList(store.paymentMethods) : null,
    "odeme.kart": store.cardPaymentEnabled ? "evet" : null,
    "kargo.ucret": feeApplies ? formatTry(shipping.shippingFee) : null,
    "kargo.ucretsiz_esik": hasFreeShippingOffer(shipping) && shipping.freeShippingThreshold !== null ? formatTry(shipping.freeShippingThreshold) : null,
    "kargo.esik_bazi": shipping.thresholdBasis === "after_discount" ? "indirim sonrası ürün tutarı" : "indirim öncesi ürün tutarı",
    "kargo.kapida_odeme_ucreti": shipping.codFee > 0 ? formatTry(shipping.codFee) : null,
    "iade.sure_gun": String(Math.max(MIN_WITHDRAWAL_DAYS, Math.floor(store.returns.windowDays || MIN_WITHDRAWAL_DAYS))),
    "iade.kargo_firmasi": clean(store.returns.carrierName),
    "iade.kod": clean(store.returns.code),
    "iade.talimat": clean(store.returns.instructions),
    "iade.adres": clean(store.returns.address) ?? clean(seller?.address),
    "iade.cevrimici": store.returns.enabled ? "evet" : null,
    "iade.cevrimdisi": store.returns.enabled ? null : "evet",
    "belge.tarih": formatTrDateTime(order?.date ?? now),
  };

  if (order) {
    values["siparis.no"] = order.orderNumber !== null ? `#${order.orderNumber}` : null;
    values["siparis.tarih"] = formatTrDateTime(order.date);
    values["siparis.urunler"] = order.lines.length > 0 ? formatOrderLines(order.lines) : null;
    values["siparis.ara_toplam"] = formatTry(order.subtotal);
    values["siparis.indirim"] = order.discountAmount > 0 ? formatTry(order.discountAmount) : null;
    values["siparis.indirim_kodu"] = order.discountAmount > 0 ? clean(order.discountCode) : null;
    values["siparis.kargo"] = order.shippingFee > 0 ? formatTry(order.shippingFee) : "Ücretsiz";
    values["siparis.kapida_odeme_ucreti"] = order.codFee > 0 ? formatTry(order.codFee) : null;
    values["siparis.toplam"] = formatTry(order.total);
    values["siparis.odeme_yontemi"] = clean(order.paymentMethod);
    values["siparis.teslimat_adresi"] = clean(order.deliveryAddress);
    values["alici.ad"] = clean(order.buyer.name);
    values["alici.telefon"] = clean(order.buyer.phone);
    values["alici.eposta"] = clean(order.buyer.email);
    values["alici.fatura"] = clean(order.billing);
  }

  return values;
}

/** Admin önizlemesi için örnek sipariş (gerçek veri değil; açıkça "örnek"). */
export function sampleLegalOrder(store: LegalStoreContext, now: Date = new Date()): LegalOrderContext {
  const subtotal = 1900;
  const shippingFee = store.shipping.shippingFee > 0 && (store.shipping.freeShippingThreshold === null || subtotal < store.shipping.freeShippingThreshold) ? store.shipping.shippingFee : 0;
  return {
    orderNumber: 1000,
    date: now,
    buyer: { name: "Örnek Müşteri", phone: "0500 000 00 00", email: "ornek@example.com" },
    deliveryAddress: "Örnek Mahallesi, Örnek Sokak No:1, Örnek İlçe / Örnek İl",
    billing: "Bireysel — Örnek Müşteri",
    lines: [{ name: "Örnek Ürün", variant: "Örnek Seçenek", addons: [], quantity: 1, lineTotal: subtotal }],
    subtotal,
    discountAmount: 0,
    discountCode: null,
    shippingFee,
    codFee: 0,
    total: subtotal + shippingFee,
    paymentMethod: store.paymentMethods[0] ?? "Havale-EFT",
  };
}
