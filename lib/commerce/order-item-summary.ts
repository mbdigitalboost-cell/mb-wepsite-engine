/**
 * Faz 25 — bir siparişin ürün satırlarının kısa, okunabilir özeti:
 * "Canik Kılıf (Coyote (Çöl)) ×1, Palaska ×2". Admin sipariş listesi ve
 * Basit Kargo içerik adı aynı biçimi kullanır (renk ürün adının yanında).
 */
export interface OrderItemSummaryRow {
  product_name: string;
  variant_label: string | null;
  quantity: number;
}

export function formatOrderItem(item: OrderItemSummaryRow): string {
  return `${item.product_name}${item.variant_label ? ` (${item.variant_label})` : ""} ×${item.quantity}`;
}

export function summarizeOrderItems(items: OrderItemSummaryRow[], maxLength = 180): string {
  const text = items.map(formatOrderItem).join(", ");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}
