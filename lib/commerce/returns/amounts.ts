/**
 * Faz 30 — iade TUTARI (saf, kuruş tamsayısıyla; tests/returns.test.ts).
 * Tutar her zaman sunucuda, veritabanındaki kalem anlık görüntülerinden
 * hesaplanır; istemciden gelen tutara güvenilmez.
 *
 * Kurallar:
 *  - order_items.line_total ek ürünleri (order_item_addons) zaten içerir
 *    (unit_price = taban + varyant + ek ürün farkları) → ek ürün kalemle
 *    birlikte iade edilir.
 *  - Kısmi adet: line_total × (iade adedi / satın alınan adet).
 *  - Sipariş indirimi (discount_amount) iade edilen değere ORANSAL dağıtılır:
 *    pay = indirim × (iade edilen brüt / sipariş brütü).
 *  - Siparişin kalan son parçası iade ediliyorsa tutar, yuvarlama farkı
 *    kalmasın diye "ödenen net − daha önce iade edilen" olarak alınır.
 *  - Hiçbir zaman ödenen netten fazla iade edilmez.
 */

export interface RefundOrderInput {
  subtotal: number;
  discountAmount: number;
  /** Bu siparişte daha önce gerçekten iade edilmiş para toplamı (refunded talepler). */
  alreadyRefunded: number;
}

export interface RefundLineInput {
  orderItemId: string;
  lineTotal: number;
  /** Satın alınan adet. */
  quantity: number;
  /** Bu talepte iade edilen adet. */
  returnQuantity: number;
  /** Daha önceki (reddedilmemiş/vazgeçilmemiş) taleplerde iade edilmiş adet. */
  previouslyReturnedQuantity: number;
}

export interface RefundResult {
  total: number;
  lines: Array<{ orderItemId: string; refund: number }>;
  /** Talep, siparişin kalan tüm kalemlerini kapsıyor mu? */
  coversRemainder: boolean;
}

const toKurus = (value: number) => Math.round(Number(value) * 100);
const fromKurus = (value: number) => value / 100;

export function computeReturnRefund(order: RefundOrderInput, lines: RefundLineInput[]): RefundResult {
  const subtotal = toKurus(order.subtotal);
  const discount = Math.min(toKurus(order.discountAmount), subtotal);
  const netPaid = subtotal - discount;
  const remainingRefundable = Math.max(0, netPaid - toKurus(order.alreadyRefunded));

  let coversRemainder = lines.length > 0;
  const raw = lines.map((line) => {
    if (line.returnQuantity < 1 || line.returnQuantity > line.quantity - line.previouslyReturnedQuantity) {
      throw new Error(`invalid return quantity for ${line.orderItemId}`);
    }
    if (line.previouslyReturnedQuantity + line.returnQuantity < line.quantity) coversRemainder = false;
    const gross = Math.round((toKurus(line.lineTotal) * line.returnQuantity) / line.quantity);
    const discountShare = subtotal > 0 ? Math.round((discount * gross) / subtotal) : 0;
    return { orderItemId: line.orderItemId, refund: Math.max(0, gross - discountShare) };
  });

  return { total: fromKurus(Math.min(raw.reduce((sum, line) => sum + line.refund, 0), remainingRefundable)), lines: raw.map((l) => ({ ...l, refund: fromKurus(l.refund) })), coversRemainder };
}

/**
 * Talep tüm siparişin kalanını kapsıyorsa (tam iade/iptal) yuvarlama farkını
 * sıfırlamak için toplam = kalan iade edilebilir tutar. Çağıran, siparişin
 * TÜM kalemlerinin bu talepte bittiğini bildiğinde kullanır.
 */
export function computeFinalRefund(order: RefundOrderInput, lines: RefundLineInput[], allItemsCovered: boolean): RefundResult {
  const result = computeReturnRefund(order, lines);
  if (!allItemsCovered) return result;
  const netPaid = toKurus(order.subtotal) - Math.min(toKurus(order.discountAmount), toKurus(order.subtotal));
  const remaining = Math.max(0, netPaid - toKurus(order.alreadyRefunded));
  return { ...result, total: fromKurus(remaining), coversRemainder: true };
}

/** Siparişin net tutarı (brüt − indirim) — rapor ve iptal tutarı için tek tanım. */
export function orderNetAmount(subtotal: number, discountAmount: number): number {
  const s = toKurus(subtotal);
  return fromKurus(s - Math.min(toKurus(discountAmount), s));
}
