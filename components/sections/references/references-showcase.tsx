"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useParallaxPointer } from "@/lib/motion/use-parallax-pointer";
import { HvacGridPattern } from "@/components/decorative/hvac-grid-pattern";
import { ReferenceLogo } from "./reference-logo";
import { cn } from "@/lib/utils/cn";
import type { PetraReference } from "@/lib/data/petra/references";

interface ReferencesShowcaseProps {
  references: PetraReference[];
  className?: string;
}

/**
 * Cinematic "one active reference at a time" showcase — the premium
 * centerpiece the revision brief asked for instead of a flat card grid:
 * large number + name + category on the left, the reference's
 * logo/fallback badge on the right, a thin "01/25" progress line with
 * ←/→ navigation below.
 *
 * Background is a purely abstract "engineering visual" (faint technical
 * grid + diagonal blueprint lines + a soft red glow) — never a fabricated
 * project photo, per the brief's explicit ban on inventing project
 * imagery.
 *
 * Parallax reuses `useParallaxPointer` (same hook as the hero, Phase B)
 * but only reacts to `source === "mouse"` — touch input is read by the
 * hook but deliberately ignored here so the effect is fully off on
 * mobile/touch, per this section's own (stricter than the hero's)
 * "desktop-only, fully disabled on touch" requirement. Amplitudes are
 * kept very small (2-6px) — the brief calls for "çok subtle", not a
 * hero-level effect.
 */
export function ReferencesShowcase({ references, className }: ReferencesShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { ref: parallaxRef, state: parallax } = useParallaxPointer<HTMLDivElement>();

  const total = references.length;
  const active = references[activeIndex];
  const numberLabel = String(activeIndex + 1).padStart(2, "0");
  const totalLabel = String(total).padStart(2, "0");

  function goTo(nextIndex: number) {
    setActiveIndex(((nextIndex % total) + total) % total);
  }

  const isMouse = parallax.source === "mouse";
  const px = isMouse ? parallax.x : 0;
  const py = isMouse ? parallax.y : 0;
  const gridOffset = `translate3d(${px * 3}px, ${py * 3}px, 0)`;
  const logoOffset = `translate3d(${px * 2}px, ${py * 2}px, 0)`;
  const numberOffset = `translate3d(${px * 4}px, ${py * 4}px, 0)`;
  const lightOffset = `translate3d(${px * 6}px, ${py * 6}px, 0)`;

  return (
    <div
      ref={parallaxRef}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-brand)] border border-white/10 bg-white/[0.02] p-6 sm:p-8 lg:p-12",
        className,
      )}
    >
      {/* Abstract engineering background — grid + blueprint lines, no photography. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 will-change-transform"
        style={{ transform: gridOffset }}
      >
        <HvacGridPattern className="opacity-[0.05]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(255,255,255,0.8) 0px, rgba(255,255,255,0.8) 1px, transparent 1px, transparent 46px)",
          }}
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-[-6%] h-72 w-72 rounded-full bg-brand-primary/10 blur-[110px] will-change-transform"
        style={{ transform: lightOffset }}
      />

      <div
        key={active.id}
        className="animate-reference-fade relative grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16"
      >
        <div className="relative">
          <span
            aria-hidden="true"
            className="block font-[family-name:var(--font-brand-heading)] text-[96px] leading-none font-semibold text-white/[0.07] select-none sm:text-[128px] will-change-transform"
            style={{ transform: numberOffset }}
          >
            {numberLabel}
          </span>
          <span className="text-xs font-medium tracking-[0.2em] text-brand-primary uppercase">
            {active.category}
          </span>
          <h3 className="mt-3 font-[family-name:var(--font-brand-heading)] text-2xl leading-tight font-semibold text-white sm:text-3xl">
            {active.name}
          </h3>
          <p className="mt-3 text-sm text-brand-muted">Petra Mühendislik Referansı</p>
        </div>

        <div className="flex justify-center will-change-transform lg:justify-end" style={{ transform: logoOffset }}>
          <ReferenceLogo reference={active} variant="panel" className="w-full max-w-[220px]" sizes="220px" />
        </div>
      </div>

      <div className="relative mt-10 flex items-center justify-between gap-6 border-t border-white/10 pt-6">
        <span className="text-xs tracking-[0.2em] text-brand-muted uppercase tabular-nums">
          {numberLabel} / {totalLabel}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            aria-label="Önceki referans"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/70 transition-colors duration-300 hover:border-brand-primary/40 hover:text-white"
          >
            <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => goTo(activeIndex + 1)}
            aria-label="Sonraki referans"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/70 transition-colors duration-300 hover:border-brand-primary/40 hover:text-white"
          >
            <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="relative mt-4 h-px w-full bg-white/10">
        <div
          className="absolute inset-y-0 left-0 bg-brand-primary transition-[width] duration-500 ease-[var(--motion-easing)]"
          style={{ width: `${((activeIndex + 1) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
