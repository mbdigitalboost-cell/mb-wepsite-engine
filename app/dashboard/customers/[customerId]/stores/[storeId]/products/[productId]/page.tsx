import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { ProductForm } from "../product-form";
import { DeleteProductButton } from "../delete-product-button";
import { DuplicateProductButton } from "../duplicate-product-button";
import { updateProductAction, toggleProductActiveAction, deleteProductAction, duplicateProductAction } from "../actions";
import { ProductTabs } from "./product-tabs";
import { isProductTabKey, type ProductTabKey } from "./product-tab-keys";
import { ImagesTab } from "./images-tab";
import { VariantsTab } from "./variants-tab";
import { AddonsTab } from "./addons-tab";

/**
 * Unified product create/edit screen (tabbed) — Temel Bilgiler /
 * Görseller / Varyantlar / Ek Ürün Alanları all on this one page now,
 * instead of separate /images, /variants, /addons routes only reachable
 * after the product was already saved. `?tab=` picks the initially
 * active tab (createProductAction now redirects here with `?tab=images`
 * on successful create, so a brand-new product lands the admin straight
 * on Görseller — see products/actions.ts).
 *
 * All 4 tabs' data is fetched on every load of this page, regardless of
 * which one is initially active — a deliberate, accepted trade-off:
 * switching tabs is then a pure client-side render with zero extra
 * requests (see product-tabs.tsx), and the extra queries this costs on
 * page load are cheap at this catalog's scale (a handful of images/
 * variants/addons per product). No new server action or query logic was
 * written for this — images-tab.tsx/variants-tab.tsx/addons-tab.tsx are
 * the original images/variants/addons page.tsx bodies, moved here
 * unchanged; every action still lives in its own original actions.ts.
 */
export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string; storeId: string; productId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { customerId, storeId, productId } = await params;
  const { tab } = await searchParams;
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
  // Same DuplicateProductButton component as the list page — it renders a
  // bare formAction submit button (no own <form>, see its own doc comment,
  // designed to nest inside the list page's bulk-select form), so here it
  // needs a small wrapping <form> of its own, same shape as toggleActive's.
  const duplicateAction = duplicateProductAction.bind(null, customerId, storeId, productId);
  const initialTab: ProductTabKey = isProductTabKey(tab) ? tab : "basic";

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
        <form action={duplicateAction}>
          <DuplicateProductButton action={duplicateAction} />
        </form>
        <DeleteProductButton productName={product.name} action={deleteAction} />
      </div>

      <div className="mt-6">
        <ProductTabs
          mode="edit"
          initialTab={initialTab}
          basicContent={
            <ProductForm
              initialValues={{
                name: product.name,
                slug: product.slug,
                sku: product.sku ?? "",
                barcode: product.barcode ?? "",
                model: product.model ?? "",
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
          }
          imagesContent={<ImagesTab customerId={customerId} storeId={storeId} productId={productId} />}
          variantsContent={<VariantsTab customerId={customerId} storeId={storeId} productId={productId} />}
          addonsContent={
            <AddonsTab customerId={customerId} storeId={storeId} productId={productId} basePrice={Number(product.price)} />
          }
        />
      </div>
    </div>
  );
}
