"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PetraShowcaseProduct } from "@/lib/data/petra/product-showcase";

const AUTOPLAY_INTERVAL_MS = 6000;
/** Kısa bir kaydırma bile geçiş tetiklesin diye düşük tutuldu; agresif değil. */
const SWIPE_THRESHOLD_PX = 40;

interface ProductShowcaseSliderProps {
  products: PetraShowcaseProduct[];
}

/**
 * Faz H-devam: `MitsubishiSlider` ile aynı etkileşim deseni (autoplay,
 * ok tuşları, dokunmatik swipe, nokta göstergeleri), ama TEK bir markaya
 * değil, her slaytın kendi `brand` alanına bağlı — çünkü bu slider birden
 * fazla markanın (bkz. lib/data/petra/product-showcase.ts) ürün
 * fotoğraflarını art arda gösteriyor.
 *
 * Bilinçli fark: `MitsubishiSlider`'ın aksine slaytlar TIKLANAMAZ (Link
 * değil, düz <div>). Sekiz FARKLI markanın hepsi aynı genel /cozumler
 * sayfasına gitseydi, bu tam olarak kullanıcının daha önce "Çalıştığımız
 * Markalar" bölümünde bildirdiği hatayla aynı sorunu (farklı markalara
 * tıklayınca hepsi aynı alakasız yere gitme hissi) yeniden yaratırdı —
 * bu yüzden burada baştan önlendi.
 */
export function ProductShowcaseSlider({ products }: ProductShowcaseSliderProps) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const headingId = useId();
  const count = products.length;

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (isPaused || count <= 1) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isPaused, count]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrev();
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current == null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta < 0) goNext();
    else goPrev();
  };

  if (!products[index]) return null;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Marka ürünleri"
      className="group/slider relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        aria-labelledby={headingId}
        className="relative flex aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-brand)] border border-white/10"
      >
        {products.map((product, productIndex) => (
          <div
            key={product.id}
            aria-hidden={productIndex !== index}
            className={`absolute inset-0 bg-white transition-opacity duration-700 ease-out ${
              productIndex === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <Image
              src={product.image}
              alt={`${product.brand} ${product.type}`}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority={productIndex === 0}
              className="object-contain p-6 pb-32"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-5 sm:p-6">
              <p
                id={productIndex === index ? headingId : undefined}
                className="text-xs font-medium tracking-[0.15em] text-brand-primary uppercase"
              >
                {product.type}
              </p>
              <h3 className="mt-1 font-[family-name:var(--font-brand-heading)] text-lg font-semibold text-white sm:text-xl">
                {product.brand}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-white/75">{product.shortDescription}</p>
            </div>
          </div>
        ))}
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Önceki ürün"
            className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-2 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover/slider:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Sonraki ürün"
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-2 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover/slider:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
          </button>

          <div className="mt-4 flex items-center justify-center gap-2" role="tablist" aria-label="Ürün seçimi">
            {products.map((product, dotIndex) => (
              <button
                key={product.id}
                type="button"
                role="tab"
                aria-selected={dotIndex === index}
                aria-label={`${product.brand} göster`}
                onClick={() => goTo(dotIndex)}
                className={`h-2 rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${
                  dotIndex === index ? "w-6 bg-brand-primary" : "w-2 bg-white/25 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
