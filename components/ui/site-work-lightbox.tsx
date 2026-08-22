"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";
import type { PetraSiteWork } from "@/lib/data/petra/site-works";

const SWIPE_THRESHOLD_PX = 40;

export interface SiteWorkLightboxProps {
  items: PetraSiteWork[];
  /** Index of the item to open on, or null when closed. */
  openIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/**
 * Premium lightbox for "Sahadaki Çalışmalarımız" — açık iş kuralı: sayfa
 * yüklenirken hiçbir görsel/video devasa boyutta önceden yüklenmez
 * (bu bileşen yalnızca `openIndex !== null` olduğunda DOM'a gerçek
 * `<video>`/büyük `<Image>` render eder). Klavye (←/→/Esc), dışarı
 * tıklama, ve dokunmatik swipe destekli. Fotoğraf ve video aynı
 * bileşende gösterilir — video `controls playsInline preload="metadata"`
 * ile (mobil veri tüketimini gözeten, brief §9/§13 gereği).
 */
export function SiteWorkLightbox({ items, openIndex, onClose, onNavigate }: SiteWorkLightboxProps) {
  const touchStartX = useRef<number | null>(null);
  const dialogTitleId = useId();
  const isOpen = openIndex !== null;
  const active = isOpen ? items[openIndex] : null;
  const count = items.length;

  const goTo = useCallback(
    (next: number) => {
      onNavigate(((next % count) + count) % count);
    },
    [count, onNavigate],
  );

  const goNext = useCallback(() => {
    if (openIndex !== null) goTo(openIndex + 1);
  }, [goTo, openIndex]);

  const goPrev = useCallback(() => {
    if (openIndex !== null) goTo(openIndex - 1);
  }, [goTo, openIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") goNext();
      else if (event.key === "ArrowLeft") goPrev();
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose, goNext, goPrev]);

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

  if (!isOpen || !active) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogTitleId}
      className="fixed inset-0 z-[60] flex flex-col bg-black/95 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between p-4 sm:p-6">
        <p id={dialogTitleId} className="text-sm text-white/70">
          {openIndex !== null ? openIndex + 1 : 0} / {count}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          <Icon icon={X} size="md" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 pb-4 sm:px-16">
        {active.type === "video" && active.videoSrc ? (
          <video
            key={active.id}
            src={active.videoSrc}
            poster={active.image}
            controls
            playsInline
            preload="metadata"
            className="max-h-full max-w-full rounded-[var(--radius-brand)]"
          />
        ) : (
          <div
            key={active.id}
            className={cn(
              "relative max-h-full",
              active.aspect === "portrait" ? "aspect-[3/4] h-full" : "aspect-[4/3] w-full max-w-4xl",
            )}
          >
            <Image
              src={active.image}
              alt={active.caption}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>
        )}

        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Önceki"
              className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary sm:left-4"
            >
              <ChevronLeft size={22} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Sonraki"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary sm:right-4"
            >
              <ChevronRight size={22} strokeWidth={2} aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center sm:pb-6">
        <p className="text-sm text-white/80">{active.caption}</p>
        <p className="mt-1 text-xs tracking-[0.15em] text-brand-primary uppercase">
          {active.projectLabel ?? "Petra Mühendislik Uygulaması"}
        </p>
      </div>
    </div>
  );
}
