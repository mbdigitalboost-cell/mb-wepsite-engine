/**
 * Faz 31 — KARGO ÜCRETİ ve SİPARİŞ TOPLAMI (tek modül; saf, testli:
 * tests/shipping-fee.test.ts). Sunucu (sipariş oluşturma, iyzico, Basit
 * Kargo, iade, rapor) ve vitrin (sepet, duyuru şeridi, ürün sayfası) aynı
 * fonksiyonları kullanır. Ücret HER ZAMAN sunucuda hesaplanır; istemcideki
 * hesap yalnız gösterim içindir.
 *
 * Kurallar:
 *  - Ücretsiz kargo: sınırın baktığı tutar (varsayılan İNDİRİM ÖNCESİ ürün
 *    tutarı) ≥ sınır → kargo 0; değilse shipping_fee. Sınır null → her zaman
 *    ücret. Kullanıcı kararı (2026-11-16): "2.100 TL alışverişte indirim kodu
 *    tutarı 1.900'e düşürse bile kargo ücretsiz; 1.900 TL'de 250 TL kargo."
 *  - Kapıda ödeme (Kapıda Nakit / Kapıda Kart) → cod_fee; diğerleri 0.
 *  - Toplam = ürünler − indirim + kargo + kapıda ödeme ücreti (kuruş, 2 hane).
 *  - İndirim kodunun minimum sepet tutarı ürün tutarına bakar (kargo dahil
 *    değil) — lib/commerce/discounts.ts değişmedi.
 */

export type ThresholdBasis = "before_discount" | "after_discount";

export interface ShippingFeeSettings {
  shippingFee: number;
  /** null = hiçbir tutarda ücretsiz kargo yok. */
  freeShippingThreshold: number | null;
  thresholdBasis: ThresholdBasis;
  codFee: number;
}

/** Mağazanın ayar satırı yoksa: ücret YOK ve "ücretsiz kargo" iddiası da yok (eski davranış). */
export const NO_SHIPPING_FEE_SETTINGS: ShippingFeeSettings = {
  shippingFee: 0,
  freeShippingThreshold: null,
  thresholdBasis: "before_discount",
  codFee: 0,
};

export const CASH_ON_DELIVERY_METHODS = ["Kapıda Nakit", "Kapıda Kart"] as const;

export function isCashOnDeliveryMethod(method: string | null | undefined): boolean {
  return (CASH_ON_DELIVERY_METHODS as readonly string[]).includes(method ?? "");
}

const k = (value: number) => Math.round(Number(value || 0) * 100);
const tl = (kurus: number) => kurus / 100;

export interface ShippingCharges {
  shippingFee: number;
  codFee: number;
  freeShipping: boolean;
  /** Ücretsiz kargoya kalan tutar (sınır yoksa ya da zaten ücretsizse null). */
  amountToFreeShipping: number | null;
  /** Ürünler − indirim + kargo + kapıda ödeme ücreti. */
  grandTotal: number;
}

export function computeShippingCharges(input: {
  itemsTotal: number;
  discountAmount: number;
  paymentMethod: string | null | undefined;
  settings: ShippingFeeSettings;
}): ShippingCharges {
  const items = k(input.itemsTotal);
  const discount = Math.min(k(input.discountAmount), items);
  const basisAmount = input.settings.thresholdBasis === "after_discount" ? items - discount : items;
  const threshold = input.settings.freeShippingThreshold === null ? null : k(input.settings.freeShippingThreshold);
  const fee = k(input.settings.shippingFee);

  const freeShipping = fee === 0 || (threshold !== null && basisAmount >= threshold);
  const shipping = freeShipping ? 0 : fee;
  const cod = isCashOnDeliveryMethod(input.paymentMethod) ? k(input.settings.codFee) : 0;
  const amountToFreeShipping = !freeShipping && threshold !== null ? tl(threshold - basisAmount) : null;

  return {
    shippingFee: tl(shipping),
    codFee: tl(cod),
    freeShipping,
    amountToFreeShipping,
    grandTotal: tl(items - discount + shipping + cod),
  };
}

/** Kayıtlı bir siparişin müşteriden alınan toplamı (tek tanım). Faz 31 öncesi siparişlerde ücretler 0. */
export function orderGrandTotal(order: {
  subtotal: number | string;
  discount_amount?: number | string | null;
  shipping_fee?: number | string | null;
  cod_fee?: number | string | null;
}): number {
  const items = k(Number(order.subtotal));
  const discount = Math.min(k(Number(order.discount_amount ?? 0)), items);
  return tl(items - discount + k(Number(order.shipping_fee ?? 0)) + k(Number(order.cod_fee ?? 0)));
}

/** Vitrinde "ücretsiz kargo" iddiası gösterilebilir mi? (sınır var VE gerçekten ücret alınıyor) */
export function hasFreeShippingOffer(settings: ShippingFeeSettings): boolean {
  return settings.freeShippingThreshold !== null && settings.shippingFee > 0;
}

function formatTlShort(value: number): string {
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Duyuru şeridi / güven rozeti metni; iddia yoksa null (gösterilmez). Ör. "2.000 TL Üzeri Ücretsiz Kargo". */
export function freeShippingClaim(settings: ShippingFeeSettings): string | null {
  if (!hasFreeShippingOffer(settings) || settings.freeShippingThreshold === null) return null;
  return `${formatTlShort(settings.freeShippingThreshold)} TL Üzeri Ücretsiz Kargo`;
}

/** Ürün sayfası: bu ürün tek başına ücretsiz kargo sınırını geçiyor mu? */
export function productQualifiesForFreeShipping(unitPrice: number, settings: ShippingFeeSettings): boolean {
  return hasFreeShippingOffer(settings) && settings.freeShippingThreshold !== null && k(unitPrice) >= k(settings.freeShippingThreshold);
}

/**
 * Faz 34 — "Ücretsiz kargoya ₺X kaldı" teşviki (sepet, sepete ekleme geri
 * bildirimi). computeShippingCharges ile AYNI hesap (eşik varsayılan olarak
 * indirim ÖNCESİ ürün tutarına bakar). Sınır yoksa ya da ücret alınmıyorsa
 * `show: false` — hiçbir teşvik metni gösterilmez. Sepette indirim henüz
 * bilinmez; "indirim sonrası" bazlı mağazada gösterilen kalan tutar indirim
 * öncesine göredir (ödeme adımındaki sunucu özeti kesin olanı gösterir).
 */
export interface FreeShippingProgress {
  show: boolean;
  reached: boolean;
  /** Kalan tutar (TL); ulaşıldıysa 0. */
  remaining: number;
  /** 0–1 arası doluluk. */
  ratio: number;
  threshold: number;
}

export function freeShippingProgress(itemsTotal: number, settings: ShippingFeeSettings): FreeShippingProgress {
  if (!hasFreeShippingOffer(settings) || settings.freeShippingThreshold === null || settings.freeShippingThreshold <= 0) {
    return { show: false, reached: false, remaining: 0, ratio: 0, threshold: 0 };
  }
  const charges = computeShippingCharges({ itemsTotal, discountAmount: 0, paymentMethod: null, settings });
  const threshold = settings.freeShippingThreshold;
  const remaining = charges.amountToFreeShipping ?? 0;
  return {
    show: true,
    reached: charges.freeShipping,
    remaining,
    ratio: charges.freeShipping ? 1 : Math.max(0, Math.min(1, itemsTotal / threshold)),
    threshold,
  };
}
