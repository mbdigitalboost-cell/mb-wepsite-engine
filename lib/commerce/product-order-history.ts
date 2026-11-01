import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Admin Panel İşlevsellik devir metni, Kısım A — koşullu kalıcı ürün
 * silme. `order_items.product_id -> products(id)` FK'si `ON DELETE SET
 * NULL` (information_schema.referential_constraints ile doğrulandı,
 * migration 0029) — yani DB SEVİYESİNDE bir ürünü silmek asla engellenmiş
 * değil, sadece geçmiş sipariş satırlarının `product_id`'si null'a döner
 * (satırın kendisi, `product_name`/`unit_price` snapshot'larıyla birlikte
 * kalır). Bu fonksiyon o DB izninden BAĞIMSIZ bir UYGULAMA KURALI
 * uyguluyor: en az bir `order_items` satırı olan bir ürün hiç
 * silinemesin — "sipariş geçmişi korunuyor" vaadi veritabanı
 * davranışına değil, bu kontrole dayanıyor.
 *
 * Sayım `order_items` SATIR sayısı, benzersiz sipariş sayısı DEĞİL —
 * devir metninin kendi doğrulanmış verisiyle tutarlı ("4 kez sipariş
 * edilmiş" = 4 order_items satırı, aynı üründen aynı siparişte 2 adet
 * alınmışsa bile iki ayrı satır).
 */
export async function getProductOrderCount(storeId: string, productId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("product_id", productId);
  return count ?? 0;
}
