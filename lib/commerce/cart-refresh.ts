/**
 * Faz 34 Kısım B — sepetin ESKİ fiyatlarını sunucudaki güncel fiyatla
 * eşitleme (saf; tests/cart-refresh.test.ts). Sepet localStorage'da fiyatı
 * ekleme anındaki değerle tutar (cart-context.tsx); sepet sayfası açılınca
 * her satır sunucuda yeniden fiyatlanır (resolve-cart.ts — sipariş ile aynı
 * kurallar) ve bu modül farkları uygular. Sipariş tutarı yine sunucuda
 * hesaplanır (Faz 32 expectedTotal); bu yalnız müşterinin yanlış fiyat
 * görmemesi içindir.
 */
export interface CartLineSnapshot {
  lineId: string;
  productName: string;
  unitPrice: number;
}

export type ServerLinePrice = { lineId: string; ok: true; unitPrice: number } | { lineId: string; ok: false; reason: string };

export interface CartRefreshPlan {
  priceUpdates: Array<{ lineId: string; unitPrice: number; previousPrice: number }>;
  removals: Array<{ lineId: string; productName: string; reason: string }>;
}

const kurus = (value: number) => Math.round(value * 100);

export function planCartRefresh(items: readonly CartLineSnapshot[], results: readonly ServerLinePrice[]): CartRefreshPlan {
  const byLine = new Map(results.map((result) => [result.lineId, result]));
  const plan: CartRefreshPlan = { priceUpdates: [], removals: [] };
  for (const item of items) {
    const result = byLine.get(item.lineId);
    if (!result) continue; // sunucu bu satırı değerlendirmedi (ör. istek sırasında eklendi) — dokunma
    if (!result.ok) plan.removals.push({ lineId: item.lineId, productName: item.productName, reason: result.reason });
    else if (kurus(result.unitPrice) !== kurus(item.unitPrice)) plan.priceUpdates.push({ lineId: item.lineId, unitPrice: result.unitPrice, previousPrice: item.unitPrice });
  }
  return plan;
}

export function priceChangeNote(previousPrice: number, unitPrice: number, format: (value: number) => string): string {
  return `Bu ürünün fiyatı güncellendi: ${format(previousPrice)} → ${format(unitPrice)}`;
}

export function removalNote(productName: string, reason: string): string {
  return `"${productName}" sepetinizden çıkarıldı: ${reason}`;
}
