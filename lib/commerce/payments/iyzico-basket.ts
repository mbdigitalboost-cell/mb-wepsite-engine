/**
 * Faz 31 — iyzico sepeti (saf; tests/iyzico-basket.test.ts).
 *
 * iyzico kuralı (docs.iyzico.com, Checkout Form / Payment): basketItems
 * fiyatlarının toplamı `price`'a EŞİT olmalı ("Total item price must be
 * equal to price", hata 5062); itemType PHYSICAL | VIRTUAL; satır fiyatı
 * 0 olamaz.
 *
 *  - Ürün satırları: (ürünler − indirim) satırlara oransal dağıtılır (son
 *    satır kuruş farkını alır) — Faz 22 davranışı.
 *  - Kargo ücreti (>0): ayrı satır, itemType VIRTUAL (hizmet; fiziksel mal
 *    değil) — böylece iyzico panelinde ve iadede ayrı görünür.
 *  - Kapıda ödeme ücreti kart siparişinde oluşmaz (yalnız kapıda ödeme);
 *    yine de >0 gelirse ayrı VIRTUAL satır olur, toplam bozulmaz.
 * price = paidPrice = ürünler − indirim + kargo + kapıda ödeme ücreti
 * (orderGrandTotal ile aynı).
 */
export interface IyzicoBasketLine {
  id: string;
  name: string;
  category1: string;
  itemType: "PHYSICAL" | "VIRTUAL";
  price: string;
}

const priceText = (kurus: number) => (kurus / 100).toFixed(2);

export function distributeTotalAcrossLines(lines: Array<{ id: string; name: string; lineTotal: number }>, total: number): IyzicoBasketLine[] {
  const gross = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const totalCents = Math.round(total * 100);
  let allocated = 0;
  return lines.map((line, index) => {
    let cents: number;
    if (index === lines.length - 1) {
      cents = totalCents - allocated;
    } else {
      cents = gross > 0 ? Math.floor((line.lineTotal / gross) * totalCents) : Math.floor(totalCents / lines.length);
      allocated += cents;
    }
    return { id: line.id, name: line.name.slice(0, 200), category1: "Ürün", itemType: "PHYSICAL", price: priceText(Math.max(cents, 1)) };
  });
}

export function buildIyzicoBasket(
  lines: Array<{ id: string; name: string; lineTotal: number }>,
  order: { subtotal: number | string; discount_amount: number | string | null; shipping_fee?: number | string | null; cod_fee?: number | string | null },
): { price: string; items: IyzicoBasketLine[] } {
  const items = Math.round(Number(order.subtotal) * 100);
  const discount = Math.min(Math.round(Number(order.discount_amount ?? 0) * 100), items);
  const shipping = Math.round(Number(order.shipping_fee ?? 0) * 100);
  const cod = Math.round(Number(order.cod_fee ?? 0) * 100);

  const basket = distributeTotalAcrossLines(lines, (items - discount) / 100);
  if (shipping > 0) basket.push({ id: "KARGO", name: "Kargo ücreti", category1: "Kargo", itemType: "VIRTUAL", price: priceText(shipping) });
  if (cod > 0) basket.push({ id: "KAPIDA-ODEME", name: "Kapıda ödeme ücreti", category1: "Hizmet", itemType: "VIRTUAL", price: priceText(cod) });

  return { price: priceText(items - discount + shipping + cod), items: basket };
}
