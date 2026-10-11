"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { storefrontDisplayClasses, storefrontMonoClasses } from "@/lib/utils/storefront-typography";
import type { PublicBrand } from "@/lib/commerce/public/brands";
import type { PublicProductSort } from "@/lib/commerce/public/products";

/** Tasarım kanvası (Kategori.dc.html) — `select.ghost`: pill şekli, Oswald uppercase, storefrontInputClasses'ın (dikdörtgen, form alanları için) AYRI bir varyantı. */
const ghostSelectClasses =
  `${storefrontDisplayClasses} w-auto rounded-full border-[1.5px] border-[#3A3A3A] bg-[#171717] px-4 py-2.5 text-xs font-semibold text-[#F5F5F5] transition-colors focus-visible:border-[#D95F00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D95F00]/30`;

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
 *
 * Devir metni v2 — kanvasta (Kategori.dc.html) marka filtresi bir
 * <select> DEĞİL, bir CHIP SATIRI ("Marka" etiketi + "Tümü" + her marka
 * için bir pill, aktif olan dolgulu) — önceki turda ikisi de <select>
 * olarak yapılmıştı, bu sefer marka filtresi chip'e çevrildi (sıralama
 * hâlâ select, kanvasta da öyle). Sağ tarafa kanvasın "{N} ürün bulundu"
 * mono etiketi eklendi — GERÇEK `resultCount` prop'undan, uydurma sayı
 * değil.
 */
export function CategoryFilterBar({
  storeSlug,
  categorySlug,
  brands,
  currentSort,
  currentBrand,
  resultCount,
}: {
  storeSlug: string;
  categorySlug: string;
  brands: PublicBrand[];
  currentSort: PublicProductSort;
  currentBrand: string;
  resultCount: number;
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
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-b border-[#292929] pb-5">
      {brands.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <span className={`${storefrontMonoClasses} mr-1 text-[11px] uppercase text-[#6B6B6B]`}>Marka</span>
          <button
            type="button"
            onClick={() => updateParam("brand", "")}
            className={`${storefrontDisplayClasses} rounded-full border-[1.5px] px-4 py-1.5 text-xs font-semibold transition-colors ${
              currentBrand === "" ? "border-[#D95F00] bg-[#D95F00] text-[#1A0D00]" : "border-[#3A3A3A] text-[#A3A3A3] hover:border-[#D95F00]"
            }`}
          >
            Tümü
          </button>
          {brands.map((brand) => (
            <button
              key={brand.id}
              type="button"
              onClick={() => updateParam("brand", brand.slug)}
              className={`${storefrontDisplayClasses} rounded-full border-[1.5px] px-4 py-1.5 text-xs font-semibold transition-colors ${
                currentBrand === brand.slug
                  ? "border-[#D95F00] bg-[#D95F00] text-[#1A0D00]"
                  : "border-[#3A3A3A] text-[#A3A3A3] hover:border-[#D95F00]"
              }`}
            >
              {brand.name}
            </button>
          ))}
        </div>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-3.5">
        <span className={`${storefrontMonoClasses} text-xs text-[#6B6B6B]`}>
          {resultCount} ürün bulundu
        </span>
        <select
          value={currentSort}
          onChange={(event) => updateParam("sort", event.target.value)}
          aria-label="Sırala"
          className={ghostSelectClasses}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
