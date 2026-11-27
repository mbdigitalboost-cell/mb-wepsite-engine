import Image from "next/image";
import Link from "next/link";
import type { PublicCategory } from "@/lib/commerce/public/categories";
import { CATEGORY_FALLBACK_IMAGES } from "@/lib/commerce/public/category-fallback-images";
import { storeBase } from "@/lib/sites/store-href";

/**
 * Mağaza kategori kartı — görsel + gradient + sol-alt etiket. Ortak mağaza
 * motorunun bileşenidir: /kategoriler sayfası ve mağazaya özel ana sayfa
 * bölümleri aynı kartı kullanır. İçinde hiçbir mağazaya özel metin yoktur.
 *
 * Faz 39 Adım 2.1 — mağazaya özel ana sayfa bölümleri dosyasından buraya
 * taşındı (yalnız taşıma; işaretleme birebir aynı). Önceden ortak
 * /kategoriler sayfası bu kartı tek bir mağazanın dosyasından import ediyordu.
 */
export function CategoryImageCard({
  storeSlug,
  category,
  headingFont,
  aspect,
}: {
  storeSlug: string;
  category: PublicCategory;
  headingFont: string;
  /** Faz 24 — sabit yükseklik yerine en-boy oranı (ör. "aspect-[4/3]"): geniş ekranda dar kartın yatay fotoğrafı sert kırpmasın. */
  aspect: string;
}) {
  const imageUrl = category.imageUrl ?? CATEGORY_FALLBACK_IMAGES[category.slug] ?? null;
  return (
    <Link
      href={`${storeBase(storeSlug)}/kategori/${category.slug}`}
      className={`group relative block ${aspect} overflow-hidden rounded-[14px] border border-[#292929] bg-[#171717] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg`}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={category.name}
          fill
          // Faz 24 — yerel /images/categories/ dosyaları optimize edilir; DB'deki
          // image_url admin'in serbest metin URL'i (keyfi host, remotePatterns dışı) → unoptimized kalır.
          unoptimized={!imageUrl.startsWith("/")}
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="object-cover object-center opacity-85 transition-transform duration-300 group-hover:scale-105"
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgba(10,10,10,0.05) 0%, rgba(10,10,10,0.88) 100%)" }}
      />
      <div className="absolute bottom-4 left-4">
        <p className={`${headingFont} text-[15px] font-semibold text-white`}>{category.name}</p>
        <p className="mt-0.5 text-xs font-medium text-[#D95F00]">Keşfet →</p>
      </div>
    </Link>
  );
}
