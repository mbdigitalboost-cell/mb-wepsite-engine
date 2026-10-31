import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface BrandModelRow {
  id: string;
  name: string;
  sortOrder: number;
}

/**
 * Site Tasarımı v3 + Silahını Seç Sistemi devir metni, Kısım C — admin
 * tarafı. migration 0038_brand_models.sql'in kendi tablosu. Bu dosya
 * eski lib/commerce/product-models-by-brand.ts'in (products.models'ten
 * türeten) YERİNİ ALIYOR — o dosya kasıtlı olarak SİLİNMEDİ, bkz. kendi
 * doc comment'i (geriye dönük referans/rollback kolaylığı için
 * bırakıldı), ama artık hiçbir çağıranı yok.
 */

/** "Markalar ve Modeller" ekranının kendi listesi — id dahil (silme/sıralama aksiyonları id'ye ihtiyaç duyuyor). */
export async function getBrandModelsGroupedByBrand(storeId: string): Promise<Record<string, BrandModelRow[]>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("brand_models")
    .select("id, brand_id, name, sort_order")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[brand-models] getBrandModelsGroupedByBrand failed:", error.message);
    return {};
  }

  const result: Record<string, BrandModelRow[]> = {};
  for (const row of data ?? []) {
    const list = result[row.brand_id] ?? [];
    list.push({ id: row.id, name: row.name, sortOrder: row.sort_order });
    result[row.brand_id] = list;
  }
  return result;
}

/**
 * product-form.tsx'in `modelsByBrand` prop'u için — eski
 * getStoreModelsByBrand (lib/commerce/product-models-by-brand.ts) ile
 * BİREBİR AYNI dönüş şekli (Record<string, string[]>), tek fark veri
 * kaynağı (artık brand_models, products.models'ten türetilmiyor) — bu
 * sayede product-form.tsx'in KENDİSİ hiç değişmedi, sadece onu çağıran
 * products/new/page.tsx ve products/[productId]/page.tsx hangi
 * fonksiyonu çağırdığını değiştirdi.
 */
export async function getBrandModelsSuggestionMap(storeId: string): Promise<Record<string, string[]>> {
  const grouped = await getBrandModelsGroupedByBrand(storeId);
  const result: Record<string, string[]> = {};
  for (const [brandId, models] of Object.entries(grouped)) {
    result[brandId] = models.map((m) => m.name);
  }
  return result;
}

/**
 * Katalog kendi kendini zenginleştirsin kuralı (devir metninin kendi
 * talimatı) — bir ürün formunda (ya da Excel import'ta) serbest girilen
 * bir model adı, o markanın brand_models kataloğunda YOKSA otomatik
 * eklensin, admin ayrıca "Markalar ve Modeller" ekranına gidip
 * eklemek zorunda kalmasın. Case-insensitive karşılaştırma (migration
 * 0038'in kendi unique index'iyle TUTARLI) — "TP9" zaten varsa "tp9"
 * tekrar eklenmez.
 *
 * best-effort: bu bir ürün kaydetme/import akışının YAN ETKİSİ, ana
 * işlemi asla engellemez — hata olursa sessizce loglanır, ürünün kendi
 * kaydı/importu BAŞARISIZ OLMAZ (katalog zenginleştirme, kritik yol
 * değil).
 */
export async function ensureBrandModelsExist(storeId: string, brandId: string, modelNames: string[]): Promise<void> {
  const trimmed = [...new Set(modelNames.map((name) => name.trim()).filter(Boolean))];
  if (trimmed.length === 0) return;

  const supabase = await createSupabaseServerClient();

  const { data: existing, error: fetchError } = await supabase
    .from("brand_models")
    .select("name")
    .eq("store_id", storeId)
    .eq("brand_id", brandId);

  if (fetchError) {
    console.error("[brand-models] ensureBrandModelsExist fetch failed:", fetchError.message);
    return;
  }

  const existingLower = new Set((existing ?? []).map((row) => row.name.toLocaleLowerCase("tr")));
  const toInsert = trimmed.filter((name) => !existingLower.has(name.toLocaleLowerCase("tr")));
  if (toInsert.length === 0) return;

  const { error: insertError } = await supabase
    .from("brand_models")
    .insert(toInsert.map((name) => ({ store_id: storeId, brand_id: brandId, name, sort_order: 0 })));

  if (insertError) {
    // Benzersizlik ihlali (iki eşzamanlı istek aynı yeni modeli eklemeye
    // çalışırsa) beklenen/zararsız bir durum — sadece diğer, gerçek
    // hataları logla.
    if (insertError.code !== "23505") {
      console.error("[brand-models] ensureBrandModelsExist insert failed:", insertError.message);
    }
  }
}
