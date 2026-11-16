import { computeShippingCharges, type ShippingCharges, type ShippingFeeSettings } from "../shipping-fee.ts";
import { discountErrorMessage, type DiscountResolution, type ResolvedDiscount } from "../discount-rules.ts";

/**
 * Faz 32 — SİPARİŞ TUTARI (tek tanım; saf, testli). Önizleme
 * (previewCheckoutAction) ve sipariş oluşturma (createOrderAction) aynı
 * quoteCheckout → composeQuote yolundan geçer; sipariş satırına yazılan
 * tutarlar orderAmountsFromQuote, ekranda gösterilenler previewFromQuote
 * ile AYNI quote'tan türetilir.
 *
 * Sıra: Ürünler → İndirim → Kargo (Faz 31: eşik varsayılan olarak indirim
 * ÖNCESİ tutara bakar, yani indirim kargoyu ücretli yapmaz) → Kapıda ödeme
 * ücreti → Toplam.
 */

export interface CheckoutQuote {
  subtotal: number;
  discount: ResolvedDiscount | null;
  charges: ShippingCharges;
}

export function composeQuote(input: {
  subtotal: number;
  resolution: DiscountResolution;
  paymentMethod: string | null | undefined;
  settings: ShippingFeeSettings;
}): CheckoutQuote {
  const discount = input.resolution.status === "applied" ? input.resolution.discount : null;
  const charges = computeShippingCharges({
    itemsTotal: input.subtotal,
    discountAmount: discount?.amount ?? 0,
    paymentMethod: input.paymentMethod,
    settings: input.settings,
  });
  return { subtotal: input.subtotal, discount, charges };
}

/** orders satırına yazılan tutar alanları. */
export function orderAmountsFromQuote(quote: CheckoutQuote) {
  return {
    subtotal: quote.subtotal,
    discount_amount: quote.discount?.amount ?? 0,
    discount_code: quote.discount?.code ?? null,
    applied_discount_id: quote.discount?.id ?? null,
    shipping_fee: quote.charges.shippingFee,
    cod_fee: quote.charges.codFee,
  };
}

/** İstemciye giden önizleme (yalnız bilgi; sipariş anında her şey yeniden doğrulanır). */
export interface CheckoutPreview {
  subtotal: number;
  discount: {
    amount: number;
    /** Kod girildiyse kodun kendisi; hesaba tanımlı otomatik indirimde null. */
    code: string | null;
    source: "code" | "auto";
    valueType: "percentage" | "fixed";
    value: number;
  } | null;
  shippingFee: number;
  freeShipping: boolean;
  amountToFreeShipping: number | null;
  codFee: number;
  total: number;
}

export function previewFromQuote(quote: CheckoutQuote): CheckoutPreview {
  return {
    subtotal: quote.subtotal,
    discount: quote.discount
      ? {
          amount: quote.discount.amount,
          code: quote.discount.code,
          source: quote.discount.discountType === "code" ? "code" : "auto",
          valueType: quote.discount.valueType,
          value: quote.discount.value,
        }
      : null,
    shippingFee: quote.charges.shippingFee,
    freeShipping: quote.charges.freeShipping,
    amountToFreeShipping: quote.charges.amountToFreeShipping,
    codFee: quote.charges.codFee,
    total: quote.charges.grandTotal,
  };
}

/** Girilen kod uygulanamadıysa mesaj (yoksa null) — önizleme ve sipariş aynı metni gösterir. */
export function codeErrorFor(enteredCode: string | null | undefined, resolution: DiscountResolution, subtotal: number): string | null {
  if (!enteredCode?.trim()) return null;
  if (resolution.status === "applied") return null;
  return discountErrorMessage(resolution, subtotal);
}

/**
 * İstemcinin ekranda gösterdiği toplam (expectedTotal) ile sunucunun hesabı
 * kuruşu kuruşuna aynı mı? Gönderilmemiş/bozuk değer → uyuşmuyor sayılır
 * (müşteri görmediği bir tutarla sipariş vermesin).
 */
export function totalsMatch(expectedTotal: number | null | undefined, actualTotal: number): boolean {
  if (expectedTotal === null || expectedTotal === undefined || !Number.isFinite(expectedTotal)) return false;
  return Math.round(expectedTotal * 100) === Math.round(actualTotal * 100);
}

export function parseExpectedTotal(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function totalChangedMessage(newTotal: number): string {
  return `Tutar değişti: yeni toplam ${newTotal.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}. Lütfen kontrol edip tekrar onaylayın.`;
}
