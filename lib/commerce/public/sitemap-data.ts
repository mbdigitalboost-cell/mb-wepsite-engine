import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import type { SitemapRecord } from "@/lib/sites/store-sitemap";
import { getPublishedLegalDocuments, getSellerIdentity } from "@/lib/legal/store-legal";
import { LEGAL_PAGE_LINKS } from "@/lib/legal/links";
import { getCategoriesWithActiveProducts } from "@/lib/seo/category-coverage-server";

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
  legalPaths: string[];
} | null> {
  const store = await getStoreBySlug(storeSlug);
  if (!store) return null;
  const client = createSupabasePublicClient();

  const [categoriesResult, productsResult] = await Promise.all([
    client.from("categories").select("id, slug, is_active, updated_at").eq("store_id", store.id).eq("is_active", true),
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

  // Faz 33 — yalnız yayımlanmış metinlerin sayfaları; /iletisim satıcı kaydı varsa.
  const [legalDocuments, seller] = await Promise.all([getPublishedLegalDocuments(store.id), getSellerIdentity(store.id)]);
  const legalPaths = LEGAL_PAGE_LINKS.filter((link) => (link.kind ? legalDocuments.has(link.kind) : Boolean(seller))).map((link) => link.path);

  // Faz 37 — aktif ürünü (kendisinde ya da alt kategorisinde) olmayan kategori sitemap'e girmez.
  const filled = await getCategoriesWithActiveProducts(store.id);

  return {
    legalPaths,
    categories: (categoriesResult.data ?? [])
      .filter((row) => filled === null || filled.has(row.id))
      .map((row) => ({ slug: row.slug, isActive: row.is_active, updatedAt: row.updated_at })),
    products: productRows.map((row) => ({ slug: row.slug, isActive: row.is_active, updatedAt: row.updated_at })),
    brands,
  };
}
