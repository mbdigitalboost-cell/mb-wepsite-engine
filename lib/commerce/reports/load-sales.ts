import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  GROUPING_LABELS,
  PRESET_LABELS,
  classifyOrder,
  formatTrDay,
  previousRange,
  resolvePreset,
  suggestGrouping,
  type DateRange,
  type Grouping,
  type PresetKey,
  type ReportOrderRow,
  type TopProductInput,
} from "@/lib/commerce/reports/sales";

/**
 * Faz 30 Kısım D — rapor verisi. Sipariş başına toplamlar DB'de
 * (store_sales_report_orders RPC — SECURITY INVOKER, RLS geçerli: yalnız
 * üyesi olunan mağaza; test siparişleri hariç). Dönem toplamları
 * lib/commerce/reports/sales.ts'teki TEK tanımla sunucuda hesaplanır;
 * istemciye yalnız sonuç gider.
 */
export interface ReportParams {
  preset: PresetKey;
  range: DateRange;
  previous: DateRange;
  grouping: Grouping;
  fromDay: string;
  toDay: string;
}

export function resolveReportParams(sp: { preset?: string; from?: string; to?: string; group?: string }, now = new Date()): ReportParams {
  const preset = (sp.preset && sp.preset in PRESET_LABELS ? sp.preset : sp.from || sp.to ? "custom" : "last30") as PresetKey;
  const range = resolvePreset(preset, now, { from: sp.from, to: sp.to });
  const grouping = (sp.group && sp.group in GROUPING_LABELS ? sp.group : suggestGrouping(range)) as Grouping;
  return {
    preset,
    range,
    previous: previousRange(range),
    grouping,
    fromDay: formatTrDay(range.from),
    toDay: formatTrDay(new Date(range.to.getTime() - 1)),
  };
}

export async function loadReportRows(storeId: string, range: DateRange): Promise<ReportOrderRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("store_sales_report_orders", {
    p_store_id: storeId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
  });
  if (error) {
    console.error("[sales-report] rpc failed:", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    ...row,
    subtotal: Number(row.subtotal),
    discount_amount: Number(row.discount_amount),
    item_quantity: Number(row.item_quantity),
    refunded_amount: Number(row.refunded_amount),
  }));
}

/** En çok satanlar için sayılan siparişlerin kalemleri (store_id filtreli, RLS geçerli). */
export async function loadCountedItems(storeId: string, rows: ReportOrderRow[]): Promise<TopProductInput[]> {
  const ids = rows.filter((row) => classifyOrder(row) === "counted").map((row) => row.order_id);
  if (ids.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const items: TopProductInput[] = [];
  for (let index = 0; index < ids.length; index += 150) {
    const { data } = await supabase
      .from("order_items")
      .select("product_name, variant_label, quantity, line_total")
      .eq("store_id", storeId)
      .in("order_id", ids.slice(index, index + 150));
    for (const item of data ?? []) items.push({ ...item, line_total: Number(item.line_total) });
  }
  return items;
}
