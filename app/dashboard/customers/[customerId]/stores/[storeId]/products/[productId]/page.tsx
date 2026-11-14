import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBrandModelsSuggestionMap } from "@/lib/commerce/brand-models";
import { getAdminCategoryOptions, getProductCategoryLinks } from "@/lib/commerce/category-options";
import { getProductOrderCount } from "@/lib/commerce/product-order-history";
import { findStoreSiteBySlug } from "@/lib/sites/registry";
import { Badge } from "@/components/ui/badge";
import {
  ProductBasicsCard,
  ProductCard,
  ProductFormRoot,
  ProductInventoryCard,
  ProductOrganizationCard,
  ProductPricingCard,
  ProductSaveBar,
  ProductSeoCard,
  ProductStatusCard,
} from "../product-form";
import { DeleteProductButton } from "../delete-product-button";
import { DuplicateProductButton } from "../duplicate-product-button";
import { updateProductAction, toggleProductActiveAction, deleteProductAction, duplicateProductAction } from "../actions";
import { ImagesTab } from "./images-tab";
import { VariantsTab } from "./variants-tab";
import { AddonsTab } from "./addons-tab";

/**
 * Faz 27 Kısım B — tek sayfa ürün formu (Shopify düzeni). Sekmeler kalktı:
 *  Sol: Temel bilgiler → Görseller → Fiyat → Stok → Renk ve seçenekler →
 *       Ek ürün alanları → Arama motoru görünümü.
 *  Sağ: Durum (Yayında / Taslak) → Ürün organizasyonu (çoklu kategori,
 *       marka, uyumlu modeller) → Kargo.
 *  Altta sabit Kaydet çubuğu.
 *
 * images-tab / variants-tab / addons-tab ve tüm action'ları DEĞİŞMEDEN
 * dikey bölümlere taşındı (Eylül'deki sekme birleştirmesiyle aynı mantık,
 * bu sefer sekme yerine bölüm). Temel alanlar ProductFormRoot'un tek
 * formuna `form` niteliğiyle bağlı — bkz. product-form.tsx.
 */
export default async function EditProductPage({
  params,
}: {
  params: Promise<{ customerId: string; storeId: string; productId: string }>;
}) {
  const { customerId, storeId, productId } = await params;
  const { isAdmin } = await requireStoreAccess(storeId, customerId);

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id, name, slug").eq("id", storeId).eq("customer_id", customerId).maybeSingle();
  if (!store) notFound();

  const [{ data: product }, categoryOptions, { data: brands }, modelsByBrand, orderCount, categoryLinks, { count: variantCount }] = await Promise.all([
    supabase.from("products").select("*").eq("id", productId).eq("store_id", storeId).maybeSingle(),
    getAdminCategoryOptions(storeId),
    supabase.from("brands").select("id, name").eq("store_id", storeId).order("name", { ascending: true }),
    getBrandModelsSuggestionMap(storeId),
    getProductOrderCount(storeId, productId),
    getProductCategoryLinks(storeId, productId),
    supabase.from("product_variants").select("id", { count: "exact", head: true }).eq("product_id", productId).eq("store_id", storeId),
  ]);
  if (!product) notFound();

  const toggleActive = toggleProductActiveAction.bind(null, customerId, storeId, productId, !product.is_active);
  const deleteAction = deleteProductAction.bind(null, customerId, storeId, productId);
  const duplicateAction = duplicateProductAction.bind(null, customerId, storeId, productId);
  // Faz 29 — arama önizlemesi mağazanın gerçek (temiz) adresini gösterir: t46store.com/urun/...
  const storeSite = findStoreSiteBySlug(store.slug);
  const storePathPrefix = storeSite ? new URL(storeSite.canonicalOrigin).host.replace(/^www\./, "") : `…/store/${store.slug}`;
  const hasVariants = (variantCount ?? 0) > 0;

  return (
    <div>
      <Link
        href={`/dashboard/customers/${customerId}/stores/${storeId}/products`}
        className="text-xs text-foreground/50 hover:text-foreground hover:underline"
      >
        ← {store.name} · Ürünler
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-xl font-semibold tracking-tight">{product.name}</h1>
          <Badge variant={product.is_active ? "success" : "warning"}>{product.is_active ? "Yayında" : "Taslak"}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action={duplicateAction}>
            <DuplicateProductButton action={duplicateAction} />
          </form>
          {isAdmin ? <DeleteProductButton productName={product.name} orderCount={orderCount} action={deleteAction} /> : null}
          <form action={toggleActive}>
            <button
              type="submit"
              className={`inline-flex h-9 items-center rounded-lg px-4 text-sm font-semibold ${
                product.is_active ? "border border-[#E4E4E7] bg-white text-[#17171A] hover:border-[#17171A]" : "bg-[#B34C00] text-white hover:bg-[#8F3D00]"
              }`}
            >
              {product.is_active ? "Taslağa al" : "Yayınla"}
            </button>
          </form>
        </div>
      </div>
      {!product.is_active ? (
        <p className="mt-1 text-xs text-[#71717A]">
          Bu ürün taslak: mağazada görünmez. Bilgileri kaydedip hazır olunca &quot;Yayınla&quot;ya basın.
        </p>
      ) : null}

      <ProductFormRoot action={updateProductAction.bind(null, customerId, storeId, productId)}>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="min-w-0 space-y-6">
            <ProductBasicsCard
              initial={{ name: product.name, shortDescription: product.short_description ?? "", description: product.description ?? "" }}
            />

            <ProductCard id="gorseller" title="Görseller" description="Birincil görsel kapak olur; liste sırası 'Sıra' ile belirlenir.">
              <ImagesTab customerId={customerId} storeId={storeId} productId={productId} />
            </ProductCard>

            <ProductPricingCard
              initial={{ price: Number(product.price), compareAtPrice: product.compare_at_price === null ? "" : Number(product.compare_at_price) }}
            />

            <ProductInventoryCard
              initial={{ sku: product.sku ?? "", barcode: product.barcode ?? "", stock: product.stock }}
              initialTrackInventory={product.track_inventory}
              hasVariants={hasVariants}
            />

            <ProductCard id="secenekler" title="Renk ve seçenekler">
              <details open={hasVariants} className="group">
                <summary className="cursor-pointer list-none rounded-lg border border-dashed border-[#D4D4D8] px-4 py-3 text-sm text-[#52525B] hover:border-[#B34C00] group-open:mb-4">
                  {hasVariants ? "Renkler ve varyantlar" : "+ Beden veya renk gibi seçenekler ekleyin"}
                </summary>
                <VariantsTab customerId={customerId} storeId={storeId} productId={productId} />
              </details>
            </ProductCard>

            <ProductCard id="ek-alanlar" title="Ek ürün alanları" description="Kılıf üstü yazı gibi ücretli ekler.">
              <AddonsTab customerId={customerId} storeId={storeId} productId={productId} basePrice={Number(product.price)} />
            </ProductCard>

            <ProductSeoCard
              storePathPrefix={storePathPrefix}
              initial={{
                name: product.name,
                slug: product.slug,
                seoTitle: product.seo_title ?? "",
                seoDescription: product.seo_description ?? "",
                sortOrder: product.sort_order,
              }}
            />
          </div>

          <aside className="space-y-6 lg:sticky lg:top-6">
            <ProductStatusCard initialIsActive={product.is_active} />
            <ProductOrganizationCard
              categoryOptions={categoryOptions}
              initialCategoryIds={categoryLinks.ids}
              initialPrimaryCategoryId={categoryLinks.primaryId ?? product.category_id}
              brandOptions={brands ?? []}
              initialBrandId={product.brand_id ?? ""}
              modelsByBrand={modelsByBrand}
              initialModels={product.models ?? []}
            />
            <ProductCard title="Kargo">
              <p className="text-xs text-[#71717A]">
                Ürün bazlı desi alanı henüz yok; Basit Kargo gönderiminde mağazanın varsayılan desi/kg değeri kullanılır.{" "}
                <Link href={`/dashboard/customers/${customerId}/stores/${storeId}/shipping`} className="text-[#B34C00] underline-offset-2 hover:underline">
                  Kargo ayarları →
                </Link>
              </p>
            </ProductCard>
          </aside>
        </div>

        <ProductSaveBar label="Kaydet" />
      </ProductFormRoot>
    </div>
  );
}
