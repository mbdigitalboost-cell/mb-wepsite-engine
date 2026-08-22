"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { track } from "@/lib/tracking/track";
import { useParallaxPointer } from "@/lib/motion/use-parallax-pointer";
import type { PetraBrand } from "@/lib/data/petra/brands";

interface BrandsSliderProps {
  brands: PetraBrand[];
}

/** Bir "sayfa" kaydırmak için kart genişliği + gap kadar kaydırılır. */
const SCROLL_STEP_PX = 260;

/**
 * Faz H: 9 markanın logo kartlarını gösteren yatay kaydırmalı slider.
 *
 * Kaynak görseller (bkz. lib/data/petra/brands.ts) küçük, hazır "kart"
 * görselleri (~440x200px) — bu yüzden Mitsubishi slider'ındaki gibi tam
 * ekran arka plan fotoğrafı yaklaşımı yerine, her markanın kendi kartını
 * olduğu gibi gösteren bir yatay şerit tasarlandı. Mobilde doğal dokunmatik
 * kaydırma (scroll-snap) yeterli; masaüstünde ayrıca ok butonlarıyla
 * kontrol edilebilir. Kart başına hafif hover kaldırma/glow dışında,
 * kaydırma alanının kendisine parallax uygulanmıyor (scroll ile parallax
 * transform'unun çakışıp titreşim yaratmaması için) — bkz. rapor.
 */
export function BrandsSlider({ brands }: BrandsSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const { ref: parallaxRef, state: parallax } = useParallaxPointer<HTMLDivElement>();
  const isMouse = parallax.source === "mouse";

  const scrollBy = useCallback((direction: 1 | -1) => {
    trackRef.current?.scrollBy({ left: direction * SCROLL_STEP_PX, behavior: "smooth" });
  }, []);

  return (
    <div ref={parallaxRef} className="relative">
      <div
        ref={trackRef}
        role="list"
        aria-label="Çalışılan markalar"
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {brands.map((brand, index) => {
          const offsetX = isMouse ? parallax.x * 3 : 0;
          const offsetY = isMouse ? parallax.y * 3 : 0;
          return (
            <Link
              key={brand.id}
              href={brand.href}
              role="listitem"
              aria-label={`${brand.name} — ürünleri incele`}
              className="group/brand relative flex w-[210px] shrink-0 snap-start flex-col gap-3 sm:w-[240px]"
              onClick={() => track("service_view", { source: "brands_slider", brand: brand.slug })}
              style={{ transform: `translate3d(${offsetX}px, ${offsetY}px, 0)` }}
            >
              <div className="relative aspect-[2/1] w-full overflow-hidden rounded-[var(--radius-brand)] border border-white/10 bg-white/[0.03] transition-all duration-300 ease-out group-hover/brand:-translate-y-1 group-hover/brand:border-brand-primary/40 group-hover/brand:shadow-[0_0_20px_2px_var(--tw-shadow-color)] group-hover/brand:shadow-brand-primary/20 group-focus-visible/brand:-translate-y-1 group-focus-visible/brand:border-brand-primary/40">
                <Image
                  src={brand.image}
                  alt={`${brand.name} logosu`}
                  fill
                  sizes="(max-width: 640px) 210px, 240px"
                  priority={index === 0}
                  className="object-contain p-3"
                />
              </div>
              <span className="text-center text-xs font-medium tracking-[0.15em] text-brand-muted uppercase transition-colors duration-300 group-hover/brand:text-white">
                {brand.name}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-2 hidden items-center justify-end gap-2 sm:flex">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Önceki markalar"
          className="rounded-full border border-white/20 bg-black/40 p-2 text-white backdrop-blur-sm transition-colors duration-200 hover:border-brand-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Sonraki markalar"
          className="rounded-full border border-white/20 bg-black/40 p-2 text-white backdrop-blur-sm transition-colors duration-200 hover:border-brand-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
