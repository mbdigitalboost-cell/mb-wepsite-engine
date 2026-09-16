import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { ProductForm } from "../product-form";
import { DeleteProductButton } from "../delete-product-button";
import { updateProductAction, toggleProductActiveAction, deleteProductAction } from "../actions";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ customerId: string; storeId: string; productId: string }>;
}) {
  const { customerId, storeId, productId } = await params;
  await requireStoreAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase
    .from("stores")
    .select("id, name")
    .eq("id", storeId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (!store) notFound();

  const [{ data: product }, { data: categories }, { data: brands }] = await Promise.all([
    supabase.from("products").select("*").eq("id", productId).eq("store_id", storeId).maybeSingle(),
    supabase.from("categories").select("id, name").eq("store_id", storeId).order("name", { ascending: true }),
    supabase.from("brands").select("id, name").eq("store_id", storeId).order("name", { ascending: true }),
  ]);

  if (!product) notFound();

  const toggleActive = toggleProductActiveAction.bind(null, customerId, storeId, productId, !product.is_active);
  const deleteAction = deleteProductAction.bind(null, customerId, storeId, productId);

  return (
    <div>
      <Link
        href={`/dashboard/customers/${customerId}/stores/${storeId}/products`}
        className="text-xs text-foreground/50 hover:text-foreground hover:underline"
      >
        ← {store.name} · Products
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{product.name}</h1>
        <Badge variant={product.is_active ? "solid" : "outline"}>{product.is_active ? "Aktif" : "Pasif"}</Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <form action={toggleActive}>
          <button
            type="submit"
            className="rounded px-2 py-1 text-xs text-foreground/60 underline-offset-2 hover:text-foreground hover:underline"
          >
            {product.is_active ? "Pasifleştir" : "Aktifleştir"}
          </button>
        </form>
        <DeleteProductButton productName={product.name} action={deleteAction} />
      </div>

      <div className="mt-4">
        <Link
          href={`/dashboard/customers/${customerId}/stores/${storeId}/products/${productId}/images`}
          className="text-sm text-brand-accent underline-offset-2 hover:underline"
        >
          Görseller →
        </Link>
      </div>

      <div className="mt-6">
        <ProductForm
          initialValues={{
            name: product.name,
            slug: product.slug,
            sku: product.sku ?? "",
            shortDescription: product.short_description ?? "",
            description: product.description ?? "",
            categoryId: product.category_id ?? "",
            brandId: product.brand_id ?? "",
            price: Number(product.price),
            compareAtPrice: product.compare_at_price === null ? "" : Number(product.compare_at_price),
            stock: product.stock,
            sortOrder: product.sort_order,
            seoTitle: product.seo_title ?? "",
            seoDescription: product.seo_description ?? "",
          }}
          initialTrackInventory={product.track_inventory}
          initialIsActive={product.is_active}
          categoryOptions={categories ?? []}
          brandOptions={brands ?? []}
          action={updateProductAction.bind(null, customerId, storeId, productId)}
          submitLabel="Değişiklikleri Kaydet"
        />
      </div>
    </div>
  );
}
