import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Space_Grotesk, Inter } from "next/font/google";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import {
  getPublicProductBySlug,
  getPublicProductImages,
  getPublicProductOptions,
  getPublicProductVariants,
  getPublicProductAddons,
  getPublicProducts,
  getPublicBestSellingProducts,
  type PublicProduct,
} from "@/lib/commerce/public/products";
import { getPublicCategories } from "@/lib/commerce/public/categories";
import { Container } from "@/components/ui/container";
import { StorefrontCtaBand } from "@/components/commerce/public/storefront-cta-band";
import { ProductImageCardGrid } from "@/components/commerce/public/product-image-card-grid";
import { ProductConfigurator } from "./product-configurator";

/**
 * Faz 12 devamı (Part A) — "Çok Satanlar"/"Benzer Ürünler" kartları için her
 * ürünün birincil görselini çözüyor. Homepage'in FeaturedProductsSection'ı
 * (page.tsx, taktikalp46-homepage-sections.tsx) ile AYNI desen: en fazla 4
 * ürünlük, sınırlı bir liste için ürün başına bir getPublicProductImages
 * çağrısı kabul edilebilir bir maliyet (products.ts'in genel liste
 * sayfaları için bunu reddeden kendi doc comment'i burada geçerli değil —
 * orada sınırsız sayıda ürün vardı).
 */
async function attachPrimaryImages(
  storeId: string,
  products: PublicProduct[],
): Promise<(PublicProduct & { imageUrl: string | null })[]> {
  return Promise.all(
    products.map(async (product) => {
      const images = await getPublicProductImages(storeId, product.id);
      const primary = images.find((image) => image.isPrimary) ?? images[0] ?? null;
      return { ...product, imageUrl: primary?.url ?? null };
    }),
  );
}

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500"] });

/**
 * FAZ 2C-3 STEP 22, configurator mounted in FAZ 1 (mağaza sepeti) —
 * product detail. `stock` (raw count) is never rendered — see
 * lib/commerce/public/products.ts's own field-contract comment for why
 * (raw inventory counts aren't exposed to the storefront); ProductConfigurator
 * only ever shows a derived inStock boolean, at the variant/addon level.
 *
 * Faz 12 devamı (Part A) — v2 koyu tema. Bu sayfa Faz 1'de (v2 brief'inden
 * ÇOK önce) yazılmıştı ve bugüne kadar hiç dokunulmamıştı — hâlâ tamamen
 * eski/açık temaydı (grep'le teyit edildi: hiçbir v2 token'ı yoktu).
 * Breadcrumb ("Ana Sayfa · Kategori · Ürün") GERÇEK veriden: product.categoryId
 * -> getPublicCategories(store.id) içinden eşleşen satır (ayrı bir
 * getPublicCategoryById fonksiyonu YOK, mevcut "tüm kategorileri çek, id'ye
 * göre bul" deseni zaten başka sayfalarda da kullanılıyor — yeni bir DB
 * fonksiyonu icat etmek yerine). Kategori silinmiş/kaldırılmışsa (nadir)
 * breadcrumb'ta sadece "Ana Sayfa · Ürün Adı" görünür, hata vermez.
 *
 * StorefrontCtaBand (components/commerce/public/storefront-cta-band.tsx —
 * daha önce "Silahını Seç" akışına özel, SilahiniSecCtaBand adındaydı; bu
 * sayfa da onu çağırınca isim artık yanıltıcıydı, bu yüzden genelleştirildi,
 * davranışı DEĞİŞMEDİ) sayfanın en altına AYNEN yeniden kullanıldı — yeni
 * bir bileşen yazılmadı.
 *
 * Faz 12 devamı (2. tur, Part A) — "Çok Satanlar" (getPublicBestSellingProducts,
 * gerçek order_items satış adedi) ve "Benzer Ürünler" (aynı kategori,
 * getPublicProducts'ın var olan categoryId filtresi) bölümleri eklendi —
 * ikisi de görüntülenen ürün HARİÇ, gerçek veri yoksa (sipariş yok / aynı
 * kategoride başka ürün yok) hiç render edilmiyor (bkz. ProductImageCardGrid'in
 * kendi doc comment'i).
 */
export default async function StoreProductPage({
  params,
}: {
  params: Promise<{ storeSlug: string; productSlug: string }>;
}) {
  const { storeSlug, productSlug } = await params;

  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const product = await getPublicProductBySlug(store.id, productSlug);
  if (!product) notFound();

  const [images, optionGroups, variants, addons, categories] = await Promise.all([
    getPublicProductImages(store.id, product.id),
    getPublicProductOptions(store.id, product.id),
    getPublicProductVariants(store.id, product.id),
    getPublicProductAddons(store.id, product.id),
    getPublicCategories(store.id),
  ]);
  const primaryImage = images.find((image) => image.isPrimary) ?? images[0] ?? null;
  const category = categories.find((c) => c.id === product.categoryId) ?? null;

  // "Çok Satanlar" / "Benzer Ürünler" — görüntülenen üründen HARİÇ, her
  // ikisi de gerçek veriden (sahte/placeholder ürün YOK). Katalog bugün
  // küçük olduğu için (~2 test ürünü) bu bölümler boş/az görünebilir —
  // beklenen bir durum.
  const [bestSellersRaw, similarRaw] = await Promise.all([
    getPublicBestSellingProducts(store.id, 5),
    product.categoryId ? getPublicProducts(store.id, { categoryId: product.categoryId }) : Promise.resolve([]),
  ]);
  const bestSellers = bestSellersRaw.filter((p) => p.id !== product.id).slice(0, 4);
  const similarProducts = similarRaw.filter((p) => p.id !== product.id).slice(0, 4);
  const [bestSellersWithImages, similarWithImages] = await Promise.all([
    attachPrimaryImages(store.id, bestSellers),
    attachPrimaryImages(store.id, similarProducts),
  ]);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Container className="py-10">
        <nav aria-label="Breadcrumb" className={`${inter.className} flex flex-wrap items-center gap-1.5 text-xs text-[#A3A3A3]`}>
          <Link href={`/store/${storeSlug}`} className="hover:text-[#F5F5F5] hover:underline">
            Ana Sayfa
          </Link>
          {category ? (
            <>
              <span aria-hidden="true">·</span>
              <Link href={`/store/${storeSlug}/kategori/${category.slug}`} className="hover:text-[#F5F5F5] hover:underline">
                {category.name}
              </Link>
            </>
          ) : null}
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-[#F5F5F5]">{product.name}</span>
        </nav>

        <div className={`${inter.className} mt-6 grid gap-8 lg:grid-cols-2`}>
          <div>
            {primaryImage?.url ? (
              <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-[#292929] bg-[#171717]">
                {/* unoptimized — signed URL, short-lived and not on next.config.ts's remotePatterns allowlist (which only covers the public object path shape), same reasoning as the admin ImagePreview in images/page.tsx. */}
                <Image
                  src={primaryImage.url}
                  alt={primaryImage.altText ?? product.name}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-[#292929] bg-[#171717] text-sm text-[#A3A3A3]">
                Görsel yok
              </div>
            )}

            {images.length > 1 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {images.map((image) => (
                  <li
                    key={image.id}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-[#292929] bg-[#171717]"
                  >
                    {image.url ? (
                      <Image
                        src={image.url}
                        alt={image.altText ?? product.name}
                        fill
                        unoptimized
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div>
            {/* STEP 33 display-only — product.brand already resolved by getPublicProductBySlug/attachBrandsToProducts, no extra query here. No link/filter, plain label. */}
            {product.brand ? (
              <p className="text-xs font-medium uppercase tracking-wide text-[#A3A3A3]">{product.brand.name}</p>
            ) : null}
            <h1 className={`${spaceGrotesk.className} text-2xl font-bold tracking-tight text-[#F5F5F5]`}>{product.name}</h1>

            {product.shortDescription ? (
              <p className="mt-4 text-sm text-[#A3A3A3]">{product.shortDescription}</p>
            ) : null}
            {product.description ? (
              <p className="mt-4 whitespace-pre-line text-sm text-[#A3A3A3]">{product.description}</p>
            ) : null}

            {/*
              FAZ 1 (mağaza sepeti/configurator) — the single price display
              for this page now lives inside ProductConfigurator itself (it
              starts at product.price/compareAtPrice and updates live as
              option/addon selections change) — the static price block that
              used to sit here was removed rather than kept alongside it, to
              avoid ever showing two numbers that could disagree.
            */}
            <ProductConfigurator
              productId={product.id}
              productSlug={product.slug}
              productName={product.name}
              productPrice={product.price}
              productCompareAtPrice={product.compareAtPrice}
              imageUrl={primaryImage?.url ?? null}
              optionGroups={optionGroups}
              variants={variants}
              addons={addons}
            />
          </div>
        </div>

        {/* Ürün bilgisinin ALTINA, StorefrontCtaBand'in ÜSTÜNE — bant sayfanın kapanışı olarak en altta kalıyor. */}
        <div className={inter.className}>
          <ProductImageCardGrid storeSlug={storeSlug} heading="Çok Satanlar" products={bestSellersWithImages} />
          <ProductImageCardGrid storeSlug={storeSlug} heading="Benzer Ürünler" products={similarWithImages} />
        </div>
      </Container>

      <div className="mt-16">
        <StorefrontCtaBand storeId={store.id} storeSlug={storeSlug} />
      </div>
    </div>
  );
}
