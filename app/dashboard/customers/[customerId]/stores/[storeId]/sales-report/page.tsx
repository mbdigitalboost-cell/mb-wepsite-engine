import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OrdersTabs } from "@/components/dashboard/orders-tabs";
import { loadCountedItems, loadReportRows, resolveReportParams } from "@/lib/commerce/reports/load-sales";
import {
  GROUPING_LABELS,
  METRIC_DEFINITIONS,
  PRESET_LABELS,
  breakdownByPaymentMethod,
  buildSeries,
  computeSalesMetrics,
  percentChange,
  statusDistribution,
  topProducts,
  type Grouping,
  type PresetKey,
  type SalesMetrics,
} from "@/lib/commerce/reports/sales";
import { ORDER_STATUS_LABELS } from "@/lib/commerce/order-status-labels";
import { formatPrice } from "@/lib/utils/format-price";

export const dynamic = "force-dynamic";

const PRESETS: PresetKey[] = ["today", "yesterday", "last7", "thisWeek", "thisMonth", "lastMonth", "last30", "thisYear"];

/**
 * Faz 30 Kısım D — Satış Raporu. Seçim URL'de (paylaşılabilir/yenilenebilir).
 * Tanımlar: lib/commerce/reports/sales.ts (birim testli). Saat dilimi
 * Europe/Istanbul; tarih = sipariş oluşturma tarihi.
 */
export default async function SalesReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string; storeId: string }>;
  searchParams: Promise<{ preset?: string; from?: string; to?: string; group?: string }>;
}) {
  const { customerId, storeId } = await params;
  const sp = await searchParams;
  await requireStoreEditorAccess(storeId, customerId);

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id, name").eq("id", storeId).eq("customer_id", customerId).maybeSingle();
  if (!store) notFound();

  const report = resolveReportParams(sp);
  const [rows, previousRows] = await Promise.all([loadReportRows(storeId, report.range), loadReportRows(storeId, report.previous)]);
  const metrics = computeSalesMetrics(rows);
  const previous = computeSalesMetrics(previousRows);
  const series = buildSeries(rows, report.range, report.grouping);
  const payments = breakdownByPaymentMethod(rows);
  const statuses = statusDistribution(rows);
  const top = topProducts(await loadCountedItems(storeId, rows));

  const base = `/dashboard/customers/${customerId}/stores/${storeId}`;
  const selection = (overrides: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    const merged = { preset: report.preset, from: report.preset === "custom" ? report.fromDay : undefined, to: report.preset === "custom" ? report.toDay : undefined, group: sp.group, ...overrides };
    for (const [key, value] of Object.entries(merged)) if (value) query.set(key, value);
    return `?${query.toString()}`;
  };

  const cards: Array<{ key: keyof SalesMetrics; label: string; money: boolean; definition: string; extra?: string }> = [
    { key: "gross", label: "Brüt satış", money: true, definition: METRIC_DEFINITIONS.gross },
    { key: "discount", label: "İndirim", money: true, definition: METRIC_DEFINITIONS.discount },
    { key: "net", label: "Net satış", money: true, definition: METRIC_DEFINITIONS.net },
    { key: "orderCount", label: "Sipariş", money: false, definition: METRIC_DEFINITIONS.orderCount },
    { key: "averageBasket", label: "Ortalama sepet", money: true, definition: METRIC_DEFINITIONS.averageBasket },
    { key: "itemsSold", label: "Satılan ürün", money: false, definition: METRIC_DEFINITIONS.itemsSold },
    { key: "cancelledCount", label: "İptal", money: false, definition: METRIC_DEFINITIONS.cancelledAmount, extra: formatPrice(metrics.cancelledAmount) },
    { key: "refundedOrderCount", label: "İade", money: false, definition: METRIC_DEFINITIONS.refunds, extra: formatPrice(metrics.refunds) },
    // Faz 31 — ayrı kartlar; net satışa eklenmez.
    { key: "shippingIncome", label: "Kargo geliri", money: true, definition: METRIC_DEFINITIONS.shippingIncome },
    { key: "codFeeIncome", label: "Kapıda ödeme ücreti", money: true, definition: METRIC_DEFINITIONS.codFeeIncome },
  ];

  const maxNet = Math.max(1, ...series.map((point) => point.net));
  const chartHeight = 180;
  const barWidth = Math.max(4, Math.min(40, Math.floor(720 / Math.max(series.length, 1)) - 4));
  const chartWidth = Math.max(series.length * (barWidth + 4), 200);

  return (
    <div>
      <Link href={base} className="text-xs text-foreground/50 hover:text-foreground hover:underline">
        ← {store.name}
      </Link>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">Satış Raporu</h1>
      <OrdersTabs customerId={customerId} storeId={storeId} active="report" />

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {PRESETS.map((preset) => (
          <Link
            key={preset}
            href={`?preset=${preset}${sp.group ? `&group=${sp.group}` : ""}`}
            aria-current={report.preset === preset ? "true" : undefined}
            className={`rounded-full border px-3 py-1 text-xs ${report.preset === preset ? "border-brand-accent bg-brand-accent/10 font-semibold" : "border-black/15 hover:border-black/30"}`}
          >
            {PRESET_LABELS[preset]}
          </Link>
        ))}
        <form className="ml-1 flex flex-wrap items-center gap-1.5 text-xs">
          <input type="hidden" name="preset" value="custom" />
          <input type="date" name="from" defaultValue={report.fromDay} aria-label="Başlangıç" className="h-7 rounded-md border border-black/15 bg-transparent px-2" />
          <span>–</span>
          <input type="date" name="to" defaultValue={report.toDay} aria-label="Bitiş" className="h-7 rounded-md border border-black/15 bg-transparent px-2" />
          {sp.group ? <input type="hidden" name="group" value={sp.group} /> : null}
          <button type="submit" className="h-7 rounded-md bg-brand-accent px-3 font-medium text-white">
            Uygula
          </button>
        </form>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-foreground/60">
        <p>
          {report.fromDay} – {report.toDay} · Europe/Istanbul · tarih = sipariş oluşturma tarihi · önceki dönem: aynı uzunluktaki bir önceki aralık
        </p>
        <div className="flex items-center gap-1">
          <span>Gruplama:</span>
          {(Object.keys(GROUPING_LABELS) as Grouping[]).map((grouping) => (
            <Link
              key={grouping}
              href={selection({ group: grouping })}
              className={`rounded-md px-2 py-0.5 ${report.grouping === grouping ? "bg-black/10 font-semibold text-foreground" : "hover:bg-black/5"}`}
            >
              {GROUPING_LABELS[grouping]}
            </Link>
          ))}
          <a href={`${base}/sales-report/export${selection({})}`} className="ml-3 rounded-md border border-black/15 px-2 py-0.5 hover:border-black/30">
            Excel&apos;e aktar
          </a>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((card) => {
          const value = metrics[card.key] as number;
          const change = percentChange(value, previous[card.key] as number);
          return (
            <div key={card.key} className="rounded-lg border border-black/10 p-3">
              <p className="text-xs text-foreground/60">{card.label}</p>
              <p className="mt-1 text-lg font-semibold">{card.money ? formatPrice(value) : value.toLocaleString("tr-TR")}</p>
              {card.extra ? <p className="text-xs text-foreground/70">{card.extra}</p> : null}
              <p className={`text-xs ${change === null ? "text-foreground/40" : change >= 0 ? "text-green-700" : "text-red-700"}`}>
                {change === null ? "önceki dönem: veri yok" : `${change >= 0 ? "+" : ""}${change.toLocaleString("tr-TR")}% önceki döneme göre`}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-foreground/50">{card.definition}</p>
            </div>
          );
        })}
      </div>

      {metrics.awaitingCardCount > 0 ? (
        <p className="mt-3 text-xs text-foreground/70">
          Kart ödemesi bekleyen: {metrics.awaitingCardCount} sipariş · {formatPrice(metrics.awaitingCardAmount)} (ödeme alınınca rapora girer)
        </p>
      ) : null}
      <p className="mt-1 text-xs text-foreground/50">
        Kargo geliri ve kapıda ödeme ücreti ayrı kartlarda; net satış ürün bazlıdır. Kargo ücreti Faz 31&apos;den (Kasım 2026) önceki siparişlerde
        alınmadığı için onlarda 0&apos;dır. Test olarak işaretlenen siparişler sayılmaz.
      </p>

      <section className="mt-6 rounded-lg border border-black/10 p-4">
        <h2 className="text-sm font-semibold">Net satış — {GROUPING_LABELS[report.grouping].toLocaleLowerCase("tr")} bazında</h2>
        <div className="mt-3 overflow-x-auto">
          <svg width={chartWidth} height={chartHeight + 24} role="img" aria-label="Dönem başına net satış sütun grafiği">
            {series.map((point, index) => {
              const height = point.net > 0 ? Math.max(2, Math.round((point.net / maxNet) * chartHeight)) : 0;
              const x = index * (barWidth + 4);
              return (
                <g key={point.start.toISOString()}>
                  <rect x={x} y={chartHeight - height} width={barWidth} height={height} rx={2} className="fill-[#B34C00] hover:fill-[#8F3D00]">
                    <title>{`${point.label}: ${formatPrice(point.net)} · ${point.orders} sipariş`}</title>
                  </rect>
                  {series.length <= 16 ? (
                    <text x={x + barWidth / 2} y={chartHeight + 14} textAnchor="middle" className="fill-current text-[9px] opacity-60">
                      {point.label.split(" ").slice(0, 2).join(" ")}
                    </text>
                  ) : null}
                </g>
              );
            })}
            <line x1={0} x2={chartWidth} y1={chartHeight} y2={chartHeight} className="stroke-black/20" />
          </svg>
        </div>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-xs text-foreground/60">Tablo olarak göster</summary>
          <table className="mt-2 w-full text-left text-xs">
            <thead>
              <tr className="text-foreground/60">
                <th className="py-1">Dönem</th>
                <th className="py-1 text-right">Sipariş</th>
                <th className="py-1 text-right">Net satış</th>
              </tr>
            </thead>
            <tbody>
              {series.map((point) => (
                <tr key={point.start.toISOString()} className="border-t border-black/5">
                  <td className="py-1">{point.label}</td>
                  <td className="py-1 text-right">{point.orders}</td>
                  <td className="py-1 text-right">{formatPrice(point.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-black/10 p-4 text-sm lg:col-span-2">
          <h2 className="font-semibold">En çok satan 10 ürün</h2>
          {top.length === 0 ? (
            <p className="mt-2 text-xs text-foreground/60">Bu aralıkta satış yok.</p>
          ) : (
            <table className="mt-2 w-full text-left text-xs">
              <thead>
                <tr className="text-foreground/60">
                  <th className="py-1">Ürün</th>
                  <th className="py-1">Varyant</th>
                  <th className="py-1 text-right">Adet</th>
                  <th className="py-1 text-right">Ciro (indirim öncesi)</th>
                </tr>
              </thead>
              <tbody>
                {top.map((product) => (
                  <tr key={`${product.name}-${product.variant}`} className="border-t border-black/5">
                    <td className="py-1">{product.name}</td>
                    <td className="py-1">{product.variant ?? "—"}</td>
                    <td className="py-1 text-right">{product.quantity}</td>
                    <td className="py-1 text-right">{formatPrice(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <div className="space-y-6">
          <section className="rounded-lg border border-black/10 p-4 text-sm">
            <h2 className="font-semibold">Ödeme yöntemi</h2>
            <ul className="mt-2 space-y-1 text-xs">
              {payments.length === 0 ? <li className="text-foreground/60">Veri yok.</li> : null}
              {payments.map((payment) => (
                <li key={payment.method} className="flex justify-between gap-2">
                  <span>{payment.method}</span>
                  <span>
                    {payment.orders} · {formatPrice(payment.net)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-lg border border-black/10 p-4 text-sm">
            <h2 className="font-semibold">Durum dağılımı</h2>
            <ul className="mt-2 space-y-1 text-xs">
              {statuses.length === 0 ? <li className="text-foreground/60">Veri yok.</li> : null}
              {statuses.map((entry) => (
                <li key={entry.status} className="flex justify-between">
                  <span>{ORDER_STATUS_LABELS[entry.status]}</span>
                  <span>{entry.count}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
