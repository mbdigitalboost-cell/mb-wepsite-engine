import { Space_Grotesk } from "next/font/google";
import { Truck } from "lucide-react";
import type { PublicOrderWithItems } from "@/lib/commerce/public/order-lookup";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/commerce/order-status-labels";
import { formatPrice } from "@/lib/utils/format-price";
import type { OrderStatus, PaymentStatus } from "@/lib/supabase/types";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["700"] });

/**
 * "Siparişlerim" — tek, paylaşımlı sipariş kartı. HEM üye (kendi sipariş
 * listesi) HEM misafir (kod+telefon sorgusu, tek sonuç) yolu AYNI bileşeni
 * kullanıyor (lib/commerce/public/order-lookup.ts'in ürettiği AYNI
 * PublicOrderWithItems şekli) — kod tekrarı yok. Tenant-bağımsız/genel.
 *
 * Durum rozeti metinleri lib/commerce/order-status-labels.ts'ten (admin'in
 * orders sayfalarıyla PAYLAŞIMLI) — renkler burada AYRI, storefront'un v2
 * koyu tema paletine göre (admin'in Badge bileşeni/BadgeVariant sistemi
 * storefront'ta kullanılmıyor, diğer tüm storefront sayfalarıyla aynı
 * gerekçe — bkz. storefront-button-classes.ts'in doc comment'i).
 *
 * KARGO — carrier/tracking_number ikisi de doluysa gösteriliyor; biri bile
 * boşsa (kargo entegrasyonu henüz yapılmadığı için bugün BÜYÜK İHTİMALLE
 * boş) UYDURMA bir takip kodu YOK, nötr "Kargo bilgisi henüz paylaşılmadı"
 * mesajı.
 */
const STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  pending: "text-[#D95F00] bg-[#D95F00]/10",
  confirmed: "border border-[#292929] bg-[#171717] text-[#A3A3A3]",
  preparing: "border border-[#292929] bg-[#171717] text-[#A3A3A3]",
  shipped: "text-blue-400 bg-blue-400/10",
  completed: "text-emerald-400 bg-emerald-400/10",
  cancelled: "text-red-400 bg-red-400/10",
};

const PAYMENT_STATUS_TEXT_CLASSES: Record<PaymentStatus, string> = {
  unpaid: "text-[#A3A3A3]",
  paid: "text-emerald-400",
  refunded: "text-red-400",
};

export function OrderStatusCard({ order }: { order: PublicOrderWithItems }) {
  const total = order.subtotal - order.discountAmount;
  const addressSummary = [order.addressNeighborhood, order.addressDistrict, order.addressCity].filter(Boolean).join(", ");
  const hasShippingInfo = Boolean(order.carrier && order.trackingNumber);

  return (
    <div className="rounded-lg border border-[#292929] bg-[#171717] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`${spaceGrotesk.className} text-base font-bold text-[#F5F5F5]`}>Sipariş #{order.orderNumber}</p>
          <p className="mt-0.5 text-xs text-[#A3A3A3]">{new Date(order.createdAt).toLocaleDateString("tr-TR")}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSES[order.status]}`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      <p className={`mt-2 text-xs font-medium ${PAYMENT_STATUS_TEXT_CLASSES[order.paymentStatus]}`}>
        Ödeme: {PAYMENT_STATUS_LABELS[order.paymentStatus]}
        {order.paymentMethod ? ` · ${order.paymentMethod}` : ""}
      </p>

      {order.items.length > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-[#292929] pt-3 text-sm">
          {order.items.map((item, index) => (
            <li key={index} className="flex justify-between gap-3">
              <span className="text-[#A3A3A3]">
                {item.productName}
                {item.variantLabel ? ` (${item.variantLabel})` : ""}
                {item.addonLabels.length > 0 ? ` · ${item.addonLabels.join(", ")}` : ""} × {item.quantity}
              </span>
              <span className="whitespace-nowrap text-[#F5F5F5]">{formatPrice(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 space-y-1 border-t border-[#292929] pt-3 text-sm">
        <div className="flex justify-between text-[#A3A3A3]">
          <span>Ara Toplam</span>
          <span>{formatPrice(order.subtotal)}</span>
        </div>
        {order.discountAmount > 0 ? (
          <div className="flex justify-between text-emerald-400">
            <span>İndirim{order.discountCode ? ` (${order.discountCode})` : ""}</span>
            <span>-{formatPrice(order.discountAmount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between text-base font-semibold text-[#F5F5F5]">
          <span>Toplam</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      <div className="mt-3 border-t border-[#292929] pt-3 text-sm text-[#A3A3A3]">
        <p className="text-xs font-medium uppercase tracking-wide text-[#A3A3A3]/70">Teslimat Adresi</p>
        <p className="mt-1">
          {addressSummary}
          <br />
          {order.addressLine}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-[#292929] pt-3 text-sm">
        <Truck size={15} className="text-[#A3A3A3]" aria-hidden="true" />
        {hasShippingInfo ? (
          <span className="text-[#F5F5F5]">
            {order.carrier} · Takip No: <span className="font-medium">{order.trackingNumber}</span>
          </span>
        ) : (
          <span className="text-[#A3A3A3]">Kargo bilgisi henüz paylaşılmadı.</span>
        )}
      </div>
    </div>
  );
}
