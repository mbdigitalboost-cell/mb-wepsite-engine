import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";
import { getPublicCategories } from "@/lib/commerce/public/categories";
import { categoriesWithActiveProducts } from "@/lib/seo/category-coverage";

/**
 * Faz 37 — mağazanın aktif ürünü olan kategorileri (public client; RLS:
 * yalnız aktif kategori/ürün görünür). Okuma hata verirse "hepsi dolu"
 * sayılır (null) — hata yüzünden kategoriler yanlışlıkla noindex olmasın.
 */
export async function getCategoriesWithActiveProducts(storeId: string): Promise<Set<string> | null> {
  const client = createSupabasePublicClient();
  const [categories, linksResult, productsResult] = await Promise.all([
    getPublicCategories(storeId),
    client.from("product_categories").select("category_id, product_id").eq("store_id", storeId),
    client.from("products").select("id").eq("store_id", storeId).eq("is_active", true),
  ]);
  if (linksResult.error || productsResult.error) return null;
  return categoriesWithActiveProducts(
    categories.map((category) => ({ id: category.id, parentId: category.parentId })),
    (linksResult.data ?? []).map((link) => ({ categoryId: link.category_id, productId: link.product_id })),
    new Set((productsResult.data ?? []).map((product) => product.id)),
  );
}
