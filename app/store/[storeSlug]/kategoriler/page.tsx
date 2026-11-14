import { storeBase } from "@/lib/sites/store-href";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildStorePageMetadata } from "@/lib/sites/store-metadata";
import Link from "next/link";
import Image from "next/image";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getPublicCategories } from "@/lib/commerce/public/categories";
import { CATEGORY_BANNER_IMAGES } from "@/lib/commerce/public/category-fallback-images";
import { storefrontDisplayClasses } from "@/lib/utils/storefront-typography";
import { Container } from "@/components/ui/container";
import { CategoryImageCard } from "@/components/commerce/public/taktikalp46-homepage-sections";

/** Faz 28 — mutlak canonical + OG url (lib/sites/store-metadata.ts). */
export async function generateMetadata({ params }: { params: Promise<{ storeSlug: string }> }): Promise<Metadata> {
  const { storeSlug } = await params;
  return buildStorePageMetadata({ storeSlug, path: "/kategoriler", title: "Tüm Kategoriler", imagePath: "/paylasim" });
}

/**
 * FAZ 7.2 — "Tüm Kategoriler" sayfası (üst kategoriler). Faz 24 — v2 koyu tema.
 *
 * Faz 26 — geniş banner satırları (masaüstü/tablet 2 sütun, telefon 1).
 * Banner'larda kategori adı, slogan, "Keşfet" ve logo GÖRSELİN İÇİNDE basılı:
 *  - kod tarafından ad YAZILMAZ (iki kere görünmesin);
 *  - erişilebilirlik: tüm banner tek <a>, aria-label = kategori adı, <img alt> =
 *    kategori adı; görseldeki "Keşfet" yalnız grafik, ayrı buton yok;
 *  - en-boy 3:1 sabit, object-cover + object-left: kırpma gerekirse yazı
 *    SOLDA olduğu için SAĞDAN kırpılır;
 *  - yerel dosya → Next/Image optimizasyonu açık (unoptimized yok).
 * Banner'ı olmayan (ileride eklenecek) kategori aynı ızgarada ana sayfadaki
 * 4:3 kart tipiyle (kod yazısıyla) gösterilir — link kaybolmaz.
 */
export default async function StoreAllCategoriesPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;

  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const allCategories = await getPublicCategories(store.id);
  const topLevelCategories = allCategories.filter((category) => category.parentId === null);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Container className="py-10">
        <h1 className={`${storefrontDisplayClasses} text-2xl font-bold tracking-tight text-[#F5F5F5] sm:text-3xl`}>Tüm Kategoriler</h1>

        {topLevelCategories.length === 0 ? (
          <p className="mt-6 text-sm text-[#A3A3A3]">Henüz kategori eklenmemiş.</p>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5">
            {topLevelCategories.map((category) => {
              const banner = CATEGORY_BANNER_IMAGES[category.slug];
              return (
                <li key={category.id}>
                  {banner ? (
                    <Link
                      href={`${storeBase(storeSlug)}/kategori/${category.slug}`}
                      aria-label={category.name}
                      className="group relative block aspect-[3/1] overflow-hidden rounded-[16px] border border-[#292929] bg-[#171717] transition-colors hover:border-[#D95F00] focus-visible:border-[#D95F00] focus-visible:outline-none"
                    >
                      <Image
                        src={banner}
                        alt={category.name}
                        fill
                        sizes="(min-width: 640px) 50vw, 100vw"
                        className="object-cover object-left transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </Link>
                  ) : (
                    <CategoryImageCard storeSlug={storeSlug} category={category} headingFont={storefrontDisplayClasses} aspect="aspect-[3/1]" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </div>
  );
}
