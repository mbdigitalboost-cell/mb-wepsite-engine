import Image from "next/image";
import Link from "next/link";
import { storeBase } from "@/lib/sites/store-href";
import { storefrontDisplayClasses } from "@/lib/utils/storefront-typography";
import { Container } from "@/components/ui/container";
import type { StorefrontHomeProps } from "@/lib/commerce/public/storefront-showcase-types";
import {
  WhyKydexSection,
  SilahiniSecBridgeSection,
  KydexCollectionSection,
  FeaturedProductsSection,
  BrandStatementSection,
  OtherCategoriesSection,
  TrustBadgesSection,
  InstagramSection,
} from "@/lib/sites/taktikalp46/homepage-sections";

/**
 * Taktikalp46 ana sayfa gövdesi: hero + güven şeridi + Kydex bölümleri.
 *
 * Faz 39 Adım 2.4 — bu JSX önceden ortak mağaza sayfasının
 * (app/store/[storeSlug]/page.tsx) içindeydi; ikinci bir mağaza açılsa aynı
 * hero'yu ve aynı bölümleri gösterirdi. BİREBİR taşındı: metin, sınıf, sıra
 * ve görsel aynı; üretilen HTML değişmez. Veriler (markalar, kategoriler,
 * ürünler, kargo/iade iddiaları) hâlâ ortak sayfadan, mağazanın kendi
 * veritabanı kayıtlarından gelir.
 *
 * Tasarım notları (eski yerinden korunarak):
 * - Hero: tam genişlik arka plan fotoğrafı + soldan sağa koyulaşan gradyan +
 *   metin fotoğrafın üzerinde (Faz 7.3 devam #2 kompozisyonu; iki sütunlu
 *   deneme kullanıcı geri bildirimiyle geri alındı). Büyük başlık sayfanın
 *   tek <h1>'idir.
 * - İstatistik şeridi BİLEREK yok (uydurma sayı yasağı).
 * - Güven şeridi hero'nun hemen altında (tasarım kanvasındaki konumu).
 * - Bölüm sırası: Neden Kydex → Silahını Seç köprüsü → Kydex koleksiyonu →
 *   öne çıkan ürünler → marka cümlesi → diğer kategoriler → Instagram.
 *   Verisi olmayan bölüm kendi içinde null döner; Instagram, profilde adres
 *   yoksa hiç çağrılmaz (linksiz render edilmeyi desteklemez).
 */
export function StorefrontHome({
  storeSlug,
  brands,
  topLevelCategories,
  featuredProducts,
  instagramUrl,
  freeShippingClaim,
  returnsEnabled,
}: StorefrontHomeProps) {
  return (
    <>
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
          {/* Soldan sağa koyulaşan gradyan, okunabilirlik için */}
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
                className={`${storefrontDisplayClasses} max-w-2xl text-3xl font-bold uppercase leading-tight text-white sm:text-5xl lg:text-6xl`}
              >
                SAHADA GÜVEN, HER PARÇADA <span className="text-[#D95F00]">KALİTE</span>
              </h1>
              <p className="mt-4 max-w-md text-sm text-white/80 sm:text-base lg:text-lg">
                Kydex&apos;in hassasiyeti. Sahaya hazır performans.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={`${storeBase(storeSlug)}/silahini-sec`}
                  className={`${storefrontDisplayClasses} inline-flex h-14 w-full items-center justify-center rounded-full bg-[#D95F00] px-8 text-base font-semibold text-[#1A0D00] transition-colors hover:bg-[#F26A00] sm:w-auto`}
                >
                  Silahını Seç
                </Link>
                <Link
                  href={`${storeBase(storeSlug)}/kategoriler`}
                  className={`${storefrontDisplayClasses} inline-flex h-14 w-full items-center justify-center rounded-full border-2 border-white px-8 text-base font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto`}
                >
                  Tüm Kategoriler
                </Link>
              </div>
            </Container>
          </div>

          <div className="absolute bottom-5 right-5 hidden max-w-[200px] rounded-[14px] border border-white/15 bg-black/50 px-4 py-3 backdrop-blur-sm sm:block">
            <p className={`${storefrontDisplayClasses} text-xs font-semibold text-white`}>Isıl Şekillendirilmiş Kydex</p>
          </div>
        </div>
      </section>

      <TrustBadgesSection freeShippingClaim={freeShippingClaim} returnsEnabled={returnsEnabled} />

      <div>
        <WhyKydexSection headingFont={storefrontDisplayClasses} />
        <SilahiniSecBridgeSection storeSlug={storeSlug} brands={brands} headingFont={storefrontDisplayClasses} />
        <KydexCollectionSection storeSlug={storeSlug} categories={topLevelCategories} headingFont={storefrontDisplayClasses} />
        <FeaturedProductsSection storeSlug={storeSlug} products={featuredProducts} headingFont={storefrontDisplayClasses} />
        <BrandStatementSection headingFont={storefrontDisplayClasses} />
        <OtherCategoriesSection storeSlug={storeSlug} categories={topLevelCategories} headingFont={storefrontDisplayClasses} />
        {instagramUrl ? <InstagramSection instagramUrl={instagramUrl} headingFont={storefrontDisplayClasses} /> : null}
      </div>
    </>
  );
}
