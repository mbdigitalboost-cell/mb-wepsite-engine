import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";

/**
 * FAZ 2C STEP 33 — public read model, brands. Deliberately narrower than
 * `PublicCategory` (which also carries `storeId`): this turn's own spec
 * says "store_id gibi internal tenant alanlarını client response modeline
 * gereksiz yere taşıma" — a brand has no parent/child relationship a
 * consumer would ever need `storeId` for (unlike categories, whose
 * `parentId` is genuinely useful to callers), so it's left out here.
 */
export interface PublicBrand {
  id: string;
  name: string;
  slug: string;
  /** Site Tasarımı v3 devir metni — marka kartlarında (anasayfa köprüsü + /silahini-sec) gerçek logo varsa göstermek için eklendi. `null` ise çağıran taraf harf rozeti gösteriyor, uydurma bir görsel YOK. */
  logoUrl: string | null;
}

const BRAND_COLUMNS = "id, name, slug, logo_url";

function mapBrand(row: { id: string; name: string; slug: string; logo_url: string | null }): PublicBrand {
  return { id: row.id, name: row.name, slug: row.slug, logoUrl: row.logo_url };
}

/**
 * RLS (migration 0016's own `brands_select_public_active`) already
 * restricts anon rows to `is_active = true` on a publicly-visible store —
 * this function adds no extra filter beyond `store_id`, same fail-soft
 * contract (never throws, `[]`/`null` on error, logged server-side only)
 * as every other lib/commerce/public/* read model.
 */
export async function getPublicBrands(storeId: string): Promise<PublicBrand[]> {
  const client = createSupabasePublicClient();

  const { data, error } = await client
    .from("brands")
    .select(BRAND_COLUMNS)
    .eq("store_id", storeId)
    .order("name", { ascending: true });

  if (error) {
    console.error("[commerce/public] getPublicBrands failed:", error.message);
    return [];
  }

  return (data ?? []).map(mapBrand);
}

export async function getPublicBrandBySlug(storeId: string, brandSlug: string): Promise<PublicBrand | null> {
  const client = createSupabasePublicClient();

  const { data, error } = await client
    .from("brands")
    .select(BRAND_COLUMNS)
    .eq("store_id", storeId)
    .eq("slug", brandSlug)
    .maybeSingle();

  if (error) {
    console.error("[commerce/public] getPublicBrandBySlug failed:", error.message);
    return null;
  }

  if (!data) return null;
  return mapBrand(data);
}

/**
 * FAZ 2C STEP 33 — brands actually represented among a category's active,
 * publicly-visible products (not just "every brand this store has") — the
 * useful set for a future "bu kategoride şu markalar var" filter control.
 * Two store-scoped queries, no N+1: (1) distinct brand_id's among this
 * category's products, (2) one batched `brands` lookup for those ids.
 * Infrastructure only this turn — no route currently calls this (see
 * STEP 33 report's own "Brand filtering" section for why: this turn adds
 * the read model, not a rendered brand-filter UI).
 */
export async function getPublicBrandsForCategory(storeId: string, categoryId: string): Promise<PublicBrand[]> {
  const client = createSupabasePublicClient();

  const { data: productRows, error: productsError } = await client
    .from("products")
    .select("brand_id")
    .eq("store_id", storeId)
    .eq("category_id", categoryId)
    .not("brand_id", "is", null);

  if (productsError) {
    console.error("[commerce/public] getPublicBrandsForCategory product lookup failed:", productsError.message);
    return [];
  }

  const brandIds = [...new Set((productRows ?? []).map((row) => row.brand_id).filter((id): id is string => id !== null))];
  if (brandIds.length === 0) return [];

  const { data: brandRows, error: brandsError } = await client
    .from("brands")
    .select(BRAND_COLUMNS)
    .eq("store_id", storeId)
    .in("id", brandIds)
    .order("name", { ascending: true });

  if (brandsError) {
    console.error("[commerce/public] getPublicBrandsForCategory brand lookup failed:", brandsError.message);
    return [];
  }

  return (brandRows ?? []).map(mapBrand);
}

/**
 * FAZ 7.1 — infrastructure only when first written, wired into
 * /silahini-sec/[brandSlug] since Faz 7.2.
 *
 * Site Tasarımı v3 + Silahını Seç Sistemi devir metni, Kısım C — artık
 * products.models'ten TÜRETİLMİYOR, migration 0038'in merkezi
 * brand_models kataloğundan (admin "Markalar ve Modeller" ekranının
 * yazdığı/okuduğu AYNI tablo) okunuyor, sort_order'a göre sıralı — bu
 * sayede storefront'taki model listesi artık admin'in belirlediği
 * tutarlı sırayla geliyor, ürünlere serbest metin olarak girilmiş
 * dağınık/tutarsız veriden değil. Dönüş TİPİ (string[]) ve bu
 * fonksiyonu çağıran /silahini-sec/[brandSlug]/page.tsx KASITLI OLARAK
 * DEĞİŞMEDİ — sadece veri kaynağı değişti, çağıran kod sıfır değişiklikle
 * çalışıyor. Aynı fail-soft sözleşmesi (hata -> [], asla throw).
 */
export async function getPublicBrandModels(storeId: string, brandId: string): Promise<string[]> {
  const client = createSupabasePublicClient();

  const { data, error } = await client
    .from("brand_models")
    .select("name")
    .eq("store_id", storeId)
    .eq("brand_id", brandId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[commerce/public] getPublicBrandModels failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.name);
}

/**
 * FAZ 7.2 — "Silahını Seç" brand picker's own read model: brands actually
 * represented among a STORE's active, publicly-visible products (not just
 * "every brand row this store has", which could include a brand with zero
 * products left after all its products were deactivated/deleted). Same
 * two-query, no-N+1 shape as getPublicBrandsForCategory above, just
 * without the categoryId narrowing — this is that function's store-wide
 * sibling, not a replacement for it.
 */
export async function getPublicBrandsWithProducts(storeId: string): Promise<PublicBrand[]> {
  const client = createSupabasePublicClient();

  const { data: productRows, error: productsError } = await client
    .from("products")
    .select("brand_id")
    .eq("store_id", storeId)
    .not("brand_id", "is", null);

  if (productsError) {
    console.error("[commerce/public] getPublicBrandsWithProducts product lookup failed:", productsError.message);
    return [];
  }

  const brandIds = [...new Set((productRows ?? []).map((row) => row.brand_id).filter((id): id is string => id !== null))];
  if (brandIds.length === 0) return [];

  const { data: brandRows, error: brandsError } = await client
    .from("brands")
    .select(BRAND_COLUMNS)
    .eq("store_id", storeId)
    .in("id", brandIds)
    .order("name", { ascending: true });

  if (brandsError) {
    console.error("[commerce/public] getPublicBrandsWithProducts brand lookup failed:", brandsError.message);
    return [];
  }

  return (brandRows ?? []).map(mapBrand);
}

export interface PublicBrandWithCount extends PublicBrand {
  /** GERÇEK, canlı sayım (bu mağazadaki aktif ürün sayısı) — uydurma/sabit bir sayı değil. 0 olabilir (ör. SARSILMAZ/GLOCK — henüz hiç ürünü olmayan gerçek markalar). */
  productCount: number;
}

/**
 * Site Tasarımı v3 + Silahını Seç Sistemi devir metni, Kısım A/B —
 * getPublicBrandsWithProducts'ın (SADECE en az 1 ürünü olan markaları
 * döndürür) AKSİNE, bu fonksiyon mağazanın TÜM aktif markalarını, HER
 * BİRİNİN gerçek ürün sayısıyla birlikte döndürür — "Silahını Seç"
 * köprüsünün/marka seçim ızgarasının "SARSILMAZ/GLOCK: 0 ürün, Yakında
 * rozeti" durumunu dürüstçe göstermesi için şart (0 ürünlü bir marka,
 * getPublicBrandsWithProducts'ta hiç görünmez). İki sorgu, N+1 değil:
 * (1) tüm aktif markalar, (2) store'un tüm ürünlerinin brand_id'si,
 * client-side sayılıp eşleniyor — getPublicBrandsForCategory'nin kendi
 * "iki sorgu, client-side eşleştir" deseniyle AYNI.
 */
export async function getPublicBrandsWithProductCounts(storeId: string): Promise<PublicBrandWithCount[]> {
  const client = createSupabasePublicClient();

  const [{ data: brandRows, error: brandsError }, { data: productRows, error: productsError }] = await Promise.all([
    client.from("brands").select(BRAND_COLUMNS).eq("store_id", storeId).order("name", { ascending: true }),
    client.from("products").select("brand_id").eq("store_id", storeId).not("brand_id", "is", null),
  ]);

  if (brandsError) {
    console.error("[commerce/public] getPublicBrandsWithProductCounts brand lookup failed:", brandsError.message);
    return [];
  }
  if (productsError) {
    console.error("[commerce/public] getPublicBrandsWithProductCounts product lookup failed:", productsError.message);
  }

  const countByBrandId = new Map<string, number>();
  for (const row of productRows ?? []) {
    if (!row.brand_id) continue;
    countByBrandId.set(row.brand_id, (countByBrandId.get(row.brand_id) ?? 0) + 1);
  }

  return (brandRows ?? []).map((row) => ({ ...mapBrand(row), productCount: countByBrandId.get(row.id) ?? 0 }));
}
