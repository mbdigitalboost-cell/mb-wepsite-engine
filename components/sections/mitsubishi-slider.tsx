"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { track } from "@/lib/tracking/track";
import type { MitsubishiModel } from "@/lib/data/petra/mitsubishi-models";

const AUTOPLAY_INTERVAL_MS = 6000;
/** Kısa bir kaydırma bile geçiş tetiklesin diye düşük tutuldu; agresif değil. */
const SWIPE_THRESHOLD_PX = 40;

interface MitsubishiSliderProps {
  models: MitsubishiModel[];
  brandName: string;
}

/**
 * Faz 13: sağ taraftaki tek statik görsel yerine 6 modelli, tıklanabilir
 * ürün slider'ı. Autoplay hover'da/focus'ta durur; ok tuşları, dokunmatik
 * swipe ve nokta göstergeleriyle manuel kontrol edilebilir. Her kart
 * (görsel + metin) tek bir <Link> — bkz. lib/data/petra/mitsubishi-models.ts
 * için gerçek ürün detay route'u henüz yok, bu yüzden hepsi aynı, mevcut
 * ve doğrulanmış /cozumler sayfasına yönlenir (kırık link/uydurma sayfa yok).
 */
export function MitsubishiSlider({ models, brandName }: MitsubishiSliderProps) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const headingId = useId();
  const count = models.length;

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

  const active = models[index];
  if (!active) return null;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={`${brandName} ürün modelleri`}
      className="group/slider relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Link
        href={active.href}
        aria-labelledby={headingId}
        className="relative flex aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-brand)] border border-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        onClick={() => track("service_view", { source: "mitsubishi_slider", model: active.slug })}
      >
        {models.map((model, modelIndex) => (
          <div
            key={model.id}
            aria-hidden={modelIndex !== index}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${
              modelIndex === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <Image
              src={model.image}
              alt={`${brandName} ${model.name} - ${model.type}`}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority={modelIndex === 0}
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent p-5 sm:p-6">
              <p
                id={modelIndex === index ? headingId : undefined}
                className="text-xs font-medium tracking-[0.15em] text-brand-primary uppercase"
              >
                {model.type}
              </p>
              <h3 className="mt-1 font-[family-name:var(--font-brand-heading)] text-lg font-semibold text-white sm:text-xl">
                {model.name}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-white/75">{model.shortDescription}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-white/90 underline-offset-4 group-hover/slider:underline">
                Detayları Gör
              </span>
            </div>
          </div>
        ))}
      </Link>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Önceki model"
            className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-2 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover/slider:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Sonraki model"
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-2 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover/slider:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
          </button>

          <div className="mt-4 flex items-center justify-center gap-2" role="tablist" aria-label="Model seçimi">
            {models.map((model, dotIndex) => (
              <button
                key={model.id}
                type="button"
                role="tab"
                aria-selected={dotIndex === index}
                aria-label={`${model.name} göster`}
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
