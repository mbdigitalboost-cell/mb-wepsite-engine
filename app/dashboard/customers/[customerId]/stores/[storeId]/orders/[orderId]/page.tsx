import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils/format-price";
import {
  updateOrderStatusAction,
  updateOrderPaymentStatusAction,
  updateShippingInfoAction,
  retryShipmentPushAction,
} from "../actions";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_BADGE_VARIANT,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_BADGE_VARIANT,
} from "@/lib/commerce/order-status-labels";
import type { OrderStatus, PaymentStatus } from "@/lib/supabase/types";
import { CARD_PAYMENT_METHOD } from "@/lib/validation/order";

interface OrderItemRow {
  id: string;
  product_name: string;
  variant_label: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

interface OrderItemAddonRow {
  order_item_id: string;
  addon_name: string;
  price_delta: number;
}

/**
 * FAZ 2 (mağaza sepeti/sipariş), FAZ 2.5 ödeme/kargo alanları — order
 * detail, reorganized into 4 clear sections (Müşteri Bilgisi / Teslimat /
 * Ürünler / Durum ve Ödeme). requireStoreEditorAccess (same tier as the
 * list page — see its own comment on why this differs from products'/
 * categories' viewer-readable default). Every product_name/variant_label/
 * unit_price/addon_name/price_delta shown here is a SNAPSHOT taken at
 * order-creation time (migration 0029's own comment) — this page never
 * re-joins live products/product_variants/product_addons rows, so it
 * renders correctly even for an order whose underlying product was
 * deleted afterward.
 *
 * BUG FOUND + FIXED (reported: every order's detail page showed the same
 * address/items after navigating here from a different order via the
 * list page's <Link>): the query/data logic in this file was and is
 * correct — every .eq("id", orderId)/.eq("order_id", orderId) call is
 * genuinely scoped to the URL's own orderId, confirmed by re-reading the
 * queries line by line, and confirmed there is no server/CDN caching
 * involved at all (Vercel runtime logs show cache=MISS on every single
 * request to this route, including repeated requests to the same
 * orderId seconds apart — ruled out before touching any code). The
 * actual bug: root <div> below had no `key`, so when React Server
 * Components client-side-navigates between two URLs matching the SAME
 * route template (/orders/[orderId] -> /orders/[otherOrderId]), the
 * returned JSX tree has an IDENTICAL shape both times — same element
 * types in the same positions — so React's reconciler treats it as "the
 * same component instance, just re-rendered" and reuses the existing DOM
 * nodes rather than unmounting/remounting them. That reuse is exactly
 * what breaks the <select defaultValue={status}>, <select
 * defaultValue={paymentStatus}>, and <input defaultValue={order.carrier
 * ?? ""}>/<input defaultValue={order.tracking_number ?? ""}> elements
 * further down this file: defaultValue/defaultChecked are DOCUMENTED
 * React behavior to apply ONLY on a DOM node's initial mount, never on a
 * later re-render of the same node, however much the underlying prop
 * value changed — see https://react.dev/reference/react-dom/components/input#im-getting-an-error-a-component-is-changing-an-uncontrolled-input-to-be-controlled
 * for the same underlying mechanism from the other direction. Adding
 * `key={orderId}` on the root element forces React to treat every
 * distinct order as a genuinely new component instance (full unmount +
 * fresh mount) instead of reconciling it in place, which is the
 * standard, documented fix for this exact class of bug and is what
 * actually resolves it here — not a guess, this is React's own
 * documented `key` semantics applied to the one place in this component
 * tree where stale reuse could occur.
 */
export default async function StoreOrderDetailPage({
  params,
}: {
  params: Promise<{ customerId: string; storeId: string; orderId: string }>;
}) {
  const { customerId, storeId, orderId } = await params;
  await requireStoreEditorAccess(storeId);

  const supabase = await createSupabaseServerClient();

  const [{ data: store }, { data: order }] = await Promise.all([
    supabase.from("stores").select("id, name").eq("id", storeId).eq("customer_id", customerId).maybeSingle(),
    supabase.from("orders").select("*").eq("id", orderId).eq("store_id", storeId).maybeSingle(),
  ]);

  if (!store || !order) notFound();

  const { data: itemsData } = await supabase
    .from("order_items")
    .select("id, product_name, variant_label, unit_price, quantity, line_total")
    .eq("order_id", orderId)
    .eq("store_id", storeId)
    .order("created_at", { ascending: true });
  const items = (itemsData ?? []) as OrderItemRow[];

  const itemIds = items.map((i) => i.id);
  const { data: addonsData } =
    itemIds.length > 0
      ? await supabase
          .from("order_item_addons")
          .select("order_item_id, addon_name, price_delta")
          .in("order_item_id", itemIds)
          .eq("store_id", storeId)
      : { data: [] as OrderItemAddonRow[] };
  const addons = (addonsData ?? []) as OrderItemAddonRow[];

  const addonsByItemId = new Map<string, OrderItemAddonRow[]>();
  for (const addon of addons) {
    const list = addonsByItemId.get(addon.order_item_id) ?? [];
    list.push(addon);
    addonsByItemId.set(addon.order_item_id, list);
  }

  const status = order.status as OrderStatus;
  const paymentStatus = order.payment_status as PaymentStatus;
  // "shipped veya sonrasında" — shipping info only makes sense once the
  // order has actually reached that point in its lifecycle (or beyond,
  // i.e. completed); updateShippingInfoAction re-checks this same
  // condition server-side, so a stale page can't bypass it.
  const canEditShipping = status === "shipped" || status === "completed";
  // Faz 22 — kart seçilmiş ama ödenmemiş: onay ENGELLENMEZ, uyarı gösterilir.
  const isCardOrder = order.payment_method === CARD_PAYMENT_METHOD;
  const cardPaymentPending = isCardOrder && paymentStatus === "unpaid" && status !== "cancelled";

  const updateStatus = updateOrderStatusAction.bind(null, customerId, storeId, orderId);
  const updatePaymentStatus = updateOrderPaymentStatusAction.bind(null, customerId, storeId, orderId);
  const updateShippingInfo = updateShippingInfoAction.bind(null, customerId, storeId, orderId);
  const basePath = `/dashboard/customers/${customerId}/stores/${storeId}/orders`;
  const detailPath = `${basePath}/${orderId}`;
  // Faz 21 — "Tekrar Gönder" bu sayfaya geri döner; banner'ı liste sayfası
  // gösterdiği için redirect'i listeye değil detaya alıyoruz, mesaj
  // shipping_sync_status/error alanlarından zaten okunur.
  const retryShipmentPush = retryShipmentPushAction.bind(null, customerId, storeId, orderId, detailPath);
  const canRetryShipmentPush =
    (status === "confirmed" || status === "preparing") && !order.shipping_provider_order_id;

  return (
    // key={orderId} is the actual fix — see this file's own top-of-file
    // comment for the exact mechanism this closes.
    <div key={orderId}>
      <Link href={basePath} className="text-xs text-foreground/50 hover:text-foreground hover:underline">
        ← {store.name} · Siparişler
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Sipariş #{order.order_number}</h1>
        <div className="flex items-center gap-2">
          <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[paymentStatus]}>{PAYMENT_STATUS_LABELS[paymentStatus]}</Badge>
          <Badge variant={ORDER_STATUS_BADGE_VARIANT[status]}>{ORDER_STATUS_LABELS[status]}</Badge>
        </div>
      </div>
      <p className="mt-1 text-xs text-foreground/50">{new Date(order.created_at).toLocaleString("tr-TR")}</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <section className="rounded-lg border border-black/10 p-4">
          <h2 className="text-sm font-semibold tracking-tight">Müşteri Bilgisi</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-foreground/50">Ad Soyad</dt>
              <dd className="text-foreground">{order.customer_name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-foreground/50">Telefon</dt>
              <dd className="text-foreground">{order.customer_phone}</dd>
            </div>
            {order.customer_email ? (
              <div className="flex justify-between gap-3">
                <dt className="text-foreground/50">E-posta</dt>
                <dd className="text-foreground">{order.customer_email}</dd>
              </div>
            ) : null}
          </dl>
          {order.note ? (
            <>
              <h3 className="mt-4 text-xs font-medium text-foreground/50">Not</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-foreground/80">{order.note}</p>
            </>
          ) : null}
        </section>

        <section className="rounded-lg border border-black/10 p-4">
          <h2 className="text-sm font-semibold tracking-tight">Teslimat</h2>
          <p className="mt-3 text-sm text-foreground">
            {order.address_line}
            <br />
            {/* address_neighborhood is nullable — FAZ 2.6 (migration 0030) added it after this store's first orders already existed; "-" for those, never treated as an error. */}
            {order.address_neighborhood ?? "-"}, {order.address_district} / {order.address_city}
          </p>
          <p className="mt-2 text-xs text-foreground/50">
            Ödeme Yöntemi: {order.payment_method ?? "-"}
          </p>

          {canEditShipping ? (
            <form action={updateShippingInfo} className="mt-4 space-y-2 border-t border-black/10 pt-4">
              <div>
                <label htmlFor="carrier" className="mb-1 block text-xs text-foreground/60">
                  Kargo Firması
                </label>
                <input
                  id="carrier"
                  name="carrier"
                  type="text"
                  defaultValue={order.carrier ?? ""}
                  className="w-full rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm text-foreground"
                />
              </div>
              <div>
                <label htmlFor="trackingNumber" className="mb-1 block text-xs text-foreground/60">
                  Takip Numarası
                </label>
                <input
                  id="trackingNumber"
                  name="trackingNumber"
                  type="text"
                  defaultValue={order.tracking_number ?? ""}
                  className="w-full rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm text-foreground"
                />
              </div>
              {order.shipped_at ? (
                <p className="text-xs text-foreground/50">Kargoya veriliş: {new Date(order.shipped_at).toLocaleString("tr-TR")}</p>
              ) : null}
              <button
                type="submit"
                className="rounded-md border border-black/15 px-4 py-1.5 text-sm text-foreground/80 hover:border-black/30"
              >
                Kargo Bilgisini Kaydet
              </button>
            </form>
          ) : (
            <p className="mt-4 border-t border-black/10 pt-4 text-xs text-foreground/50">
              Kargo bilgisi, sipariş &quot;Kargoya Verildi&quot; durumuna geçtiğinde buradan girilebilir.
            </p>
          )}
        </section>
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-semibold tracking-tight">Ürünler</h2>
        <ul className="mt-3 divide-y divide-black/10 rounded-lg border border-black/10">
          {items.map((item) => {
            const itemAddons = addonsByItemId.get(item.id) ?? [];
            return (
              <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 p-4 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{item.product_name}</p>
                  {item.variant_label ? <p className="mt-0.5 text-xs text-foreground/60">{item.variant_label}</p> : null}
                  {itemAddons.length > 0 ? (
                    <p className="mt-0.5 text-xs text-foreground/50">
                      {itemAddons.map((a) => `${a.addon_name} (+${formatPrice(Number(a.price_delta))})`).join(", ")}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-foreground/50">
                    {formatPrice(Number(item.unit_price))} × {item.quantity}
                  </p>
                </div>
                <p className="whitespace-nowrap font-medium text-foreground">{formatPrice(Number(item.line_total))}</p>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 rounded-lg border border-black/10 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground/60">Ara Toplam</span>
            <span className="text-foreground">{formatPrice(Number(order.subtotal))}</span>
          </div>
          {/* "Aboneler" indirim sistemi — migration 0036. discount_amount=0 (varsayılan) olan her eski/indirimsiz sipariş için bu satır hiç görünmez. */}
          {Number(order.discount_amount) > 0 ? (
            <div className="mt-1 flex items-center justify-between text-sm text-emerald-700">
              <span>İndirim{order.discount_code ? ` (${order.discount_code})` : ""}</span>
              <span>-{formatPrice(Number(order.discount_amount))}</span>
            </div>
          ) : null}
          <div className="mt-2 flex items-center justify-between border-t border-black/10 pt-2">
            <span className="text-sm text-foreground/60">Genel Toplam</span>
            <span className="text-xl font-semibold text-foreground">
              {formatPrice(Number(order.subtotal) - Number(order.discount_amount))}
            </span>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-black/10 p-4">
        <h2 className="text-sm font-semibold tracking-tight">Durum ve Ödeme</h2>
        {cardPaymentPending ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50/60 px-3 py-2 text-xs text-red-800">
            Bu sipariş <strong>kart ile ödenecek</strong> ama ödeme henüz alınmadı
            {status !== "pending" ? " — sipariş yine de ilerletilmiş durumda" : ""}. Onaylamak kargo gönderimini tetikler; ödemeyi
            bekleyin ya da müşteriyle görüşün.
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-6">
          <form action={updateStatus} className="flex flex-wrap items-center gap-2">
            <label htmlFor="status" className="text-xs text-foreground/60">
              Sipariş Durumu
            </label>
            <select
              id="status"
              name="status"
              defaultValue={status}
              className="rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm text-foreground"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md border border-black/15 px-4 py-1.5 text-sm text-foreground/80 hover:border-black/30"
            >
              Güncelle
            </button>
          </form>

          <form action={updatePaymentStatus} className="flex flex-wrap items-center gap-2">
            <label htmlFor="paymentStatus" className="text-xs text-foreground/60">
              Ödeme Durumu
            </label>
            <select
              id="paymentStatus"
              name="paymentStatus"
              defaultValue={paymentStatus}
              className="rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm text-foreground"
            >
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PAYMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md border border-black/15 px-4 py-1.5 text-sm text-foreground/80 hover:border-black/30"
            >
              Güncelle
            </button>
          </form>
        </div>
        {order.paid_at ? (
          <p className="mt-3 text-xs text-foreground/50">Ödeme tarihi: {new Date(order.paid_at).toLocaleString("tr-TR")}</p>
        ) : null}
      </section>

      {/* Faz 22 — kart ödemesi izi (iyzico). İade/iptal API'si kapsam dışı: not olarak gösterilir. */}
      {isCardOrder || order.payment_provider ? (
        <section className="mt-6 rounded-lg border border-black/10 p-4">
          <h2 className="text-sm font-semibold tracking-tight">Online Ödeme (iyzico)</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-foreground/50">Durum</dt>
              <dd>
                {paymentStatus === "paid" ? (
                  <Badge variant="success">Ödendi</Badge>
                ) : paymentStatus === "refunded" ? (
                  <Badge variant="outline">İade edildi</Badge>
                ) : (
                  <Badge variant="danger">Ödeme bekliyor</Badge>
                )}
              </dd>
            </div>
            {order.payment_provider_payment_id ? (
              <div className="flex justify-between gap-3">
                <dt className="text-foreground/50">iyzico ödeme no</dt>
                <dd className="font-mono text-xs text-foreground">{order.payment_provider_payment_id}</dd>
              </div>
            ) : null}
            {order.paid_at ? (
              <div className="flex justify-between gap-3">
                <dt className="text-foreground/50">Ödeme zamanı</dt>
                <dd className="text-foreground">{new Date(order.paid_at).toLocaleString("tr-TR")}</dd>
              </div>
            ) : null}
          </dl>
          {order.payment_error && paymentStatus === "unpaid" ? (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50/60 px-3 py-2 text-xs text-red-800">Son deneme: {order.payment_error}</p>
          ) : null}
          <p className="mt-3 text-xs text-foreground/50">
            İade / iptal bu panelden yapılmaz: iyzico panelinde ödeme numarasıyla iade edin, sonra yukarıdan ödeme durumunu &quot;İade
            Edildi&quot; yapın.
          </p>
        </section>
      ) : null}

      {/* Faz 22 — Fatura Bilgileri (Faz 23 BirFatura bunları okur). TCKN/VKN admin için gerekli, burada tam gösterilir; müşteri tarafında gösterilmez. */}
      <section className="mt-6 rounded-lg border border-black/10 p-4">
        <h2 className="text-sm font-semibold tracking-tight">Fatura Bilgileri</h2>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-foreground/50">Tür</dt>
            <dd className="text-foreground">{order.billing_type === "corporate" ? "Kurumsal" : "Bireysel"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-foreground/50">{order.billing_type === "corporate" ? "Ünvan" : "Ad Soyad"}</dt>
            <dd className="text-foreground">{order.billing_name || order.customer_name}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-foreground/50">{order.billing_type === "corporate" ? "Vergi No" : "TC Kimlik No"}</dt>
            <dd className="font-mono text-xs text-foreground">{order.billing_identity_number || "-"}</dd>
          </div>
          {order.billing_type === "corporate" ? (
            <div className="flex justify-between gap-3">
              <dt className="text-foreground/50">Vergi Dairesi</dt>
              <dd className="text-foreground">{order.billing_tax_office || "-"}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-3">
            <dt className="text-foreground/50">Fatura Adresi</dt>
            <dd className="text-right text-foreground">
              {order.billing_same_as_shipping || !order.billing_address_line
                ? "Teslimat adresiyle aynı"
                : `${order.billing_address_line}, ${order.billing_address_district ?? ""} / ${order.billing_address_city ?? ""}`}
            </dd>
          </div>
        </dl>
      </section>

      {/*
        Faz 21 — Basit Kargo senkronu. Üç hâl: not_sent (henüz gönderilmedi /
        entegrasyon yok), sent (Basit Kargo'da; barkod varsa takip no +
        "Etiketi İndir"), failed (hata metni + "Tekrar Gönder"). Bu bölüm
        hiçbir dış istek yapmaz — sadece siparişin kendi kolonlarını okur,
        token yokken de sorunsuz render olur.
      */}
      <section className="mt-6 rounded-lg border border-black/10 p-4">
        <h2 className="text-sm font-semibold tracking-tight">Kargo (Basit Kargo)</h2>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-foreground/50">Senkron</dt>
            <dd>
              {order.shipping_sync_status === "sent" ? (
                <Badge variant="success">Basit Kargo&apos;da</Badge>
              ) : order.shipping_sync_status === "failed" ? (
                <Badge variant="danger">Kargoya gönderilemedi</Badge>
              ) : (
                <Badge variant="outline">Gönderilmedi</Badge>
              )}
            </dd>
          </div>
          {order.shipping_provider_order_id ? (
            <div className="flex justify-between gap-3">
              <dt className="text-foreground/50">Basit Kargo sipariş no</dt>
              <dd className="font-mono text-xs text-foreground">{order.shipping_provider_order_id}</dd>
            </div>
          ) : null}
          {order.tracking_number ? (
            <div className="flex justify-between gap-3">
              <dt className="text-foreground/50">Takip numarası</dt>
              <dd className="font-mono text-xs text-foreground">
                {order.carrier ? `${order.carrier} · ` : ""}
                {order.tracking_number}
              </dd>
            </div>
          ) : null}
        </dl>
        {order.shipping_sync_error ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50/60 px-3 py-2 text-xs text-red-800">{order.shipping_sync_error}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {canRetryShipmentPush ? (
            <form action={retryShipmentPush}>
              <button
                type="submit"
                className="rounded-md border border-black/15 px-4 py-1.5 text-sm text-foreground/80 hover:border-black/30"
              >
                {order.shipping_sync_status === "failed" ? "Tekrar Gönder" : "Basit Kargo'ya Gönder"}
              </button>
            </form>
          ) : null}
          {order.shipping_provider_order_id && order.tracking_number ? (
            <a
              href={`${detailPath}/label`}
              target="_blank"
              rel="noopener"
              className="rounded-md border border-black/15 px-4 py-1.5 text-sm text-foreground/80 hover:border-black/30"
            >
              Etiketi İndir (SVG)
            </a>
          ) : null}
          {!order.shipping_provider_order_id && status !== "confirmed" && status !== "preparing" ? (
            <p className="text-xs text-foreground/50">
              Otomatik gönderim sipariş &quot;Onaylandı&quot; durumuna geçince çalışır; barkod &quot;Hazırlanıyor&quot; sekmesindeki
              &quot;Kargoya Hazırla&quot; ile üretilir.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
