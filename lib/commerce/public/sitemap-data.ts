import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import type { SitemapRecord } from "@/lib/sites/store-sitemap";

/**
 * Faz 28 — mağaza sitemap'i için ham kayıtlar. Diğer public okumalarla
 * AYNI anon client (RLS: yalnız aktif/yayında satırlar görünür); ek olarak
 * is_active=true açıkça filtrelenir. Yalnız slug/is_active/updated_at
 * okunur. Markalar: yalnız aktif ürünü olanlar (getPublicBrandsWithProducts
 * ile aynı mantık, updated_at ile).
 */
export async function getStoreSitemapRecords(storeSlug: string): Promise<{
  categories: SitemapRecord[];
  products: SitemapRecord[];
  brands: SitemapRecord[];
} | null> {
  const store = await getStoreBySlug(storeSlug);
  if (!store) return null;
  const client = createSupabasePublicClient();

  const [categoriesResult, productsResult] = await Promise.all([
    client.from("categories").select("slug, is_active, updated_at").eq("store_id", store.id).eq("is_active", true),
    client.from("products").select("slug, is_active, updated_at, brand_id").eq("store_id", store.id).eq("is_active", true),
  ]);
  if (categoriesResult.error) console.error("[sitemap] categories failed:", categoriesResult.error.message);
  if (productsResult.error) console.error("[sitemap] products failed:", productsResult.error.message);

  const productRows = productsResult.data ?? [];
  const brandIds = [...new Set(productRows.map((row) => row.brand_id).filter((id): id is string => Boolean(id)))];

  let brands: SitemapRecord[] = [];
  if (brandIds.length > 0) {
    const { data, error } = await client
      .from("brands")
      .select("slug, is_active, updated_at")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .in("id", brandIds);
    if (error) console.error("[sitemap] brands failed:", error.message);
    brands = (data ?? []).map((row) => ({ slug: row.slug, isActive: row.is_active, updatedAt: row.updated_at }));
  }

  return {
    categories: (categoriesResult.data ?? []).map((row) => ({ slug: row.slug, isActive: row.is_active, updatedAt: row.updated_at })),
    products: productRows.map((row) => ({ slug: row.slug, isActive: row.is_active, updatedAt: row.updated_at })),
    brands,
  };
}
