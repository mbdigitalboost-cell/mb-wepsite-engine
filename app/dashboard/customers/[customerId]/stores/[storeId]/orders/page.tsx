import { notFound } from "next/navigation";
import { orderGrandTotal } from "@/lib/commerce/shipping-fee";
import Link from "next/link";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils/format-price";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_BADGE_VARIANT,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_BADGE_VARIANT,
} from "@/lib/commerce/order-status-labels";
import {
  bulkUpdateOrdersAction,
  bulkAdvanceOrderStatusAction,
  bulkPrepareForShipmentAction,
  retryShipmentPushAction,
} from "./actions";
import { SelectAllCheckbox } from "./select-all-checkbox";
import { OrderBulkSubmitButton } from "./order-bulk-submit-button";
import { OrdersTabs } from "@/components/dashboard/orders-tabs";
import { BASIT_KARGO_STRATEGY_HANDLERS, getHandlers, type BasitKargoHandler } from "@/lib/integrations/basit-kargo";
import { getShippingIntegrationSecrets } from "@/lib/integrations/store-shipping-integration";
import type { OrderStatus, PaymentStatus, ShippingSyncStatus } from "@/lib/supabase/types";
import { CARD_PAYMENT_METHOD } from "@/lib/validation/order";
import { summarizeOrderItems, type OrderItemSummaryRow } from "@/lib/commerce/order-item-summary";

interface OrderRow {
  id: string;
  order_number: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  customer_name: string;
  customer_phone: string;
  subtotal: number;
  created_at: string;
  tracking_number: string | null;
  shipping_sync_status: ShippingSyncStatus;
  shipping_sync_error: string | null;
  payment_method: string | null;
}

interface OrdersSearchParams {
  status?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
  page?: string;
  /** Yalnızca toplu durum değiştirme action'larının redirect'inden gelir — buildQuery tarafından ASLA sayfalar arasında taşınmaz, tek seferlik bir banner (Faz 17/Kısım C'nin bulkDeleted/bulkSkipped banner'ıyla AYNI desen). */
  bulkUpdated?: string;
  bulkSkipped?: string;
  /** Faz 22 — onaylanan seçimde kart seçilmiş ama ödenmemiş sipariş sayısı (uyarı, engel değil). */
  cardUnpaidConfirmed?: string;
  /** Faz 22 — "card=pending": kart seçilmiş ama ödenmemiş siparişler (hızlı filtre, buildQuery TAŞIR). */
  card?: string;
  /** Faz 20 — bulkPrepareForShipmentAction'ın (Basit Kargo) redirect'i; aynı tek seferlik banner deseni, buildQuery taşımaz. */
  shipmentCreated?: string;
  shipmentSkipped?: string;
  shipmentErrors?: string;
}

interface ShipmentPicker {
  handlers: BasitKargoHandler[];
  defaultDesi: number;
  /** Token yok / pasif — picker yine render edilir ama admin Kargo sayfasına yönlendirilir. */
  notConfigured: boolean;
  warning: string | null;
}

/**
 * Faz 20 — "Kargoya Hazırla" firma dropdown'u için Basit Kargo'dan canlı
 * firma listesi; Faz 21 — token artık mağaza kaydından (store_shipping_
 * integrations), desi varsayılanı da oradan. Token yoksa ya da API hata
 * verirse sayfa ÇÖKMEZ: liste boş kalır, ECONOMIC/FAST + küçük bir uyarı
 * (asıl net hata, butona basılınca action'dan banner olarak gelir).
 */
async function loadShipmentHandlers(storeId: string): Promise<ShipmentPicker> {
  const integration = await getShippingIntegrationSecrets(storeId);
  if (!integration?.apiToken || !integration.isActive) {
    return { handlers: [], defaultDesi: integration?.defaultDesi ?? 1, notConfigured: true, warning: null };
  }
  try {
    return { handlers: await getHandlers(integration.apiToken), defaultDesi: integration.defaultDesi, notConfigured: false, warning: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "bilinmeyen hata";
    return { handlers: [], defaultDesi: integration.defaultDesi, notConfigured: false, warning: `Kargo firması listesi alınamadı: ${message}` };
  }
}

const PAGE_SIZE = 20;

function buildQuery(sp: OrdersSearchParams, overrides: Partial<OrdersSearchParams>): string {
  const merged = { ...sp, ...overrides };
  const params = new URLSearchParams();
  if (merged.status) params.set("status", merged.status);
  if (merged.paymentStatus) params.set("paymentStatus", merged.paymentStatus);
  if (merged.from) params.set("from", merged.from);
  if (merged.to) params.set("to", merged.to);
  if (merged.card) params.set("card", merged.card);
  if (merged.page && merged.page !== "1") params.set("page", merged.page);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

const hasAnyFilter = (sp: OrdersSearchParams) => Boolean(sp.status || sp.paymentStatus || sp.from || sp.to || sp.card);

/**
 * FAZ 2 (mağaza sepeti/sipariş), FAZ 2.5 ödeme/tarih filtresi + yeni-
 * sipariş rozeti — order list, same GET-query filter + offset/limit
 * pagination shape as products/page.tsx (no client-side state/library,
 * consistent with this codebase's "minimal JS" default).
 *
 * requireStoreEditorAccess (NOT requireStoreAccess/viewer tier) — matches
 * migration 0029's own RLS: orders_select_editor_tier is is_store_editor_member,
 * not is_store_member, a deliberate tightening since orders carry customer
 * PII (phone/address/email), unlike products/categories/brands.
 *
 * The pending-count badge is a SEPARATE, unfiltered `count`-only query
 * (status='pending' against the whole store, ignoring whatever filter the
 * admin currently has applied) — it always answers "how many orders need
 * attention right now", not "how many pending orders match my current
 * filter", which would be a different, less useful question. No separate
 * "seen" flag was added (per spec) — status itself already distinguishes
 * "needs a first look" (pending) from everything else.
 */
export default async function StoreOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string; storeId: string }>;
  searchParams: Promise<OrdersSearchParams>;
}) {
  const { customerId, storeId } = await params;
  const sp = await searchParams;
  await requireStoreEditorAccess(storeId, customerId);

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase
    .from("stores")
    .select("id, name")
    .eq("id", storeId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (!store) notFound();
  // Faz 29 — toplu işlem onay metninde müşteri adı (yanlış müşteride işlem yapılmasın).
  const { data: scopeCustomer } = await supabase.from("customers").select("name").eq("id", customerId).maybeSingle();
  const scopeLabel = `${scopeCustomer?.name ?? "?"} · ${store.name}`;

  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, status, payment_status, customer_name, customer_phone, subtotal, discount_amount, shipping_fee, cod_fee, created_at, tracking_number, shipping_sync_status, shipping_sync_error, payment_method",
      { count: "exact" },
    )
    .eq("store_id", storeId);

  if (sp.status && (ORDER_STATUSES as string[]).includes(sp.status)) {
    query = query.eq("status", sp.status as OrderStatus);
  }
  if (sp.paymentStatus && (PAYMENT_STATUSES as string[]).includes(sp.paymentStatus)) {
    query = query.eq("payment_status", sp.paymentStatus as PaymentStatus);
  }
  // Plain yyyy-mm-dd <input type="date"> values — `to` is inclusive of
  // the whole day (a bare date string compares as that day's 00:00:00,
  // so `<=` alone would exclude every order created later that same
  // day) by appending the day's final instant.
  if (sp.from) query = query.gte("created_at", sp.from);
  if (sp.to) query = query.lte("created_at", `${sp.to}T23:59:59.999`);
  // Faz 22 — "Ödeme bekleyen kart siparişleri": kart seçilmiş, henüz ödenmemiş.
  if (sp.card === "pending") query = query.eq("payment_method", CARD_PAYMENT_METHOD).eq("payment_status", "unpaid");

  const [{ data: orders, count }, { count: pendingCount }] = await Promise.all([
    query.order("created_at", { ascending: false }).range(offset, offset + PAGE_SIZE - 1),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("status", "pending"),
  ]);

  const rows = (orders ?? []) as OrderRow[];
  const totalCount = count ?? 0;

  // Faz 25 — her satırda ürün + renk özeti (sayfadaki siparişler için TEK sorgu).
  const { data: itemRows } =
    rows.length > 0
      ? await supabase
          .from("order_items")
          .select("order_id, product_name, variant_label, quantity, created_at")
          .in("order_id", rows.map((r) => r.id))
          .eq("store_id", storeId)
          .order("created_at", { ascending: true })
      : { data: [] as (OrderItemSummaryRow & { order_id: string })[] };
  const itemsByOrder = new Map<string, OrderItemSummaryRow[]>();
  for (const item of itemRows ?? []) itemsByOrder.set(item.order_id, [...(itemsByOrder.get(item.order_id) ?? []), item]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const basePath = `/dashboard/customers/${customerId}/stores/${storeId}/orders`;

  // Siparişler: Toplu Durum Değiştirme devir metni — admin hangi durum
  // sekmesini (sp.status) açmışsa, o akışın bir sonraki adımına özel TEK
  // bir hızlı buton gösterilir. returnPath, toplu aksiyonun (skip'li
  // olanların) redirect'le geri döneceği, o anki filtreleri KORUYAN URL —
  // buildQuery zaten bulkUpdated/bulkSkipped'i hiç taşımadığı için banner
  // bir sonraki navigasyonda kendiliğinden kaybolur.
  const returnPath = `${basePath}${buildQuery(sp, {})}`;
  type QuickAction = { label: string; action: (formData: FormData) => Promise<void> };
  let quickAction: QuickAction | null = null;
  if (sp.status === "pending") {
    quickAction = {
      label: "Toplu Onayla",
      action: bulkAdvanceOrderStatusAction.bind(null, customerId, storeId, "pending", "confirmed", returnPath),
    };
  } else if (sp.status === "confirmed") {
    quickAction = {
      label: "Toplu Hazırlanıyor Yap",
      action: bulkAdvanceOrderStatusAction.bind(null, customerId, storeId, "confirmed", "preparing", returnPath),
    };
  } else if (sp.status === "preparing") {
    quickAction = {
      label: "Kargoya Hazırla",
      action: bulkPrepareForShipmentAction.bind(null, customerId, storeId, returnPath),
    };
  } else if (sp.status === "shipped") {
    quickAction = {
      label: "Toplu Tamamlandı Yap",
      action: bulkAdvanceOrderStatusAction.bind(null, customerId, storeId, "shipped", "completed", returnPath),
    };
  }

  // Faz 20 — sadece "Hazırlanıyor" sekmesinde (Kargoya Hazırla görünürken)
  // Basit Kargo'ya gidilir; diğer sekmelerde hiçbir dış istek yapılmaz.
  const shipmentPicker = sp.status === "preparing" ? await loadShipmentHandlers(storeId) : null;
  const shippingSettingsPath = `/dashboard/customers/${customerId}/stores/${storeId}/shipping`;

  return (
    <div>
      <Link
        href={`/dashboard/customers/${customerId}/stores/${storeId}`}
        className="text-xs text-foreground/50 hover:text-foreground hover:underline"
      >
        ← {store.name}
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Siparişler</h1>
        {pendingCount ? <Badge variant="warning">{pendingCount} yeni sipariş</Badge> : null}
      </div>
      <OrdersTabs customerId={customerId} storeId={storeId} active="orders" />
      <p className="mt-1 text-sm text-foreground/60">
        Mağaza vitrininden gelen sipariş talepleri. Ödeme entegrasyonu yok — ödeme durumu admin tarafından elle
        işaretlenir.
      </p>

      {/*
        Siparişler: Toplu Durum Değiştirme devir metni — bulkAdvanceOrderStatusAction
        ve bulkPrepareForShipmentAction'ın redirect'inden gelen tek seferlik
        sonuç banner'ı (Faz 17/Kısım C'nin bulkDeleted/bulkSkipped banner'ıyla
        AYNI desen).
      */}
      {sp.bulkUpdated !== undefined || sp.bulkSkipped !== undefined ? (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
          {sp.bulkUpdated} sipariş güncellendi
          {Number(sp.bulkSkipped ?? 0) > 0 ? `, ${sp.bulkSkipped} sipariş değişmeden kaldı.` : "."}
        </p>
      ) : null}

      {/* Faz 22 — kart seçilmiş ama ÖDENMEMİŞ sipariş onaylandı: uyarı, engel değil (otomatik kargo gönderimi de tetiklenmiştir). */}
      {Number(sp.cardUnpaidConfirmed ?? 0) > 0 ? (
        <p className="mt-2 rounded-lg border border-red-300 bg-red-50/60 px-4 py-3 text-sm text-red-900">
          Dikkat: onaylanan siparişlerden {sp.cardUnpaidConfirmed} tanesi kart ile ödenecekti ama ödeme henüz alınmadı. Kargoya vermeden
          önce ödemeyi kontrol edin.
        </p>
      ) : null}

      {/*
        Faz 20 — Basit Kargo sonucu. Başarı sayısı + atlananlar + Basit
        Kargo'nun siparişe özel hata mesajları (AYNEN, sessizce yutulmadan).
        Durum 'shipped'e ilerlemediği için siparişler hâlâ bu sekmede
        görünür; artık takip numaraları var, kargocu teslim alınca webhook
        ilerletir.
      */}
      {sp.shipmentCreated !== undefined ? (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
            sp.shipmentErrors ? "border-red-300 bg-red-50/60 text-red-900" : "border-green-300 bg-green-50/60 text-green-900"
          }`}
        >
          <p>
            {sp.shipmentCreated} sipariş Basit Kargo&apos;ya iletildi
            {Number(sp.shipmentSkipped ?? 0) > 0
              ? `, ${sp.shipmentSkipped} sipariş atlandı (uygun durumda değil ya da zaten Basit Kargo'da).`
              : "."}
          </p>
          {sp.shipmentErrors ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {sp.shipmentErrors.split(" | ").map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-black/10 p-4">
        <div className="min-w-[160px]">
          <label htmlFor="status" className="mb-1.5 block text-xs text-foreground/60">
            Durum
          </label>
          <select
            id="status"
            name="status"
            defaultValue={sp.status ?? ""}
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm text-foreground"
          >
            <option value="">Tümü</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label htmlFor="paymentStatus" className="mb-1.5 block text-xs text-foreground/60">
            Ödeme Durumu
          </label>
          <select
            id="paymentStatus"
            name="paymentStatus"
            defaultValue={sp.paymentStatus ?? ""}
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm text-foreground"
          >
            <option value="">Tümü</option>
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PAYMENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[150px]">
          <label htmlFor="from" className="mb-1.5 block text-xs text-foreground/60">
            Başlangıç
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={sp.from ?? ""}
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm text-foreground"
          />
        </div>
        <div className="min-w-[150px]">
          <label htmlFor="to" className="mb-1.5 block text-xs text-foreground/60">
            Bitiş
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={sp.to ?? ""}
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm text-foreground"
          />
        </div>
        <button
          type="submit"
          className="h-9 rounded-md border border-black/15 px-4 text-sm text-foreground/80 hover:border-black/30"
        >
          Filtrele
        </button>
        {hasAnyFilter(sp) ? (
          <Link href={basePath} className="text-xs text-foreground/50 underline-offset-2 hover:underline">
            Filtreleri temizle
          </Link>
        ) : null}
        {/* Faz 22 — tek tıkla "kart seçilmiş, ödeme bekleyen" filtresi (diğer filtreler sıfırlanır). */}
        <Link
          href={`${basePath}?card=pending`}
          className={`basis-full text-xs underline-offset-2 hover:underline ${sp.card === "pending" ? "font-medium text-red-700" : "text-foreground/60"}`}
        >
          Ödeme bekleyen kart siparişleri →
        </Link>
      </form>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-foreground/60">{hasAnyFilter(sp) ? "Filtreye uyan sipariş yok." : "Henüz sipariş yok."}</p>
      ) : (
        /**
         * Siparişler: Toplu Durum Değiştirme devir metni — Faz 17/Kısım C'nin
         * ürün listesindeki AYNI toplu seçim/işlem deseni: filtre formundan
         * (yukarıda, method="get") AYRI bir <form> (POST/server action),
         * satır checkbox'ları + "tümünü seç" + sabit bir toplu aksiyon
         * çubuğu. Varsayılan form action'ı genel bulkUpdateOrdersAction;
         * bağlama duyarlı hızlı buton (varsa) kendi formAction'ıyla AYNI
         * seçimi (orderIds) FARKLI bir server action'a yönlendiriyor —
         * Next.js'in "<form> içinde birden fazla <button formAction>"
         * deseni, hiçbir gizli input/JS state gerekmeden.
         */
        <form action={bulkUpdateOrdersAction.bind(null, customerId, storeId, returnPath)}>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-foreground/60">
            <SelectAllCheckbox />
            <span>Tümünü seç</span>
            <select
              name="targetStatus"
              defaultValue=""
              className="h-8 w-auto rounded-md border border-black/15 bg-transparent px-2 text-xs text-foreground transition-colors focus-visible:border-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/20"
            >
              <option value="" disabled>
                Durumu seç…
              </option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {ORDER_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <OrderBulkSubmitButton label="Uygula" pendingLabel="Uygulanıyor…" variant="outline" scopeLabel={scopeLabel} />
            {shipmentPicker ? (
              /*
                Faz 20 — Kargoya Hazırla'nın iki ek alanı, AYNI formun içinde
                (orderIds ile birlikte submit olur): firma/strateji seçimi
                (GET /handlers'tan canlı + ECONOMIC/FAST) ve parti geneli
                tek bir desi/kg değeri (varsayılan 1 — devir metni "Açık
                karar #1": yanlış ağırlık gönderip fark faturası gelmesin
                diye admin'den soruluyor).
              */
              <>
                <select
                  name="handlerCode"
                  defaultValue="ECONOMIC"
                  aria-label="Kargo firması"
                  className="h-8 w-auto rounded-md border border-black/15 bg-transparent px-2 text-xs text-foreground transition-colors focus-visible:border-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/20"
                >
                  {BASIT_KARGO_STRATEGY_HANDLERS.map((handler) => (
                    <option key={handler.code} value={handler.code}>
                      {handler.name}
                    </option>
                  ))}
                  {shipmentPicker.handlers.map((handler) => (
                    <option key={handler.code} value={handler.code}>
                      {handler.name}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1">
                  <span>Desi/kg</span>
                  <input
                    name="desiKg"
                    type="number"
                    min={0.1}
                    max={500}
                    step={0.1}
                    defaultValue={shipmentPicker.defaultDesi}
                    className="h-8 w-16 rounded-md border border-black/15 bg-transparent px-2 text-xs text-foreground focus-visible:border-brand-accent focus-visible:outline-none"
                  />
                </label>
              </>
            ) : null}
            {quickAction ? (
              <OrderBulkSubmitButton
                scopeLabel={scopeLabel}
                label={quickAction.label}
                pendingLabel="Uygulanıyor…"
                variant="primary"
                formAction={quickAction.action}
              />
            ) : null}
            {shipmentPicker?.notConfigured ? (
              <span className="basis-full text-[11px] text-amber-700">
                Kargo entegrasyonu bağlı değil —{" "}
                <Link href={shippingSettingsPath} className="underline underline-offset-2">
                  Kargo Entegrasyonu
                </Link>{" "}
                sayfasından Basit Kargo API anahtarını girin.
              </span>
            ) : null}
            {shipmentPicker?.warning ? <span className="basis-full text-[11px] text-amber-700">{shipmentPicker.warning}</span> : null}
          </div>

          <ul className="mt-2 divide-y divide-black/10 rounded-lg border border-black/10">
            {rows.map((order) => (
              <li key={order.id} className="flex items-center gap-1 px-2">
                <input
                  type="checkbox"
                  name="orderIds"
                  value={order.id}
                  aria-label={`#${order.order_number} seç`}
                  className="h-4 w-4 shrink-0 rounded border-black/20"
                />
                <Link
                  href={`${basePath}/${order.id}`}
                  className="flex flex-1 flex-wrap items-center justify-between gap-2 px-2 py-3 text-sm hover:bg-brand-accent/5"
                >
                  <span>
                    <span className="font-medium text-foreground">#{order.order_number}</span>{" "}
                    <span className="text-foreground/70">{order.customer_name}</span>{" "}
                    {itemsByOrder.has(order.id) ? (
                      <span className="block text-xs text-foreground/60">{summarizeOrderItems(itemsByOrder.get(order.id) ?? [], 140)}</span>
                    ) : null}
                    <span className="text-xs text-foreground/50">{order.customer_phone}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-3 text-xs text-foreground/50">
                    {formatPrice(orderGrandTotal(order))}
                    <span>{new Date(order.created_at).toLocaleDateString("tr-TR")}</span>
                    {/* Faz 21 — Basit Kargo senkron durumu: failed → kırmızı rozet (+ sağda Tekrar Gönder), barkod varsa takip no, barkodsuz sent → "Basit Kargo'da". */}
                    {order.shipping_sync_status === "failed" ? (
                      <Badge variant="danger" title={order.shipping_sync_error ?? undefined}>
                        Kargoya gönderilemedi
                      </Badge>
                    ) : order.tracking_number ? (
                      <span className="font-mono text-[11px] text-foreground/60">{order.tracking_number}</span>
                    ) : order.shipping_sync_status === "sent" ? (
                      <span className="text-[11px] text-foreground/50">Basit Kargo&apos;da</span>
                    ) : null}
                    {order.payment_method === CARD_PAYMENT_METHOD && order.payment_status === "unpaid" && order.status !== "cancelled" ? (
                      <Badge variant="danger">Kart · ödeme bekliyor</Badge>
                    ) : (
                      <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[order.payment_status]}>
                        {PAYMENT_STATUS_LABELS[order.payment_status]}
                      </Badge>
                    )}
                    <Badge variant={ORDER_STATUS_BADGE_VARIANT[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                  </span>
                </Link>
                {order.shipping_sync_status === "failed" && order.status !== "cancelled" && order.status !== "completed" ? (
                  /*
                    Faz 21 — "Tekrar Gönder": aynı toplu formun içinde ayrı bir
                    formAction (Link'in DIŞINDA — link içinde buton olmaz).
                    Sunucu bileşeninde satır başına bir kez bind edilir; action
                    formData'yı yok sayar, sadece bu orderId'yi gönderir.
                  */
                  <button
                    type="submit"
                    formAction={retryShipmentPushAction.bind(null, customerId, storeId, order.id, returnPath)}
                    className="shrink-0 rounded-md border border-red-300 px-2 py-1 text-[11px] text-red-700 hover:bg-red-50"
                  >
                    Tekrar Gönder
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </form>
      )}

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-xs text-foreground/60">
          <span>
            Sayfa {page} / {totalPages} ({totalCount} sipariş)
          </span>
          <div className="flex items-center gap-3">
            {page > 1 ? (
              <Link href={`${basePath}${buildQuery(sp, { page: String(page - 1) })}`} className="underline-offset-2 hover:underline">
                ← Önceki
              </Link>
            ) : (
              <span className="opacity-30">← Önceki</span>
            )}
            {page < totalPages ? (
              <Link href={`${basePath}${buildQuery(sp, { page: String(page + 1) })}`} className="underline-offset-2 hover:underline">
                Sonraki →
              </Link>
            ) : (
              <span className="opacity-30">Sonraki →</span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
