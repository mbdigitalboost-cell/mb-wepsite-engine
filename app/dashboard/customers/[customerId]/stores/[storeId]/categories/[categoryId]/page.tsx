import { notFound } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";
import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { addProductsToCategoryAction, removeProductFromCategoryAction } from "./actions";
import { AddProductsPanel } from "./add-products-panel";

/**
 * Faz 27 — kategori detay: "Bu kategorideki ürünler" + "Ürün Ekle"
 * (çoklu kategori, yön 2). Görüntüleme requireStoreAccess (diğer kategori
 * ekranlarıyla aynı); ekleme/çıkarma action'ları store_editor+.
 */
export default async function CategoryProductsPage({
  params,
}: {
  params: Promise<{ customerId: string; storeId: string; categoryId: string }>;
}) {
  const { customerId, storeId, categoryId } = await params;
  await requireStoreAccess(storeId, customerId);

  const supabase = await createSupabaseServerClient();
  const [{ data: store }, { data: category }] = await Promise.all([
    supabase.from("stores").select("id, name").eq("id", storeId).eq("customer_id", customerId).maybeSingle(),
    supabase.from("categories").select("id, name, slug, parent_id, is_active").eq("id", categoryId).eq("store_id", storeId).maybeSingle(),
  ]);
  if (!store || !category) notFound();

  const [{ data: links }, { data: products }] = await Promise.all([
    supabase.from("product_categories").select("product_id, is_primary").eq("store_id", storeId).eq("category_id", categoryId),
    supabase.from("products").select("id, name, sku, is_active, price").eq("store_id", storeId).order("name", { ascending: true }),
  ]);
  const linkByProduct = new Map((links ?? []).map((link) => [link.product_id, link]));
  const allProducts = products ?? [];
  const inCategory = allProducts.filter((p) => linkByProduct.has(p.id));
  const base = `/dashboard/customers/${customerId}/stores/${storeId}`;

  return (
    <div>
      <Link href={`${base}/categories`} className="text-xs text-foreground/50 hover:text-foreground hover:underline">
        ← {store.name} · Kategoriler
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{category.name}</h1>
        {!category.is_active ? <Badge variant="outline">Pasif kategori</Badge> : null}
      </div>
      <p className="mt-1 text-sm text-foreground/60">
        Bu kategorideki ürünler. Bir ürün birden çok kategoride olabilir; ★ işaretli olanlarda bu kategori ürünün ana kategorisidir
        (breadcrumb ve SEO). Buradan eklenen ürünlerin ana kategorisi değişmez.
      </p>

      <div className="mt-5">
        <AddProductsPanel
          action={addProductsToCategoryAction.bind(null, customerId, storeId, categoryId)}
          products={allProducts.map((p) => ({ id: p.id, name: p.name, sku: p.sku, isActive: p.is_active, alreadyInCategory: linkByProduct.has(p.id) }))}
        />
      </div>

      <div className="mt-6 rounded-lg border border-black/10">
        {inCategory.length === 0 ? (
          <p className="p-4 text-sm text-foreground/60">Bu kategoride henüz ürün yok.</p>
        ) : (
          <ul className="divide-y divide-black/10">
            {inCategory.map((product) => {
              const isPrimary = linkByProduct.get(product.id)?.is_primary ?? false;
              return (
                <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    {isPrimary ? <Star size={14} className="shrink-0 text-[#B34C00]" fill="currentColor" aria-label="Ana kategori" /> : null}
                    <Link href={`${base}/products/${product.id}`} className="truncate font-medium text-foreground hover:underline">
                      {product.name}
                    </Link>
                    {product.sku ? <span className="font-mono text-xs text-foreground/50">{product.sku}</span> : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={product.is_active ? "success" : "warning"}>{product.is_active ? "Yayında" : "Yayında değil"}</Badge>
                    <form action={removeProductFromCategoryAction.bind(null, customerId, storeId, categoryId, product.id)}>
                      <button
                        type="submit"
                        title={isPrimary ? "Ana kategori çıkarılırsa ürünün kalan kategorilerinden biri ana olur" : undefined}
                        className="text-xs text-red-600 underline-offset-2 hover:underline"
                      >
                        Çıkar
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
