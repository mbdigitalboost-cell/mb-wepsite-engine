/**
 * Faz 30 — müşteri ne zaman iptal / iade talebi açabilir (saf, testli).
 * Sunucu her talepte AYNI fonksiyonu tekrar çalıştırır (istemciye güvenmez).
 *
 * Yasal güvenli taraf (Mesafeli Sözleşmeler Yönetmeliği — hukuki
 * danışmana teyit ettirin):
 *  - Cayma süresi TESLİMDEN başlar; teslim tarihi bilinmiyorsa talep
 *    ENGELLENMEZ.
 *  - Süre mağaza ayarıdır ama 14 günün altına inemez (DB CHECK + burada).
 */
import type { OrderReturnStatus, OrderStatus, PaymentStatus } from "../../supabase/types.ts";

export const MIN_RETURN_WINDOW_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface EligibilityOrder {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  trackingNumber: string | null;
  deliveredAt: string | null;
}

export interface EligibilitySettings {
  returnsEnabled: boolean;
  returnWindowDays: number;
}

export type Eligibility = { allowed: true; deadline?: Date | null } | { allowed: false; reason: string };

function hasOpenRequest(statuses: OrderReturnStatus[]): boolean {
  return statuses.some((status) => status === "requested" || status === "approved" || status === "received");
}

/** Kargoya verilmemiş sipariş: müşteri iptal TALEBİ açabilir (anında iptal yok — admin onaylar). */
export function canRequestCancel(order: EligibilityOrder, settings: EligibilitySettings, existing: OrderReturnStatus[]): Eligibility {
  if (!settings.returnsEnabled) return { allowed: false, reason: "Bu mağazada çevrimiçi iptal talebi henüz açık değil; lütfen mağazayla iletişime geçin." };
  if (hasOpenRequest(existing)) return { allowed: false, reason: "Bu sipariş için açık bir talebiniz var." };
  if (!["pending", "confirmed", "preparing"].includes(order.status)) {
    return { allowed: false, reason: "Sipariş kargoya verildiği için iptal yerine iade talebi oluşturabilirsiniz." };
  }
  if (order.trackingNumber) return { allowed: false, reason: "Siparişin kargo kodu oluşturuldu; teslim aldıktan sonra iade talebi oluşturabilirsiniz." };
  return { allowed: true };
}

/** Teslim edilmiş/kargodaki sipariş: iade (cayma) talebi. */
export function canRequestReturn(
  order: EligibilityOrder,
  settings: EligibilitySettings,
  existing: OrderReturnStatus[],
  now: Date = new Date(),
): Eligibility {
  if (!settings.returnsEnabled) return { allowed: false, reason: "Bu mağazada çevrimiçi iade talebi henüz açık değil; lütfen mağazayla iletişime geçin." };
  if (hasOpenRequest(existing)) return { allowed: false, reason: "Bu sipariş için açık bir talebiniz var." };
  if (order.status !== "shipped" && order.status !== "completed") {
    return { allowed: false, reason: "İade talebi sipariş kargoya verildikten sonra açılabilir." };
  }
  if (order.paymentStatus === "refunded") return { allowed: false, reason: "Bu siparişin ödemesi zaten iade edildi." };
  const windowDays = Math.max(MIN_RETURN_WINDOW_DAYS, settings.returnWindowDays);
  if (!order.deliveredAt) return { allowed: true, deadline: null };
  const deadline = new Date(new Date(order.deliveredAt).getTime() + windowDays * DAY_MS);
  if (now.getTime() > deadline.getTime()) {
    return { allowed: false, reason: `İade süresi (${windowDays} gün) doldu. Sorun yaşadıysanız mağazayla iletişime geçin.` };
  }
  return { allowed: true, deadline };
}

/** Kişiye özel kalem (ürün ya da seçilen ek ürün işaretliyse) cayma kapsamı dışında sayılır. */
export function isLinePersonalized(productFlag: boolean | null | undefined, addonFlags: Array<boolean | null | undefined>): boolean {
  return Boolean(productFlag) || addonFlags.some(Boolean);
}

/**
 * Yasal ödeme sayacı: malın taşıyıcıya teslim edildiği (ya da mağazaya
 * ulaştığı) günden itibaren 14 gün. Kalan gün (negatif = gecikti), sayaç
 * başlamadıysa null.
 */
export function refundDaysLeft(handedToCarrierAt: string | null, receivedAt: string | null, now: Date = new Date()): number | null {
  const start = handedToCarrierAt ?? receivedAt;
  if (!start) return null;
  const deadline = new Date(start).getTime() + MIN_RETURN_WINDOW_DAYS * DAY_MS;
  return Math.ceil((deadline - now.getTime()) / DAY_MS);
}

/**
 * Para nasıl iade edilir? (karar tek yerde)
 *  - Kartla (iyzico) ödenmiş ve ödeme kimliği olan sipariş → "iyzico".
 *  - İade (kind=return), kart değil → "iban": kapıda nakit/kart ve havalede
 *    para müşteriden alınmıştır (sistemde "ödendi" işaretlenmemiş olsa bile).
 *  - İptal (kind=cancel), kart değil: ödeme alınmışsa (havale) "iban",
 *    alınmamışsa (kapıda ödeme, henüz teslim yok) "none" — iade edilecek para yok.
 */
export function refundMethodFor(
  kind: "cancel" | "return",
  order: { paymentMethod: string | null; paymentStatus: PaymentStatus; paymentProviderPaymentId: string | null },
): "iyzico" | "iban" | "none" {
  const paid = order.paymentStatus === "paid" || order.paymentStatus === "partially_refunded";
  if (order.paymentMethod === "Kredi Kartı") {
    return paid && order.paymentProviderPaymentId ? "iyzico" : "none";
  }
  if (kind === "return") return "iban";
  return paid ? "iban" : "none";
}
