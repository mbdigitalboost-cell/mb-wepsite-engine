import * as XLSX from "xlsx";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { loadReportRows, resolveReportParams } from "@/lib/commerce/reports/load-sales";
import { classifyOrder, computeSalesMetrics, METRIC_DEFINITIONS } from "@/lib/commerce/reports/sales";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/commerce/order-status-labels";

/**
 * Faz 30 Kısım D — seçili aralığın Excel çıktısı: "Özet" (rapor kartlarıyla
 * aynı tanımlar) + "Siparişler" (her sipariş, sayılıp sayılmadığıyla).
 * Müşteri telefonu/e-postası/adresi YOK — rapor için gereksiz kişisel veri.
 */
export async function GET(request: Request, { params }: { params: Promise<{ customerId: string; storeId: string }> }) {
  const { customerId, storeId } = await params;
  await requireStoreEditorAccess(storeId, customerId);

  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const report = resolveReportParams(sp);
  const rows = await loadReportRows(storeId, report.range);
  const metrics = computeSalesMetrics(rows);

  const summary: Array<[string, string | number, string]> = [
    ["Aralık", `${report.fromDay} – ${report.toDay} (Europe/Istanbul)`, "Tarih = sipariş oluşturma tarihi"],
    ["Brüt satış (TL)", metrics.gross, METRIC_DEFINITIONS.gross],
    ["İndirim (TL)", metrics.discount, METRIC_DEFINITIONS.discount],
    ["Tamamlanan iadeler (TL)", metrics.refunds, METRIC_DEFINITIONS.refunds],
    ["Net satış (TL)", metrics.net, METRIC_DEFINITIONS.net],
    ["Sipariş sayısı", metrics.orderCount, METRIC_DEFINITIONS.orderCount],
    ["Ortalama sepet (TL)", metrics.averageBasket, METRIC_DEFINITIONS.averageBasket],
    ["Satılan ürün adedi", metrics.itemsSold, METRIC_DEFINITIONS.itemsSold],
    ["İptal (adet)", metrics.cancelledCount, METRIC_DEFINITIONS.cancelledCount],
    ["İptal (TL)", metrics.cancelledAmount, METRIC_DEFINITIONS.cancelledAmount],
    ["İadeli sipariş (adet)", metrics.refundedOrderCount, METRIC_DEFINITIONS.refundedOrderCount],
    ["Kart ödemesi bekleyen (adet)", metrics.awaitingCardCount, "Sayılmaz; ödeme alınınca sayılır."],
    ["Kart ödemesi bekleyen (TL)", metrics.awaitingCardAmount, ""],
    ["Kargo geliri", "—", "Siparişte kargo ücreti tutulmuyor (sistem kargo ücreti almıyor)."],
  ];

  const classLabel = { counted: "Sayıldı", cancelled: "İptal", awaiting_card_payment: "Kart ödemesi bekliyor" } as const;
  const orderRows = rows.map((row) => [
    row.order_number,
    new Date(row.created_at).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }),
    row.customer_name ?? "",
    ORDER_STATUS_LABELS[row.status],
    PAYMENT_STATUS_LABELS[row.payment_status],
    row.payment_method ?? "",
    row.subtotal,
    row.discount_amount,
    row.refunded_amount,
    Math.round((row.subtotal - row.discount_amount - row.refunded_amount) * 100) / 100,
    row.item_quantity,
    classLabel[classifyOrder(row)],
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Metrik", "Değer", "Nasıl hesaplanır"], ...summary]), "Özet");
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["Sipariş no", "Tarih", "Müşteri", "Durum", "Ödeme durumu", "Ödeme yöntemi", "Brüt", "İndirim", "İade", "Net", "Adet", "Raporda"],
      ...orderRows,
    ]),
    "Siparişler",
  );
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="satis-raporu-${report.fromDay}_${report.toDay}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
