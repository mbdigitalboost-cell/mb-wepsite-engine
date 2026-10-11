import Link from "next/link";
import type { PublicProduct } from "@/lib/commerce/public/products";
import { storefrontMonoClasses } from "@/lib/utils/storefront-typography";

interface ProductGridProps {
  storeSlug: string;
  products: PublicProduct[];
}

function formatPrice(value: number) {
  return value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

/**
 * FAZ 2C-3 — shared, reusable product grid. Used by both the store
 * homepage (featured products) and the category page (STEP 22's own
 * "Grid sade ve reusable olsun" requirement) — one component, two
 * callers, no per-page duplication.
 *
 * Deliberately no thumbnail image here: each product image needs its own
 * signed-URL round trip (see lib/commerce/public/products.ts's own
 * comment on why signing can't be a raw public URL), and doing that for
 * every card on a list page is an N+1 cost this first foundation pass
 * doesn't take on. Name + price is enough to prove the read model end to
 * end; a thumbnail is a real, tracked follow-up, not a silent omission.
 *
 * No pagination/filter/sort/cart button — explicitly out of scope for
 * this phase.
 *
 * Faz 12 devamı — v2 koyu tema. Bu bileşen İKİ çağıran arasında paylaşılıyor
 * (bu dosyanın kendi doc comment'i: homepage + kategori sayfası) — homepage
 * artık bu bileşeni KULLANMIYOR (Öne Çıkan Kydex Ürünler kendi ayrı
 * FeaturedProductsSection'ına geçti, bkz. taktikalp46-homepage-sections.tsx),
 * bu yüzden tek gerçek çağıran bugün /kategori/[categorySlug] ve
 * /silahini-sec/[brandSlug]/sonuclar — ikisi de artık koyu temalı, bu
 * yüzden bu bileşenin kendisini koyulaştırmak güvenli (üçüncü, hâlâ açık
 * temalı bir çağıranı yok).
 *
 * Site geneli tasarım sistemi (Faz 12 devamı) — kart rounded-[14px]'e
 * (kanvasın `.card` token'ı), marka etiketi mono/uppercase, fiyat mono.
 * Kanvasta (Kategori.dc.html) kartın köşesinde dairesel bir "+" Sepete
 * Ekle butonu da var — BİLEREK eklenmedi: bu kart tek bir <Link>
 * (ürün detayına gidiyor) ve canvas'ın kendi yapısı bir <button>'ı bir
 * <a>'nın İÇİNE koyuyor (iç içe interaktif eleman, erişilebilirlik
 * ihlali) — ayrıca varyant/ek ürünü olan bir ürünü tek tıkla, seçim
 * yapmadan sepete eklemek gerçek bir davranış değişikliği olurdu
 * (bu turun kendi "sadece görsel katman, iş mantığı değişmiyor" sınırını
 * aşar). Kart yine de tek, net bir hedefe (ürün sayfası) gidiyor.
 */
export function ProductGrid({ storeSlug, products }: ProductGridProps) {
  if (products.length === 0) {
    return <p className="text-sm text-[#A3A3A3]">Henüz ürün eklenmemiş.</p>;
  }

  return (
    <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <Link
            href={`/store/${storeSlug}/urun/${product.slug}`}
            className="block rounded-[14px] border border-[#292929] bg-[#171717] p-3 text-sm transition-colors hover:border-[#D95F00]"
          >
            {/* STEP 33 display-only — product.brand already resolved by getPublicProducts/attachBrandsToProducts, no extra query here. No link/filter, plain label. */}
            {product.brand ? (
              <p className={`${storefrontMonoClasses} text-[11px] uppercase text-[#6B6B6B]`}>{product.brand.name}</p>
            ) : null}
            <p className="mt-1 font-medium text-[#F5F5F5]">{product.name}</p>
            <p className={`${storefrontMonoClasses} mt-1.5 font-semibold text-[#D95F00]`}>{formatPrice(product.price)}</p>
            {product.compareAtPrice ? (
              <p className={`${storefrontMonoClasses} text-xs text-[#6B6B6B] line-through`}>{formatPrice(product.compareAtPrice)}</p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
