import Link from "next/link";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import type { PublicProduct } from "@/lib/commerce/public/products";
import { formatPrice } from "@/lib/utils/format-price";

/**
 * Faz 12 devamı — ürün detay sayfasının "Çok Satanlar" ve "Benzer Ürünler"
 * bölümleri için GENEL (tenant-bağımsız) kart grid'i. taktikalp46-homepage-
 * sections.tsx'teki FeaturedProductsSection'la GÖRSEL olarak tutarlı
 * (zemin #171717, border #292929, hover #D95F00, gerçek ürün görseli,
 * yıldız YOK) ama BİLEREK AYRI bir bileşen — o dosya kasıtlı olarak
 * Taktikalp46'ya özel (bkz. kendi doc comment'i), ürün detay sayfası ise
 * tenant-bağımsız/genel (/urun/[productSlug], hiçbir tenant'a özel
 * hardcoded içerik yok) — tenant-özel bir bileşeni genel bir sayfadan
 * çağırmak mimariyi tersine çevirirdi. Küçük bir görsel desen tekrarı
 * (iki benzer kart grid'i) bu ayrımı korumanın kabul edilen bedeli.
 */
export function ProductImageCardGrid({
  storeSlug,
  heading,
  products,
}: {
  storeSlug: string;
  heading: string;
  products: (PublicProduct & { imageUrl: string | null })[];
}) {
  if (products.length === 0) return null;

  return (
    <div className="mt-12">
      <h2 className="text-lg font-semibold text-[#F5F5F5]">{heading}</h2>
      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {products.map((product) => (
          <li key={product.id}>
            <Link
              href={`/store/${storeSlug}/urun/${product.slug}`}
              className="group block overflow-hidden rounded-[6px] border border-[#292929] bg-[#171717] transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#D95F00] hover:shadow-lg"
            >
              <div className="relative h-[140px] bg-[#1D1D1B]">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    unoptimized
                    sizes="(min-width: 640px) 25vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageOff size={22} strokeWidth={1.5} className="text-[#4A4A46]" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-xs font-medium text-[#F5F5F5]">{product.name}</p>
                <p className="mt-1 text-xs font-semibold text-[#D95F00]">{formatPrice(product.price)}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
