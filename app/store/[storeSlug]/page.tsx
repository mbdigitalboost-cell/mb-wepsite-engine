import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Space_Grotesk, Inter } from "next/font/google";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getPublicStoreProfile } from "@/lib/commerce/public/profile";
import { getPublicStoreNavigation } from "@/lib/commerce/public/navigation";
import { getPublicStoreHomepageSections } from "@/lib/commerce/public/homepage";
import { getPublicProducts, getPublicProductImages } from "@/lib/commerce/public/products";
import { getPublicCategories } from "@/lib/commerce/public/categories";
import { getPublicBrandsWithProducts } from "@/lib/commerce/public/brands";
import { StoreHomepageSections } from "@/components/commerce/public/homepage-sections/store-homepage-sections";
import { Container } from "@/components/ui/container";
import {
  WhyKydexSection,
  KydexCollectionSection,
  BrandFinderSection,
  FeaturedProductsSection,
  BrandStatementSection,
  OtherCategoriesSection,
  TrustBadgesSection,
  InstagramSection,
  StoreFooterV2,
} from "@/components/commerce/public/taktikalp46-homepage-sections";

/**
 * FAZ 7.3 — v2 hero tasarımı SADECE bu sayfaya özel bir başlık fontu
 * istiyor (Space Grotesk); platform genelinde henüz bir ThemeProvider/
 * BrandTheme font sistemi storefront'a bağlanmadığı için (bkz. aşağıdaki
 * eski FAZ 2C-3 STEP 22 notu, hâlâ doğru) global bir font eklemek yerine
 * bu dosyaya scoped next/font/google kullanılıyor — Petra'ya ya da panel'e
 * hiç dokunmuyor.
 *
 * FAZ 7.3 follow-up — Inter, v2'nin "gövde Inter" talimatı için eklendi;
 * yeni bölümlerdeki gövde metinlerine className olarak veriliyor (bkz.
 * taktikalp46-homepage-sections.tsx'e geçirilen `bodyFont`/`headingFont`
 * class'ları).
 */
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

/**
 * FAZ 2C-3 STEP 22 — Taktikalp46 / multi-tenant commerce storefront
 * homepage. Lives under `app/store/[storeSlug]/`, a route tree entirely
 * separate from `app/(public)/` (Petra's own routes) — zero shared files,
 * per this phase's own "DO NOT TOUCH PETRA" scope.
 *
 * This is a functional shell, not a redesign: it proves the full read
 * chain (store resolution → profile/nav/homepage-sections/featured
 * products) works end to end, using the existing generic root layout
 * (app/layout.tsx, already engine-neutral, already wraps /dashboard and
 * /login) and existing shared primitives (Container). Store branding
 * (colors/typography) is intentionally NOT applied to rendering yet —
 * that's a real follow-up (a per-store ThemeProvider), out of this
 * phase's "no redesign" instruction.
 */
export default async function StoreHomePage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;

  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const [mainNav, sections, allProducts, categories, brands, profile] = await Promise.all([
    getPublicStoreNavigation(store.id, "main"),
    getPublicStoreHomepageSections(store.id),
    getPublicProducts(store.id),
    getPublicCategories(store.id),
    getPublicBrandsWithProducts(store.id),
    getPublicStoreProfile(store.id),
  ]);

  // FAZ 7.3 follow-up — "cta" tipi section (bu mağazanın tek homepage
  // section'ı) artık genel StoreHomepageSections render'ından ÇIKARILIP
  // aşağıdaki koyu "üst şerit" olarak özel stillendiriliyor; içerik
  // (title/description) hâlâ bu DB satırından geliyor, sadece görünümü
  // hardcoded. Diğer section tipleri (varsa/ileride eklenirse) generic
  // renderer'dan değişmeden geçmeye devam ediyor — bkz. aşağıdaki
  // StoreHomepageSections çağrısının emptyState notu.
  const ctaSection = sections.find((section) => section.sectionTypeKey === "cta") ?? null;
  const remainingSections = ctaSection ? sections.filter((section) => section.id !== ctaSection.id) : sections;

  const topLevelCategories = categories.filter((category) => category.parentId === null);
  // "Öne Çıkan Kydex Ürünler" — kaç tane varsa (0-4), sahte ürünle 4'e tamamlanmıyor.
  const featuredProducts = allProducts.slice(0, 4);
  // FAZ 7.3 follow-up — en fazla 4 ürün olduğu için (yukarıdaki slice),
  // ürün başına bir getPublicProductImages çağrısı burada kabul
  // edilebilir bir maliyet (bu fonksiyonun kendi doc comment'i genel
  // liste sayfaları için bunu reddetmişti — orada ürün sayısı sınırsızdı,
  // burada sabit ve küçük). isPrimary=true olan görsel, yoksa sort_order'a
  // göre ilk görsel kullanılıyor; hiç görseli yoksa null (bileşen nötr bir
  // placeholder gösteriyor, sahte bir görsel değil).
  const featuredProductsWithImages = await Promise.all(
    featuredProducts.map(async (product) => {
      const images = await getPublicProductImages(store.id, product.id);
      const primary = images.find((image) => image.isPrimary) ?? images[0] ?? null;
      return { ...product, imageUrl: primary?.url ?? null };
    }),
  );
  const instagramUrl =
    typeof profile?.socialLinks.instagram === "string" && profile.socialLinks.instagram.trim().length > 0
      ? profile.socialLinks.instagram
      : null;

  return (
    <div>
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

      {ctaSection && (ctaSection.title || ctaSection.description) ? (
        <div className="border-b border-[#292929] bg-[#111111]">
          <Container className="flex min-h-[76px] flex-col items-center justify-center gap-1 py-4 text-center">
            {ctaSection.title ? (
              <p className={`${spaceGrotesk.className} text-sm font-semibold text-[#F5F5F5]`}>{ctaSection.title}</p>
            ) : null}
            {ctaSection.description ? (
              <p className="text-[13px] text-[#A3A3A3]">{ctaSection.description}</p>
            ) : null}
          </Container>
        </div>
      ) : null}

      {/*
        FAZ 7.3 follow-up — ctaSection artık yukarıdaki özel şeritte
        render edildiği için burada tekrar edilmemesi gerekiyor;
        remainingSections onu zaten dışarıda bırakıyor. Sadece o TEK
        section (bugünkü gerçek durum) varsa generic bileşenin kendi
        "Bu mağaza için henüz yayınlanmış bir ana sayfa bölümü yok."
        boş-durum mesajı YANLIŞ olurdu (section aslında var, sadece
        başka yerde render ediliyor) — emptyState={<></>} bunu bilinçli
        olarak bastırıyor, SADECE ctaSection dolu olduğu bu durumda;
        mağazanın gerçekten hiç section'ı yoksa (ctaSection null) bu hâlâ
        undefined'a düşüp bileşenin kendi varsayılan boş-durum mesajını
        gösteriyor, eskisi gibi.
      */}
      <StoreHomepageSections sections={remainingSections} emptyState={ctaSection ? <></> : undefined} />

      {/*
        FAZ 7.2 — checked first, per that phase's own explicit "silip
        yeniden icat etme" instruction: queried this store's own
        store_homepage_sections rows directly and confirmed neither button
        exists there (the store's one "cta" section has an empty config
        and a null link_url — that section type has no button support at
        all, only "hero" does, see homepage-section.ts's own config
        schemas) nor anywhere else in this codebase (grepped for the exact
        Turkish text first). These two buttons were added plain, NOT wired
        into the generic, tenant-agnostic StoreHomepageSections renderer
        above (deliberately — "Silahını Seç" is Taktikalp46-specific copy,
        not a generic CMS section type).

        FAZ 7.3 — same block, same two <Link> targets
        (silahini-sec / kategoriler), now expanded into a full v2 hero:
        real product photo background + gradient overlay + headline/
        subhead + restyled buttons. Colors are literal v2 hex values, not
        bg-brand-* tokens — the storefront has no ThemeProvider wired up
        yet (still true, see the file-level comment above), so there is no
        brand token to route through; hardcoding here matches this
        phase's own "sadece JSX/CSS" scope.

        FAZ 7.3 follow-up — the big headline below is now this page's
        real <h1> (was a <p> before): the old top Container's
        `{profile?.displayName ?? store.name}` <h1> was removed per this
        follow-up's explicit "tekrarlayan başlığı kaldır" instruction
        (header already shows the brand name, this hero already repeats
        it too — a third repetition served no one), so promoting this
        one to <h1> is what keeps the page at exactly one semantic
        heading rather than zero.
      */}
      <section className="relative isolate overflow-hidden bg-neutral-950">
        <div className="relative h-[560px] w-full sm:h-[640px] lg:h-[720px]">
          <Image
            src="/images/hero/kydex-sarjor-kilifi-hero.jpg"
            alt="Taktikalp46 Kydex şarjör kılıfı, taktik kemer üzerinde"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[65%_25%] sm:object-[75%_30%]"
          />
          {/* v2 palette — soldan sağa koyulaşan gradient, okunabilirlik için */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.65) 45%, rgba(10,10,10,0.2) 100%)",
            }}
          />
          {/* Dar ekranda yatay gradient metnin arkasını yeterince koyultmuyor — ek, tam kaplayan bir scrim */}
          <div aria-hidden="true" className="absolute inset-0 bg-black/35 sm:hidden" />

          <div className="relative flex h-full items-end sm:items-center">
            <Container className="pb-10 sm:pb-0">
              <h1
                className={`${spaceGrotesk.className} max-w-2xl text-3xl font-bold uppercase leading-tight text-white sm:text-5xl lg:text-6xl`}
              >
                TAKTİKALP46 <span className="text-[#D95F00]">GÜVENLE TAŞI.</span>
              </h1>
              <p className="mt-4 max-w-md text-sm text-white/80 sm:text-base lg:text-lg">
                Kydex&apos;in hassasiyeti. Sahaya hazır performans.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={`/store/${storeSlug}/silahini-sec`}
                  className={`${spaceGrotesk.className} inline-flex h-14 w-full items-center justify-center rounded-md bg-[#D95F00] px-8 text-base font-semibold text-white transition-colors hover:bg-[#F26A00] sm:w-auto`}
                >
                  Silahını Seç
                </Link>
                <Link
                  href={`/store/${storeSlug}/kategoriler`}
                  className={`${spaceGrotesk.className} inline-flex h-14 w-full items-center justify-center rounded-md border-2 border-white px-8 text-base font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto`}
                >
                  Tüm Kategoriler
                </Link>
              </div>
            </Container>
          </div>
        </div>
      </section>

      {/*
        FAZ 7.3 follow-up — hero'nun altındaki v2 bölümleri (görevin kendi
        sıralamasıyla, 1'den 10'a). Eski düz "Ürünler" H2 + ProductGrid
        bloğu (tüm ürünleri stilsiz listeleyen) buradan kaldırıldı: aşağıdaki
        FeaturedProductsSection aynı ihtiyacı (ürünleri göster) v2 kart
        stiliyle zaten karşılıyor, ikisini yan yana tutmak görevin istediği
        tutarlı/premium görünümle çelişirdi. Kategori/marka/ürün bulunamayan
        bölümler kendi içeride null döner (bkz. taktikalp46-homepage-
        sections.tsx'in her fonksiyonunun kendi erken-dönüş kontrolü) — bu
        sayfa onlar için ayrıca bir varlık kontrolü tekrarlamıyor, tek
        istisna Instagram (aşağıda instagramUrl null ise hiç render
        edilmiyor, çünkü o bileşen linksiz render edilmeyi desteklemiyor).
      */}
      <div className={inter.className}>
        <WhyKydexSection headingFont={spaceGrotesk.className} />
        <KydexCollectionSection storeSlug={storeSlug} categories={topLevelCategories} headingFont={spaceGrotesk.className} />
        <BrandFinderSection storeSlug={storeSlug} brands={brands} headingFont={spaceGrotesk.className} />
        <FeaturedProductsSection storeSlug={storeSlug} products={featuredProductsWithImages} headingFont={spaceGrotesk.className} />
        <BrandStatementSection headingFont={spaceGrotesk.className} />
        <OtherCategoriesSection storeSlug={storeSlug} categories={topLevelCategories} headingFont={spaceGrotesk.className} />
        <TrustBadgesSection />
        {instagramUrl ? <InstagramSection instagramUrl={instagramUrl} headingFont={spaceGrotesk.className} /> : null}
        <StoreFooterV2 storeSlug={storeSlug} categories={topLevelCategories} headingFont={spaceGrotesk.className} />
      </div>
    </div>
  );
}
