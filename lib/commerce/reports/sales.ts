/**
 * Faz 30 Kısım D — SATIŞ RAPORU TANIMLARI (tek yer; saf, testli:
 * tests/sales-report.test.ts). Rapor sayfası, Excel çıktısı ve mağaza
 * panosu aynı tanımları kullanır.
 *
 * Saat dilimi: Europe/Istanbul. Türkiye 2016'dan beri yıl boyu UTC+3
 * (yaz saati yok) — gün/hafta/ay sınırları sabit +03:00 ile hesaplanır.
 *
 * Hangi siparişler sayılır ("sayılan sipariş"):
 *   - iptal (cancelled) DEĞİL,
 *   - kartla ödenecek olup henüz ÖDENMEMİŞ değil (bunlar "ödeme bekleyen"
 *     satırında ayrı gösterilir),
 *   - test siparişi değil (is_test — RPC zaten hariç tutar).
 * Tarih = sipariş oluşturma tarihi. Kargo ücreti siparişte tutulmadığı için
 * (sistem bugün kargo ücreti almıyor) raporda kargo geliri yoktur.
 */
import type { OrderStatus, PaymentStatus } from "../../supabase/types.ts";

export const TR_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const CARD_METHOD = "Kredi Kartı";

export type Grouping = "day" | "week" | "month";
export type PresetKey = "today" | "yesterday" | "last7" | "thisWeek" | "thisMonth" | "lastMonth" | "last30" | "thisYear" | "custom";

export const PRESET_LABELS: Record<PresetKey, string> = {
  today: "Bugün",
  yesterday: "Dün",
  last7: "Son 7 gün",
  thisWeek: "Bu hafta",
  thisMonth: "Bu ay",
  lastMonth: "Geçen ay",
  last30: "Son 30 gün",
  thisYear: "Bu yıl",
  custom: "Özel aralık",
};

export const GROUPING_LABELS: Record<Grouping, string> = { day: "Gün", week: "Hafta", month: "Ay" };

/** [from, to) — UTC Date'ler; gün sınırları TR saatine göre. */
export interface DateRange {
  from: Date;
  to: Date;
}

/** TR takvimine göre {y, m(0-11), d, weekday(0=Pazartesi)} */
function trParts(date: Date) {
  const shifted = new Date(date.getTime() + TR_OFFSET_MS);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth(),
    d: shifted.getUTCDate(),
    weekday: (shifted.getUTCDay() + 6) % 7,
  };
}

/** TR takvimindeki gün başlangıcı (00:00 +03:00) → UTC Date. */
export function trDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d) - TR_OFFSET_MS);
}

export function trStartOfDay(date: Date): Date {
  const { y, m, d } = trParts(date);
  return trDate(y, m, d);
}

/** "YYYY-MM-DD" (TR takvimi) → gün başlangıcı. Geçersizse null. */
export function parseTrDay(value: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  const date = trDate(y, m, d);
  return trParts(date).d === d ? date : null;
}

/** Date → "YYYY-MM-DD" (TR takvimi). */
export function formatTrDay(date: Date): string {
  const { y, m, d } = trParts(date);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function resolvePreset(preset: PresetKey, now: Date, custom?: { from?: string | null; to?: string | null }): DateRange {
  const today = trStartOfDay(now);
  const { y, m, weekday } = trParts(now);
  const add = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);
  switch (preset) {
    case "today":
      return { from: today, to: add(today, 1) };
    case "yesterday":
      return { from: add(today, -1), to: today };
    case "last7":
      return { from: add(today, -6), to: add(today, 1) };
    case "last30":
      return { from: add(today, -29), to: add(today, 1) };
    case "thisWeek":
      return { from: add(today, -weekday), to: add(today, 1) };
    case "thisMonth":
      return { from: trDate(y, m, 1), to: add(today, 1) };
    case "lastMonth":
      return { from: trDate(y, m - 1, 1), to: trDate(y, m, 1) };
    case "thisYear":
      return { from: trDate(y, 0, 1), to: add(today, 1) };
    case "custom": {
      const from = parseTrDay(custom?.from) ?? add(today, -29);
      const toDay = parseTrDay(custom?.to) ?? today;
      const [start, end] = from.getTime() <= toDay.getTime() ? [from, toDay] : [toDay, from];
      // En fazla 2 yıl (sorgu boyutu sınırı).
      const clampedStart = end.getTime() - start.getTime() > 731 * DAY_MS ? add(end, -730) : start;
      return { from: clampedStart, to: add(end, 1) };
    }
  }
}

/** Aynı uzunlukta bir önceki dönem (yüzde fark kartları için). */
export function previousRange(range: DateRange): DateRange {
  const length = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - length), to: range.from };
}

export function rangeDays(range: DateRange): number {
  return Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / DAY_MS));
}

export function suggestGrouping(range: DateRange): Grouping {
  const days = rangeDays(range);
  if (days <= 31) return "day";
  if (days <= 120) return "week";
  return "month";
}

/** Bir anın ait olduğu dönemin başlangıcı (TR takvimi; hafta Pazartesi). */
export function bucketStart(date: Date, grouping: Grouping): Date {
  const { y, m, d, weekday } = trParts(date);
  if (grouping === "day") return trDate(y, m, d);
  if (grouping === "week") return trDate(y, m, d - weekday);
  return trDate(y, m, 1);
}

export function bucketLabel(start: Date, grouping: Grouping): string {
  const { y, m, d } = trParts(start);
  const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  if (grouping === "month") return `${months[m]} ${y}`;
  if (grouping === "week") return `${d} ${months[m]} haftası`;
  return `${d} ${months[m]}`;
}

/** Aralıktaki tüm dönem başlangıçları (boş dönemler de grafikte görünsün). */
export function enumerateBuckets(range: DateRange, grouping: Grouping): Date[] {
  const buckets: Date[] = [];
  let cursor = bucketStart(range.from, grouping);
  let guard = 0;
  while (cursor.getTime() < range.to.getTime() && guard < 800) {
    buckets.push(cursor);
    const { y, m, d } = trParts(cursor);
    cursor = grouping === "day" ? trDate(y, m, d + 1) : grouping === "week" ? trDate(y, m, d + 7) : trDate(y, m + 1, 1);
    guard += 1;
  }
  return buckets;
}

// ---- Metrikler ----------------------------------------------------------------

export interface ReportOrderRow {
  order_id: string;
  order_number: number;
  created_at: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string | null;
  subtotal: number;
  discount_amount: number;
  item_quantity: number;
  refunded_amount: number;
  customer_name?: string;
}

export type OrderClass = "counted" | "cancelled" | "awaiting_card_payment";

export function classifyOrder(row: Pick<ReportOrderRow, "status" | "payment_status" | "payment_method">): OrderClass {
  if (row.status === "cancelled") return "cancelled";
  if (row.payment_method === CARD_METHOD && row.payment_status === "unpaid") return "awaiting_card_payment";
  return "counted";
}

const k = (value: number) => Math.round(Number(value) * 100);
const tl = (kurus: number) => kurus / 100;

export interface SalesMetrics {
  gross: number;
  discount: number;
  refunds: number;
  net: number;
  orderCount: number;
  averageBasket: number;
  itemsSold: number;
  cancelledCount: number;
  cancelledAmount: number;
  refundedOrderCount: number;
  awaitingCardCount: number;
  awaitingCardAmount: number;
}

export const METRIC_DEFINITIONS: Record<keyof Omit<SalesMetrics, "awaitingCardCount" | "awaitingCardAmount">, string> = {
  gross: "Sayılan siparişlerin kalem + ek ürün tutarı, indirim öncesi (orders.subtotal).",
  discount: "Sayılan siparişlere uygulanan indirimlerin toplamı.",
  refunds: "Sayılan siparişlerde tamamlanmış (ödemesi iade edilmiş) iade tutarları.",
  net: "Brüt − indirim − tamamlanmış iadeler.",
  orderCount: "İptal edilmemiş, kart ödemesi bekleyen olmayan, test olmayan siparişler.",
  averageBasket: "Net satış ÷ sipariş sayısı.",
  itemsSold: "Sayılan siparişlerdeki toplam ürün adedi.",
  cancelledCount: "Dönemde oluşturulup iptal edilen siparişler.",
  cancelledAmount: "İptal edilen siparişlerin net tutarı (brüt − indirim).",
  refundedOrderCount: "En az bir iadesi tamamlanmış sayılan sipariş sayısı.",
};

export function computeSalesMetrics(rows: ReportOrderRow[]): SalesMetrics {
  let gross = 0,
    discount = 0,
    refunds = 0,
    orderCount = 0,
    itemsSold = 0,
    cancelledCount = 0,
    cancelledAmount = 0,
    refundedOrderCount = 0,
    awaitingCardCount = 0,
    awaitingCardAmount = 0;
  for (const row of rows) {
    const cls = classifyOrder(row);
    const subtotal = k(row.subtotal);
    const disc = Math.min(k(row.discount_amount), subtotal);
    if (cls === "cancelled") {
      cancelledCount += 1;
      cancelledAmount += subtotal - disc;
      continue;
    }
    if (cls === "awaiting_card_payment") {
      awaitingCardCount += 1;
      awaitingCardAmount += subtotal - disc;
      continue;
    }
    orderCount += 1;
    gross += subtotal;
    discount += disc;
    const refunded = k(row.refunded_amount);
    refunds += refunded;
    if (refunded > 0) refundedOrderCount += 1;
    itemsSold += Number(row.item_quantity) || 0;
  }
  const net = gross - discount - refunds;
  return {
    gross: tl(gross),
    discount: tl(discount),
    refunds: tl(refunds),
    net: tl(net),
    orderCount,
    averageBasket: orderCount > 0 ? tl(Math.round(net / orderCount)) : 0,
    itemsSold,
    cancelledCount,
    cancelledAmount: tl(cancelledAmount),
    refundedOrderCount,
    awaitingCardCount,
    awaitingCardAmount: tl(awaitingCardAmount),
  };
}

/** Önceki döneme göre % fark; önceki 0 ise null (sonsuz/anlamsız). */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export interface SeriesPoint {
  start: Date;
  label: string;
  net: number;
  orders: number;
}

export function buildSeries(rows: ReportOrderRow[], range: DateRange, grouping: Grouping): SeriesPoint[] {
  const buckets = enumerateBuckets(range, grouping);
  const map = new Map(buckets.map((start) => [start.getTime(), { net: 0, orders: 0 }]));
  for (const row of rows) {
    if (classifyOrder(row) !== "counted") continue;
    const key = bucketStart(new Date(row.created_at), grouping).getTime();
    const entry = map.get(key);
    if (!entry) continue;
    entry.net += k(row.subtotal) - Math.min(k(row.discount_amount), k(row.subtotal)) - k(row.refunded_amount);
    entry.orders += 1;
  }
  return buckets.map((start) => {
    const entry = map.get(start.getTime()) ?? { net: 0, orders: 0 };
    return { start, label: bucketLabel(start, grouping), net: tl(entry.net), orders: entry.orders };
  });
}

/** Ödeme yöntemine göre net satış ve sipariş sayısı (yalnız sayılan siparişler). */
export function breakdownByPaymentMethod(rows: ReportOrderRow[]): Array<{ method: string; orders: number; net: number }> {
  const map = new Map<string, { orders: number; net: number }>();
  for (const row of rows) {
    if (classifyOrder(row) !== "counted") continue;
    const method = row.payment_method ?? "Belirtilmemiş";
    const entry = map.get(method) ?? { orders: 0, net: 0 };
    entry.orders += 1;
    entry.net += k(row.subtotal) - Math.min(k(row.discount_amount), k(row.subtotal)) - k(row.refunded_amount);
    map.set(method, entry);
  }
  return [...map.entries()].map(([method, v]) => ({ method, orders: v.orders, net: tl(v.net) })).sort((a, b) => b.net - a.net);
}

export function statusDistribution(rows: ReportOrderRow[]): Array<{ status: OrderStatus; count: number }> {
  const map = new Map<OrderStatus, number>();
  for (const row of rows) map.set(row.status, (map.get(row.status) ?? 0) + 1);
  return [...map.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
}

export interface TopProductInput {
  product_name: string;
  variant_label: string | null;
  quantity: number;
  line_total: number;
}

/** En çok satan ürünler (adet, sonra ciro); varyant/renk ayrı satır. */
export function topProducts(items: TopProductInput[], limit = 10): Array<{ name: string; variant: string | null; quantity: number; revenue: number }> {
  const map = new Map<string, { name: string; variant: string | null; quantity: number; revenue: number }>();
  for (const item of items) {
    const key = `${item.product_name}\u0000${item.variant_label ?? ""}`;
    const entry = map.get(key) ?? { name: item.product_name, variant: item.variant_label, quantity: 0, revenue: 0 };
    entry.quantity += Number(item.quantity) || 0;
    entry.revenue += k(item.line_total);
    map.set(key, entry);
  }
  return [...map.values()]
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, limit)
    .map((entry) => ({ ...entry, revenue: tl(entry.revenue) }));
}
