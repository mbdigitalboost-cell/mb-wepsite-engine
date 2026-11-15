/**
 * Faz 30 — iptal/iade talebi DURUM GEÇİŞLERİ (tek yer; saf, testli:
 * tests/returns.test.ts). Her action önce bu fonksiyona sorar; geçersiz
 * geçiş reddedilir.
 *
 *   iptal (kind=cancel):  requested → approved → refunded | closed
 *                         requested → rejected
 *   iade  (kind=return):  requested → approved (iade kodu verildi)
 *                         → received (ürün geldi) → refunded | closed
 *                         requested → rejected | cancelled_by_customer
 *                         approved  → cancelled_by_customer (müşteri vazgeçti)
 *
 * "closed": iade edilecek para yoksa (ör. kapıda ödeme, henüz ödenmemiş
 * iptal edilen sipariş) süreç para iadesi olmadan kapanır.
 */
import type { OrderReturnKind, OrderReturnStatus } from "../../supabase/types.ts";

const TRANSITIONS: Record<OrderReturnKind, Partial<Record<OrderReturnStatus, readonly OrderReturnStatus[]>>> = {
  cancel: {
    requested: ["approved", "rejected", "cancelled_by_customer"],
    approved: ["refunded", "closed"],
  },
  return: {
    requested: ["approved", "rejected", "cancelled_by_customer"],
    approved: ["received", "cancelled_by_customer"],
    received: ["refunded", "closed"],
  },
};

export const OPEN_RETURN_STATUSES: readonly OrderReturnStatus[] = ["requested", "approved", "received"];

export function canTransition(kind: OrderReturnKind, from: OrderReturnStatus, to: OrderReturnStatus): boolean {
  return TRANSITIONS[kind][from]?.includes(to) ?? false;
}

export function isOpenReturnStatus(status: OrderReturnStatus): boolean {
  return OPEN_RETURN_STATUSES.includes(status);
}

export const RETURN_STATUS_LABELS: Record<OrderReturnStatus, string> = {
  requested: "Talep alındı",
  approved: "Onaylandı",
  received: "Ürün teslim alındı",
  refunded: "Ödeme iade edildi",
  closed: "Kapatıldı",
  rejected: "Reddedildi",
  cancelled_by_customer: "Müşteri vazgeçti",
};

export const RETURN_KIND_LABELS: Record<OrderReturnKind, string> = {
  cancel: "İptal",
  return: "İade",
};

export const RETURN_REASON_LABELS = {
  changed_mind: "Cayma / fikrim değişti",
  damaged: "Hasarlı geldi",
  wrong_item: "Yanlış ürün gönderildi",
  not_fit: "Model / beden uymadı",
  other: "Diğer",
} as const;

export const RETURN_REASONS = Object.keys(RETURN_REASON_LABELS) as Array<keyof typeof RETURN_REASON_LABELS>;
