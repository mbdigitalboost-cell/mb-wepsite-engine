import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OrdersTabs } from "@/components/dashboard/orders-tabs";
import { RETURN_KIND_LABELS, RETURN_REASON_LABELS, RETURN_STATUS_LABELS } from "@/lib/commerce/returns/state";
import { refundDaysLeft } from "@/lib/commerce/returns/eligibility";
import { parseTrDay } from "@/lib/commerce/reports/sales";
import { formatPrice } from "@/lib/utils/format-price";
import type { OrderReturnKind, OrderReturnStatus } from "@/lib/supabase/types";

const STATUSES = Object.keys(RETURN_STATUS_LABELS) as OrderReturnStatus[];
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Faz 30 Kısım C — İptal & İade listesi. Filtre: tür, durum, tarih; arama:
 * sipariş no ya da müşteri adı. Yasal süre rozeti: ödeme iadesi için kalan
 * gün (iade: kargoya teslim/teslim alındı tarihinden; iptal: onaydan 14 gün).
 */
export default async function ReturnsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string; storeId: string }>;
  searchParams: Promise<{ kind?: string; status?: string; q?: string; from?: string; to?: string }>;
}) {
  const { customerId, storeId } = await params;
  const sp = await searchParams;
  await requireStoreEditorAccess(storeId, customerId);

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id, name").eq("id", storeId).eq("customer_id", customerId).maybeSingle();
  if (!store) notFound();

  let query = supabase.from("order_returns").select("*").eq("store_id", storeId).order("requested_at", { ascending: false }).limit(200);
  if (sp.kind === "cancel" || sp.kind === "return") query = query.eq("kind", sp.kind as OrderReturnKind);
  if (sp.status && (STATUSES as string[]).includes(sp.status)) query = query.eq("status", sp.status as OrderReturnStatus);
  const from = parseTrDay(sp.from);
  const to = parseTrDay(sp.to);
  if (from) query = query.gte("requested_at", from.toISOString());
  if (to) query = query.lt("requested_at", new Date(to.getTime() + DAY_MS).toISOString());

  const search = (sp.q ?? "").trim();
  if (search) {
    let orderQuery = supabase.from("orders").select("id").eq("store_id", storeId).limit(200);
    orderQuery = /^\d+$/.test(search) ? orderQuery.eq("order_number", Number(search)) : orderQuery.ilike("customer_name", `%${search.replace(/[%_]/g, "")}%`);
    const { data: matched } = await orderQuery;
    const ids = (matched ?? []).map((o) => o.id);
    query = ids.length ? query.in("order_id", ids) : query.eq("order_id", "00000000-0000-0000-0000-000000000000");
  }

  const { data: returns } = await query;
  const orderIds = [...new Set((returns ?? []).map((r) => r.order_id))];
  const { data: orders } = orderIds.length
    ? await supabase.from("orders").select("id, order_number, customer_name").eq("store_id", storeId).in("id", orderIds)
    : { data: [] as Array<{ id: string; order_number: number; customer_name: string }> };
  const orderById = new Map((orders ?? []).map((o) => [o.id, o]));

  const base = `/dashboard/customers/${customerId}/stores/${storeId}`;
  const inputClasses = "h-8 rounded-md border border-black/15 bg-transparent px-2 text-xs";

  return (
    <div>
      <Link href={base} className="text-xs text-foreground/50 hover:text-foreground hover:underline">
        ← {store.name}
      </Link>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">İptal &amp; İade</h1>
      <OrdersTabs customerId={customerId} storeId={storeId} active="returns" />
      <p className="mt-3 max-w-3xl text-xs text-foreground/60">
        Müşterilerin Siparişlerim sayfasından açtığı talepler. Yasal sayaç: ödeme, ürün iade için kargoya teslim edildiği (iptalde onaylandığı)
        günden itibaren 14 gün içinde iade edilmeli. İade ayarları: Mağaza → Ayarlar → İade ayarları.
      </p>

      <form className="mt-4 flex flex-wrap items-end gap-2">
        <select name="kind" defaultValue={sp.kind ?? ""} className={inputClasses} aria-label="Tür">
          <option value="">Tüm türler</option>
          <option value="cancel">İptal</option>
          <option value="return">İade</option>
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className={inputClasses} aria-label="Durum">
          <option value="">Tüm durumlar</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {RETURN_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={sp.from ?? ""} className={inputClasses} aria-label="Başlangıç" />
        <input type="date" name="to" defaultValue={sp.to ?? ""} className={inputClasses} aria-label="Bitiş" />
        <input name="q" defaultValue={search} placeholder="Sipariş no ya da müşteri" className={`${inputClasses} w-48`} />
        <button type="submit" className="h-8 rounded-md bg-brand-accent px-3 text-xs font-medium text-white">
          Filtrele
        </button>
        <Link href={`${base}/returns`} className="text-xs text-foreground/60 hover:underline">
          Temizle
        </Link>
      </form>

      {(returns ?? []).length === 0 ? (
        <p className="mt-6 text-sm text-foreground/60">Talep yok.</p>
      ) : (
        <ul className="mt-4 divide-y divide-black/10 rounded-lg border border-black/10">
          {(returns ?? []).map((r) => {
            const order = orderById.get(r.order_id);
            const counting = ["approved", "received"].includes(r.status) && r.refund_method !== "none" && Number(r.refund_amount) > 0;
            const daysLeft = counting ? refundDaysLeft(r.handed_to_carrier_at ?? (r.kind === "cancel" ? r.decided_at : null), r.received_at) : null;
            return (
              <li key={r.id}>
                <Link href={`${base}/returns/${r.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm hover:bg-black/[0.02]">
                  <span className="font-medium">
                    {RETURN_KIND_LABELS[r.kind]} #{r.return_number}
                  </span>
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">{RETURN_STATUS_LABELS[r.status]}</span>
                  <span className="text-foreground/70">
                    Sipariş #{order?.order_number ?? "?"} · {order?.customer_name ?? ""}
                  </span>
                  <span className="text-foreground/60">{RETURN_REASON_LABELS[r.reason]}</span>
                  <span className="ml-auto">{Number(r.refund_amount) > 0 ? formatPrice(Number(r.refund_amount)) : "—"}</span>
                  {daysLeft !== null ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        daysLeft <= 3 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {daysLeft < 0 ? `Yasal süre ${-daysLeft} gün aşıldı` : `Ödeme iadesi için ${daysLeft} gün`}
                    </span>
                  ) : null}
                  <span className="text-xs text-foreground/50">
                    {new Date(r.requested_at).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
