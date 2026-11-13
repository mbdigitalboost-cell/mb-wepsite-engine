import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getPublicCategories } from "@/lib/commerce/public/categories";
import { storefrontDisplayClasses } from "@/lib/utils/storefront-typography";
import { Container } from "@/components/ui/container";
import { CategoryImageCard } from "@/components/commerce/public/taktikalp46-homepage-sections";

/**
 * FAZ 7.2 — "Tüm Kategoriler" sayfası. Üst kategoriler (parentId === null),
 * layout.tsx'in hamburger menüsüyle AYNI getPublicCategories + top-level
 * filtreleme. Alt kategoriler kategori sayfasının kendisinde gösteriliyor.
 *
 * Faz 24 — v2 koyu temaya taşındı. Kök neden (kullanıcının "sağa sola
 * beyazlıklar" şikâyeti): bu sayfa Faz 14'te kapsam dışı bırakılmıştı;
 * zemin kök temanın beyazıydı (bg-background), kartlar border-black/10 +
 * bg-black/5 ile koyu fotoğrafların etrafında açık çerçeve bırakıyordu ve
 * sabit h-40/h-48 yükseklik geniş ekranda dar kartta yatay fotoğrafı sert
 * kırpıyordu. Artık:
 *  - zemin/başlık/metin, kategori sayfasıyla ([categorySlug]/page.tsx)
 *    birebir aynı v2 değerleri (#0A0A0A, font-store-display, #F5F5F5/#A3A3A3);
 *  - kartlar ana sayfanın "Kydex Koleksiyonu"/"Taktikal Ekipman" bölümleriyle
 *    AYNI bileşen (CategoryImageCard: #171717 zemin, #292929 kenarlık,
 *    gradient + etiket), en-boy oranı 4:3 (fotoğraf seti ~1.37:1) +
 *    object-cover object-center.
 * Fotoğraf dosyalarının kendisine dokunulmadı.
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
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {topLevelCategories.map((category) => (
              <li key={category.id}>
                <CategoryImageCard
                  storeSlug={storeSlug}
                  category={category}
                  headingFont={storefrontDisplayClasses}
                  aspect="aspect-[4/3]"
                />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </div>
  );
}
