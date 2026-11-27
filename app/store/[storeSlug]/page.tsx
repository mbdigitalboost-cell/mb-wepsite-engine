import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildStorePageMetadata, storePageUrl } from "@/lib/sites/store-metadata";
import { onlineStoreJsonLd } from "@/lib/seo/store-structured-data";
import { getReturnsEnabled } from "@/lib/commerce/returns/service";
import { JsonLd } from "@/components/seo/json-ld";
import { getSellerIdentity } from "@/lib/legal/store-legal";
import { resolveStoreLogoUrl } from "@/lib/commerce/public/store-brand-assets";
import { getStorefrontShowcase } from "@/lib/commerce/public/storefront-showcases";
import { ProductGrid } from "@/components/commerce/public/product-grid";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getShippingFeeSettings } from "@/lib/commerce/public/shipping-fee-settings";
import { freeShippingClaim } from "@/lib/commerce/shipping-fee";
import { getPublicStoreProfile } from "@/lib/commerce/public/profile";
import { getPublicStoreNavigation } from "@/lib/commerce/public/navigation";
import { getPublicStoreHomepageSections } from "@/lib/commerce/public/homepage";
import { getPublicProducts, getPublicProductImages } from "@/lib/commerce/public/products";
import { getPublicCategories } from "@/lib/commerce/public/categories";
import { getPublicBrandsWithProductCounts } from "@/lib/commerce/public/brands";
import { StoreHomepageSections } from "@/components/commerce/public/homepage-sections/store-homepage-sections";
import { Container } from "@/components/ui/container";

/** Faz 28 — mutlak canonical + OG url (lib/sites/store-metadata.ts). */
export async function generateMetadata({ params }: { params: Promise<{ storeSlug: string }> }): Promise<Metadata> {
  const { storeSlug } = await params;
  // Faz 37 — açıklama admin → Profil'deki mağaza açıklamasından; boşsa mağaza adıyla kısa, uydurmasız bir cümle.
  const store = await getStoreBySlug(storeSlug);
  const profile = store ? await getPublicStoreProfile(store.id) : null;
  return buildStorePageMetadata({
    storeSlug,
    path: "",
    storeName: store?.name,
    description: profile?.description?.trim() || (store ? `${store.name} çevrimiçi mağazası.` : null),
    imagePath: "/paylasim",
  });
}

/**
 * Çok kiracılı mağaza ana sayfası (app/store/[storeSlug]/). Kurumsal site
 * rotalarından (app/(public)/) tamamen ayrı bir rota ağacıdır.
 *
 * Faz 39 Adım 2.4 — bu sayfa artık HİÇBİR mağazaya özel metin, görsel ya da
 * bileşen içermez. Sırayla şunları gösterir:
 *   1. mağazanın ana menüsü (admin → Gezinme),
 *   2. admin'de yayınlanmış ana sayfa bölümleri (StoreHomepageSections),
 *   3. mağazanın VİTRİNİ varsa onun ana sayfa gövdesi
 *      (lib/commerce/public/storefront-showcases.ts → lib/sites/<siteKey>/);
 *      yoksa mağazanın ürün listesi.
 */
export default async function StoreHomePage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;

  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const [mainNav, sections, allProducts, categories, brandsWithCounts, profile, shippingSettings, returnsEnabled] = await Promise.all([
    getPublicStoreNavigation(store.id, "main"),
    getPublicStoreHomepageSections(store.id),
    getPublicProducts(store.id),
    getPublicCategories(store.id),
    // Site Tasarımı v3 devir metni, Kısım A — eski getPublicBrandsWithProducts
    // (SADECE ürünü olan markalar) yerine getPublicBrandsWithProductCounts
    // (TÜM aktif markalar + gerçek sayım) — yeni "Silahını Seç" köprüsünün
    // SARSILMAZ/GLOCK gibi 0 ürünlü markaları da dürüstçe göstermesi için.
    getPublicBrandsWithProductCounts(store.id),
    getPublicStoreProfile(store.id),
    getShippingFeeSettings(store.id),
    getReturnsEnabled(store.id),
  ]);

  const showcase = getStorefrontShowcase(storeSlug);

  // Vitrini olan mağazada "cta" tipi bölüm genel listeden çıkarılır: vitrinin
  // kendi hero'su aynı mesajı taşır, ikisi üst üste gösterilmez (bölüm
  // veritabanında durur, yalnız burada render edilmez). Vitrini olmayan
  // mağazada bütün bölümler olduğu gibi gösterilir.
  const ctaSection = showcase ? (sections.find((section) => section.sectionTypeKey === "cta") ?? null) : null;
  const remainingSections = ctaSection ? sections.filter((section) => section.id !== ctaSection.id) : sections;

  const topLevelCategories = categories.filter((category) => category.parentId === null);
  // Vitrin için öne çıkan ürünler — kaç tane varsa (0-4), sahte ürünle 4'e
  // tamamlanmaz. En fazla 4 ürün olduğu için ürün başına bir görsel sorgusu
  // kabul edilebilir bir maliyet. isPrimary görsel, yoksa sıradaki ilk
  // görsel; hiç görsel yoksa null (bileşen nötr bir yer tutucu gösterir).
  // Vitrini olmayan mağazada bu sorgular hiç yapılmaz.
  const featuredProductsWithImages = showcase
    ? await Promise.all(
        allProducts.slice(0, 4).map(async (product) => {
          const images = await getPublicProductImages(store.id, product.id);
          const primary = images.find((image) => image.isPrimary) ?? images[0] ?? null;
          return { ...product, imageUrl: primary?.url ?? null };
        }),
      )
    : [];
  const instagramUrl =
    typeof profile?.socialLinks.instagram === "string" && profile.socialLinks.instagram.trim().length > 0
      ? profile.socialLinks.instagram
      : null;

  // Faz 37 — OnlineStore yapısal verisi: satıcı kimliği (Faz 33) + profil; puan/yorum yok.
  const seller = await getSellerIdentity(store.id);
  const logo = resolveStoreLogoUrl(storeSlug, profile?.logoUrl);
  const homeUrl = storePageUrl(storeSlug, "");
  const storeJsonLd = onlineStoreJsonLd({
    name: store.name,
    legalName: seller?.legalName ?? null,
    url: homeUrl,
    logo: logo ? (logo.startsWith("http") ? logo : new URL(logo, homeUrl).toString()) : null,
    telephone: seller?.phone ?? profile?.phone ?? null,
    email: seller?.email ?? profile?.email ?? null,
    address: seller?.address ?? profile?.address ?? null,
    sameAs: instagramUrl ? [instagramUrl] : [],
  });

  return (
    <div>
      <JsonLd data={storeJsonLd} />
      {mainNav.length > 0 ? (
        <Container className="py-6">
          <nav className="flex flex-wrap gap-4 text-sm">
            {mainNav.map((item) => (
              <a key={item.id} href={item.url} className="text-foreground/70 hover:text-foreground hover:underline">
                {item.label}
              </a>
            ))}
          </nav>
        </Container>
      ) : null}

      {/* emptyState: cta bölümü vitrin hero'suna bırakıldıysa "yayınlanmış bölüm yok" mesajı bastırılır. */}
      <StoreHomepageSections sections={remainingSections} emptyState={ctaSection ? <></> : undefined} />

      {showcase ? (
        <showcase.Home
          storeSlug={storeSlug}
          brands={brandsWithCounts}
          topLevelCategories={topLevelCategories}
          featuredProducts={featuredProductsWithImages}
          instagramUrl={instagramUrl}
          freeShippingClaim={freeShippingClaim(shippingSettings)}
          returnsEnabled={returnsEnabled}
        />
      ) : allProducts.length > 0 ? (
        <Container className="py-10">
          <h2 className="text-lg font-semibold">Ürünler</h2>
          <ProductGrid storeSlug={storeSlug} products={allProducts} />
        </Container>
      ) : null}
    </div>
  );
}
