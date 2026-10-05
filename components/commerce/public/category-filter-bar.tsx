"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { storefrontInputClasses } from "@/lib/utils/storefront-input-classes";
import type { PublicBrand } from "@/lib/commerce/public/brands";
import type { PublicProductSort } from "@/lib/commerce/public/products";

const SORT_OPTIONS: { value: PublicProductSort; label: string }[] = [
  { value: "newest", label: "En Yeni" },
  { value: "price_asc", label: "Fiyat: Artan" },
  { value: "price_desc", label: "Fiyat: Azalan" },
];

/**
 * Faz 12 devamı — kategori sayfası filtre/sıralama çubuğu. URL query param
 * bazlı (devir metninin kendi talimatı: "?sort=...&brand=..." paylaşılabilir/
 * bookmarklanabilir olsun) — client-side state YOK, her değişiklik
 * `router.push` ile yeni bir URL'e gidiyor, server component (kategori
 * page.tsx) o URL'i searchParams'tan okuyup sorguya uyguluyor. Mevcut
 * `?model=` (STEP 33) gibi bu bileşenin bilmediği diğer query param'lar
 * `useSearchParams()`'tan kopyalanıp korunuyor, siliniyor değil.
 *
 * Marka listesi zaten store-scoped+"bu kategoride gerçekten ürünü olan"
 * filtrelenmiş geliyor (getPublicBrandsForCategory, STEP 33'ten beri var
 * olan altyapı) — burada ayrıca bir filtreleme yapılmıyor. Liste boşsa
 * (bugünkü gerçek durum: 11/12 kategori) marka seçici hiç render edilmiyor.
 */
export function CategoryFilterBar({
  storeSlug,
  categorySlug,
  brands,
  currentSort,
  currentBrand,
}: {
  storeSlug: string;
  categorySlug: string;
  brands: PublicBrand[];
  currentSort: PublicProductSort;
  currentBrand: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const query = params.toString();
    router.push(`/store/${storeSlug}/kategori/${categorySlug}${query ? `?${query}` : ""}`);
  }

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <select
        value={currentSort}
        onChange={(event) => updateParam("sort", event.target.value)}
        aria-label="Sırala"
        className={`${storefrontInputClasses} w-auto`}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {brands.length > 0 ? (
        <select
          value={currentBrand}
          onChange={(event) => updateParam("brand", event.target.value)}
          aria-label="Marka"
          className={`${storefrontInputClasses} w-auto`}
        >
          <option value="">Tüm Markalar</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.slug}>
              {brand.name}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
