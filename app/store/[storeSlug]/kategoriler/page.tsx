import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getPublicCategories } from "@/lib/commerce/public/categories";
import { Container } from "@/components/ui/container";

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
 * bu yüzden optimizer'a güvenmek yerine bu desen tercih edildi.
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
          {topLevelCategories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/store/${storeSlug}/kategori/${category.slug}`}
                className="group block overflow-hidden rounded-lg border border-black/10 transition-colors hover:border-black/20"
              >
                <div className="relative h-32 w-full bg-black/5">
                  {category.imageUrl ? (
                    <Image
                      src={category.imageUrl}
                      alt={category.name}
                      fill
                      unoptimized
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <p className="p-3 text-center text-sm font-medium text-foreground">{category.name}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
