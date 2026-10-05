import type { BadgeProps } from "@/components/ui/badge";
import type { OrderStatus, PaymentStatus } from "@/lib/supabase/types";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

/**
 * "Siparişlerim" devir metni — bu dosya ÖNCEDEN app/dashboard/customers/
 * [customerId]/stores/[storeId]/orders/status-labels.ts'te (admin-only)
 * yaşıyordu. TAŞINDI (kopyalanmadı) — storefront'un "Siparişlerim"
 * (app/store/[storeSlug]/siparislerim/**) sayfası AYNI Türkçe durum
 * çevirilerini göstermesi gerektiği için, admin ve storefront'ta FARKLI
 * kelimeler kullanılma riski olmasın diye tek bir paylaşımlı dosyaya
 * çıkarıldı. Admin'in 3 eski importçısı (orders/{actions.ts,page.tsx,
 * [orderId]/page.tsx}) artık buradan import ediyor, içerik/davranış
 * değişmedi. Bu dosya kendisi "use server" DEĞİL (plain module) — admin
 * tarafındaki eski dosyanın kendi yorumunun açıkladığı "use server"
 * export-only-functions kısıtı burada da geçerliliğini koruyor.
 *
 * ORDER_STATUS_BADGE_VARIANT/PAYMENT_STATUS_BADGE_VARIANT (components/ui/
 * badge.tsx'in BadgeProps'üne bağlı) SADECE admin dashboard'un kendi Badge
 * bileşenini kullanıyor — storefront'un "Siparişlerim" sayfası bunları
 * import ETMİYOR, kendi v2 koyu tema renklerini (order-status-card.tsx'in
 * kendi dosyasında) ayrı tanımlıyor. Bu ikisi burada admin importçılarının
 * davranışı birebir korunsun diye KALDI, atılmadı.
 */
export const ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "preparing", "shipped", "completed", "cancelled"];

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as string[]).includes(value);
}

/** Admin'in orders sayfaları VE storefront'un "Siparişlerim" sayfası tarafından paylaşılıyor — tek Türkçe çeviri kaynağı, iki yerde farklı kelime riski yok. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Beklemede",
  confirmed: "Onaylandı",
  preparing: "Hazırlanıyor",
  shipped: "Kargoya Verildi",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

/**
 * FAZ 2.5 — "büyük net renkli rozetler... teknik olmayan bir kullanıcı
 * için okunabilir olsun": each status gets its own real color (via
 * Badge's success/warning/danger/info variants), not just outline-vs-solid.
 * SADECE admin dashboard için — bkz. bu dosyanın üst doc comment'i.
 */
export const ORDER_STATUS_BADGE_VARIANT: Record<OrderStatus, BadgeVariant> = {
  pending: "warning",
  confirmed: "info",
  preparing: "info",
  shipped: "info",
  completed: "success",
  cancelled: "danger",
};

/** FAZ 2.5 — payment_status is an independent axis from order status (see migration 0029's own comment on payment_status). */
export const PAYMENT_STATUSES: PaymentStatus[] = ["unpaid", "paid", "refunded"];

export function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as string[]).includes(value);
}

/** Admin + storefront paylaşımlı — bkz. ORDER_STATUS_LABELS'in kendi yorumu. */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Ödenmedi",
  paid: "Ödendi",
  refunded: "İade Edildi",
};

/** Same "real color per state" reasoning as ORDER_STATUS_BADGE_VARIANT above. SADECE admin için. */
export const PAYMENT_STATUS_BADGE_VARIANT: Record<PaymentStatus, BadgeVariant> = {
  unpaid: "warning",
  paid: "success",
  refunded: "danger",
};
