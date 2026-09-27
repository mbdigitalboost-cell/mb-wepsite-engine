import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Space_Grotesk } from "next/font/google";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getPublicCategories } from "@/lib/commerce/public/categories";
import { CATEGORY_FALLBACK_IMAGES } from "@/lib/commerce/public/category-fallback-images";
import { Container } from "@/components/ui/container";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["700"] });

/**
 * FAZ 7.2 — "Tüm Kategoriler" sayfası. Üst kategoriler (parentId ===
 * null) — layout.tsx'in hamburger menüsü için zaten yaptığı AYNI
 * getPublicCategories + top-level filtreleme, burada da tekrarlanıyor
 * (ayrı bir "top-level only" sorgu icat etmek yerine). Alt kategoriler
 * kategori sayfasının kendisinde zaten gösteriliyor (STEP 23'ün "ana
 * kategori + alt kategoriler" modeli) — bu grid'e düzleştirilmiyor.
 * `unoptimized` next/image (cart-list.tsx'in kendi sepet görseli
 * kullanımıyla AYNI desen) — category.imageUrl imzalı bir URL değil ama
 * next.config.ts'in remotePatterns'ına uymayan bir host'tan gelebilir,
 * bu yüzden optimizer'a güvenmek yerine bu desen tercih edildi; aynı
 * desen FAZ 7.3'ün statik /images/categories/ dosyaları için de korunuyor
 * (src iki kaynaktan da gelebildiği için tek bir davranış daha basit).
 *
 * FAZ 7.3 — kart artık bir görsel varsa (DB ya da yukarıdaki statik
 * fallback) alttan koyulaşan bir gradient + sol-alt köşede kalın, beyaz,
 * Space Grotesk bir etiket gösteriyor ("Kydex Koleksiyonu" kart stiliyle
 * eşleşen v2 tasarım). Görsel yoksa (bu 8 slug dışındaki gelecekteki bir
 * kategori) eski gri placeholder + görselin ALTINDA ortalanmış etiket
 * davranışı AYNEN korunuyor — üstüne koyulaştırılacak bir fotoğraf
 * olmadan bu gradient/overlay stilinin bir anlamı yok. `<Link>`'in
 * href'i/route mantığı bu fazda hiç değişmedi.
 */
export default async function StoreAllCategoriesPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;

  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const allCategories = await getPublicCategories(store.id);
  const topLevelCategories = allCategories.filter((category) => category.parentId === null);

  return (
    <Container className="py-10">
      <h1 className="text-2xl font-semibold text-foreground">Tüm Kategoriler</h1>

      {topLevelCategories.length === 0 ? (
        <p className="mt-6 text-sm text-foreground/60">Henüz kategori eklenmemiş.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {topLevelCategories.map((category) => {
            const imageUrl = category.imageUrl ?? CATEGORY_FALLBACK_IMAGES[category.slug] ?? null;

            return (
              <li key={category.id}>
                <Link
                  href={`/store/${storeSlug}/kategori/${category.slug}`}
                  className="group block overflow-hidden rounded-lg border border-black/10 transition-colors hover:border-black/20"
                >
                  <div className="relative h-40 w-full bg-black/5 sm:h-48">
                    {imageUrl ? (
                      <>
                        <Image
                          src={imageUrl}
                          alt={category.name}
                          fill
                          unoptimized
                          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                        <div
                          aria-hidden="true"
                          className="absolute inset-0"
                          style={{
                            background:
                              "linear-gradient(to top, rgba(10,10,10,0.88) 0%, rgba(10,10,10,0.05) 55%)",
                          }}
                        />
                        <p
                          className={`${spaceGrotesk.className} absolute bottom-0 left-0 p-3 text-base font-bold text-white sm:text-lg`}
                        >
                          {category.name}
                        </p>
                      </>
                    ) : null}
                  </div>
                  {imageUrl ? null : (
                    <p className="p-3 text-center text-sm font-medium text-foreground">{category.name}</p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
