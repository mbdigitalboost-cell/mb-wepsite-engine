import { storeBase, storeHref } from "@/lib/sites/store-href";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildStorePageMetadata, shareImageVersion } from "@/lib/sites/store-metadata";
import Link from "next/link";
import { Check } from "lucide-react";
import { storefrontDisplayClasses, storefrontMonoClasses } from "@/lib/utils/storefront-typography";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getShippingFeeSettings } from "@/lib/commerce/public/shipping-fee-settings";
import {
  getPublicProductBySlug,
  getPublicProductImages,
  getPublicProductOptions,
  getPublicProductVariants,
  getPublicProductAddons,
  getPublicProductInventory,
  getPublicProducts,
  getPublicBestSellingProducts,
  type PublicProduct,
} from "@/lib/commerce/public/products";
import { getPublicCategories } from "@/lib/commerce/public/categories";
import { Container } from "@/components/ui/container";
import { StorefrontCtaBand } from "@/components/commerce/public/storefront-cta-band";
import { ProductImageCardGrid } from "@/components/commerce/public/product-image-card-grid";
import { ProductDetailClient } from "./product-detail-client";

/** "Kendi Üretimimiz" iddiası yalnızca bunu doğrulanmış olarak kullanan mağazada (duyuru şeridiyle aynı ifade). */
const OWN_PRODUCTION_STORE_SLUGS = new Set(["taktikalp46"]);

/**
 * Faz 25 — açıklamayı paragraflara ve özellik kartlarına ayırır. Ayrı bir
 * "özellikler" alanı şemada YOK. Boş satırla ayrılmış her blok:
 *  - satırları "-", "•", "*", "✓" ya da "1." ile başlıyorsa → özellik kartları;
 *  - 2+ satırdan oluşup hiçbir satırı nokta/ünlem/soru ile bitmiyorsa (admin'in
 *    alt alta yazdığı kısa liste, ör. "Dayanıklı kydex malzeme") → özellik kartları;
 *  - ":" ile biten tek satırlık başlık ("Öne Çıkan Özellikler:") özellik
 *    ızgarası zaten başlık taşıdığı için atlanır;
 *  - geri kalanı paragraf. Hiç madde yoksa ızgara çıkmaz.
 */
function splitDescription(description: string | null): { paragraphs: string[]; features: string[] } {
  if (!description) return { paragraphs: [], features: [] };
  const paragraphs: string[] = [];
  const features: string[] = [];
  const blocks = description
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0);
  const bulletPattern = /^(?:[-•*✓✔]|\d+[.)])\s+(.*)$/u;
  for (const lines of blocks) {
    if (lines.every((line) => bulletPattern.test(line))) {
      for (const line of lines) features.push(line.match(bulletPattern)?.[1] ?? line);
    } else if (lines.length >= 2 && lines.every((line) => !/[.!?]$/.test(line))) {
      features.push(...lines);
    } else if (lines.length === 1 && lines[0].endsWith(":")) {
      continue;
    } else {
      paragraphs.push(lines.join(" "));
    }
  }
  return { paragraphs, features };
}

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

/** Faz 28 — başlık, açıklama, mutlak canonical + OG url (lib/sites/store-metadata.ts). */
export async function generateMetadata({ params }: { params: Promise<{ storeSlug: string; productSlug: string }> }): Promise<Metadata> {
  const { storeSlug, productSlug } = await params;
  const store = await getStoreBySlug(storeSlug);
  const product = store ? await getPublicProductBySlug(store.id, productSlug) : null;
  if (!store || !product) return {};
  return buildStorePageMetadata({
    storeSlug,
    path: `/urun/${product.slug}`,
    storeName: store.name,
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.shortDescription,
    imagePath: `/paylasim/urun/${product.slug}?v=${shareImageVersion(product.name, product.display.price, product.display.compareAtPrice)}`,
  });
}

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

  // Faz 25 — TÜM görseller (her varyantınki dahil) burada, sunucuda imzalanır;
  // galeri seçimi client'ta yapılır ama client asla imza üretmez.
  const [images, optionGroups, variants, addons, categories, inventory, shippingSettings] = await Promise.all([
    getPublicProductImages(store.id, product.id),
    getPublicProductOptions(store.id, product.id),
    getPublicProductVariants(store.id, product.id),
    getPublicProductAddons(store.id, product.id),
    getPublicCategories(store.id),
    getPublicProductInventory(store.id, product.id),
    getShippingFeeSettings(store.id),
  ]);
  const category = categories.find((c) => c.id === product.categoryId) ?? null;
  const { paragraphs, features } = splitDescription(product.description);
  const models = product.models ?? [];
  const technicalRows = [
    product.brand ? { label: "Marka", value: product.brand.name } : null,
    models.length > 0 ? { label: "Uyumlu modeller", value: models.join(", ") } : null,
    inventory?.sku ? { label: "Stok kodu", value: inventory.sku } : null,
    inventory?.barcode ? { label: "Barkod", value: inventory.barcode } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

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
    <div className="min-h-screen bg-[#0A0A0A] pb-24 lg:pb-0">
      <Container className="py-10">
        <nav aria-label="Breadcrumb" className={`${storefrontMonoClasses} flex flex-wrap items-center gap-1.5 text-xs text-[#6B6B6B]`}>
          <Link href={storeHref(storeSlug)} className="hover:text-[#F5F5F5] hover:underline">
            Ana Sayfa
          </Link>
          {category ? (
            <>
              <span aria-hidden="true">/</span>
              <Link href={`${storeBase(storeSlug)}/kategori/${category.slug}`} className="hover:text-[#F5F5F5] hover:underline">
                {category.name}
              </Link>
            </>
          ) : null}
          <span aria-hidden="true">/</span>
          <span className="text-[#A3A3A3]">{product.name}</span>
        </nav>

        <ProductDetailClient
          productId={product.id}
          productSlug={product.slug}
          productName={product.name}
          brandName={product.brand?.name ?? null}
          shortDescription={product.shortDescription}
          productPrice={product.price}
          productCompareAtPrice={product.compareAtPrice}
          images={images}
          optionGroups={optionGroups}
          variants={variants}
          addons={addons}
          inventory={inventory}
          models={models}
          showOwnProductionBadge={OWN_PRODUCTION_STORE_SLUGS.has(storeSlug)}
          shippingSettings={shippingSettings}
        />

        {/* Faz 25 — açıklama + özellik kartları (sol), Teknik Bilgi (sağ). Yalnız gerçek alanlar; puan/yorum/teslim süresi YOK. */}
        {paragraphs.length > 0 || features.length > 0 || technicalRows.length > 0 ? (
          <div className="mt-14 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
            <section>
              <h2 className={`${storefrontDisplayClasses} text-xl font-bold text-[#F5F5F5]`}>Ürün Açıklaması</h2>
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="mt-3 text-sm leading-relaxed text-[#A3A3A3]">
                  {paragraph}
                </p>
              ))}
              {features.length > 0 ? (
                <h3 className={`${storefrontDisplayClasses} mt-6 text-sm font-semibold text-[#F5F5F5]`}>Öne Çıkan Özellikler</h3>
              ) : null}
              {features.length > 0 ? (
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 rounded-[12px] border border-[#292929] bg-[#171717] p-4 text-sm text-[#F5F5F5]">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#D95F00]/15 text-[#D95F00]">
                        <Check size={13} strokeWidth={3} aria-hidden="true" />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            {technicalRows.length > 0 ? (
              <aside className="h-fit rounded-[14px] border border-[#292929] bg-[#171717] p-5">
                <h2 className={`${storefrontDisplayClasses} text-base font-bold text-[#F5F5F5]`}>Teknik Bilgi</h2>
                <dl className="mt-3 divide-y divide-[#292929] text-sm">
                  {technicalRows.map((row) => (
                    <div key={row.label} className="flex justify-between gap-4 py-2.5">
                      <dt className="text-[#A3A3A3]">{row.label}</dt>
                      <dd className={`${storefrontMonoClasses} text-right text-[#F5F5F5]`}>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </aside>
            ) : null}
          </div>
        ) : null}

        {/* Ürün bilgisinin ALTINA, StorefrontCtaBand'in ÜSTÜNE — bant sayfanın kapanışı olarak en altta kalıyor. */}
        <ProductImageCardGrid storeSlug={storeSlug} heading="Çok Satanlar" products={bestSellersWithImages} />
        <ProductImageCardGrid storeSlug={storeSlug} heading="Benzer Ürünler" products={similarWithImages} />
      </Container>

      <div className="mt-16">
        <StorefrontCtaBand storeId={store.id} storeSlug={storeSlug} />
      </div>
    </div>
  );
}
