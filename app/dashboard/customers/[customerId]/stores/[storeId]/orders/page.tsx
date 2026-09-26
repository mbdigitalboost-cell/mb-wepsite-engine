import { notFound } from "next/navigation";
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
} from "./status-labels";
import type { OrderStatus, PaymentStatus } from "@/lib/supabase/types";

interface OrderRow {
  id: string;
  order_number: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  customer_name: string;
  customer_phone: string;
  subtotal: number;
  created_at: string;
}

interface OrdersSearchParams {
  status?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
  page?: string;
}

const PAGE_SIZE = 20;

function buildQuery(sp: OrdersSearchParams, overrides: Partial<OrdersSearchParams>): string {
  const merged = { ...sp, ...overrides };
  const params = new URLSearchParams();
  if (merged.status) params.set("status", merged.status);
  if (merged.paymentStatus) params.set("paymentStatus", merged.paymentStatus);
  if (merged.from) params.set("from", merged.from);
  if (merged.to) params.set("to", merged.to);
  if (merged.page && merged.page !== "1") params.set("page", merged.page);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

const hasAnyFilter = (sp: OrdersSearchParams) => Boolean(sp.status || sp.paymentStatus || sp.from || sp.to);

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
  await requireStoreEditorAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase
    .from("stores")
    .select("id, name")
    .eq("id", storeId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (!store) notFound();

  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("orders")
    .select("id, order_number, status, payment_status, customer_name, customer_phone, subtotal, created_at", {
      count: "exact",
    })
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

  const [{ data: orders, count }, { count: pendingCount }] = await Promise.all([
    query.order("created_at", { ascending: false }).range(offset, offset + PAGE_SIZE - 1),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("status", "pending"),
  ]);

  const rows = (orders ?? []) as OrderRow[];
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const basePath = `/dashboard/customers/${customerId}/stores/${storeId}/orders`;

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
      <p className="mt-1 text-sm text-foreground/60">
        Mağaza vitrininden gelen sipariş talepleri. Ödeme entegrasyonu yok — ödeme durumu admin tarafından elle
        işaretlenir.
      </p>

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
      </form>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-foreground/60">{hasAnyFilter(sp) ? "Filtreye uyan sipariş yok." : "Henüz sipariş yok."}</p>
      ) : (
        <ul className="mt-6 divide-y divide-black/10 rounded-lg border border-black/10">
          {rows.map((order) => (
            <li key={order.id}>
              <Link
                href={`${basePath}/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-brand-accent/5"
              >
                <span>
                  <span className="font-medium text-foreground">#{order.order_number}</span>{" "}
                  <span className="text-foreground/70">{order.customer_name}</span>{" "}
                  <span className="text-xs text-foreground/50">{order.customer_phone}</span>
                </span>
                <span className="flex items-center gap-3 text-xs text-foreground/50">
                  {formatPrice(Number(order.subtotal))}
                  <span>{new Date(order.created_at).toLocaleDateString("tr-TR")}</span>
                  <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[order.payment_status]}>
                    {PAYMENT_STATUS_LABELS[order.payment_status]}
                  </Badge>
                  <Badge variant={ORDER_STATUS_BADGE_VARIANT[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
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
