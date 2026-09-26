import type { BadgeProps } from "@/components/ui/badge";
import type { OrderStatus, PaymentStatus } from "@/lib/supabase/types";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

/**
 * Deliberately NOT in actions.ts: that file is "use server", and Next.js
 * requires every top-level export of a "use server" file to be an async
 * Server Action — ORDER_STATUSES (a plain array) broke `next build` with
 * exactly the same "found object" error lib/commerce/product-errors.ts
 * and products/[productId]/product-tab-keys.ts were already created to
 * fix elsewhere in this codebase. Same pattern, same fix: pull the
 * non-function value out into a plain module both sides can import.
 */
export const ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "preparing", "shipped", "completed", "cancelled"];

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as string[]).includes(value);
}

/** Shared by page.tsx and [orderId]/page.tsx — a single Turkish label map so the two never drift apart. */
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

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Ödenmedi",
  paid: "Ödendi",
  refunded: "İade Edildi",
};

/** Same "real color per state" reasoning as ORDER_STATUS_BADGE_VARIANT above. */
export const PAYMENT_STATUS_BADGE_VARIANT: Record<PaymentStatus, BadgeVariant> = {
  unpaid: "warning",
  paid: "success",
  refunded: "danger",
};
