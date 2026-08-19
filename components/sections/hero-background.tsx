"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { BREAKPOINTS } from "@/lib/design-system/tokens";
import type { ParallaxState } from "@/lib/motion/use-parallax-pointer";
import { cn } from "@/lib/utils/cn";

/**
 * Full-bleed hero background with a subtle scale-in on load and a dark
 * gradient overlay for text readability. Renders a real photo when
 * `image` is provided; otherwise a brand-toned gradient placeholder — the
 * gradient is intentionally NOT styled to look like a real photo, so it
 * reads as "no image yet" rather than a fake project image.
 *
 * Interactive parallax (mouse on desktop, drag-touch on mobile): the
 * `parallax` prop, when provided, drives two independent transform-only
 * layers plus a soft ambient-light glow — see the constants and the
 * `*Style` builders below. No layout property (left/top/width/height) is
 * ever touched, only `transform`, so this can never cause CLS. Entirely
 * additive: with `parallax` omitted, or with prefers-reduced-motion (the
 * caller's `useParallaxPointer` already collapses to `{x:0,y:0}` in that
 * case), every transform below evaluates to its identity value and this
 * component renders pixel-identical to before this feature existed.
 */

/** Desktop (mouse): "ana görsel" translate amplitude, ~5-8% of the brief. */
const MAIN_TRANSLATE_DESKTOP = 6.5;
/** Mobile (touch-drag): deliberately lower amplitude than desktop, per the brief. */
const MAIN_TRANSLATE_MOBILE = 2.5;
/** Max tilt in degrees — desktop-only; the brief doesn't ask for 3D tilt on touch. */
const MAIN_TILT_MAX_DEG = 3;
/** "Arka plan" layer: ~2-3% of the brief, always less movement than the main layer. */
const BG_TRANSLATE_DESKTOP = 2.5;
const BG_TRANSLATE_MOBILE = 1;
/** Ambient light glow — a new, brand-neutral radial highlight, not baked into any photo. */
const AMBIENT_TRANSLATE_DESKTOP = 14;
const AMBIENT_TRANSLATE_MOBILE = 6;
interface HeroBackgroundProps {
  image: string | null;
  alt: string;
  /**
   * Separate image to use below `lg`, e.g. a portrait-composed banner
   * instead of cropping a wide desktop one (see hero.ts's
   * `backgroundImageMobile` doc). Defaults to `image` when omitted —
   * unchanged single-image behavior for any hero that doesn't set this.
   * When it differs from `image`, both are rendered (one `lg:hidden`,
   * one `hidden lg:block`) so each keeps its own art direction instead
   * of one crop compromising for both aspect ratios.
   */
  imageMobile?: string | null;
  /**
   * CSS object-position for the background image at `lg`+, e.g.
   * "22% center". Defaults to "center" (plain object-cover). Needed when
   * the image has important baked-in content (logo/headline/text)
   * off-center — object-cover's default centered crop would clip it.
   * See lib/data/petra/hero.ts's current image: its content sits in the
   * left ~45%, so the homepage passes an off-center value here instead
   * of this component guessing/hardcoding one image's specific framing.
   */
  objectPosition?: string;
  /**
   * CSS object-position below `lg`. Defaults to the same value as
   * `objectPosition` when omitted (unchanged behavior for any hero that
   * doesn't set this). A wide desktop-oriented banner's crop rarely
   * still makes sense on a narrow portrait phone (see hero.ts's
   * `backgroundObjectPositionMobile` doc) — this lets a customer's hero
   * data pass a distinct mobile framing instead of forcing one crop to
   * serve both aspect ratios.
   */
  objectPositionMobile?: string;
  /**
   * Interactive parallax input from `useParallaxPointer`, tracked on the
   * hero `<section>` in hero.tsx and passed down here. Omit (or pass
   * reduced-motion's permanent zero state) for the original static
   * background.
   */
  parallax?: ParallaxState;
}

export function HeroBackground({
  image,
  imageMobile = image,
  alt,
  objectPosition = "center",
  objectPositionMobile = objectPosition,
  parallax,
}: HeroBackgroundProps) {
  const prefersReducedMotion = useReducedMotion();
  const [loaded, setLoaded] = useState(prefersReducedMotion);
  // Lazily read the initial match (same pattern as useReducedMotion) so
  // the first client render is already correct — only the *subscription*
  // to future changes belongs in the effect below, not this initial read.
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia(`(min-width: ${BREAKPOINTS.lg}px)`).matches,
  );

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = requestAnimationFrame(() => setLoaded(true));
    return () => cancelAnimationFrame(id);
  }, [prefersReducedMotion]);

  // Desktop gets the fuller-amplitude + tilt treatment, mobile a lighter
  // translate-only one (see the amplitude constants above) — tracked via
  // matchMedia rather than a CSS breakpoint class since the transform
  // values themselves are computed in JS from `parallax`.
  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${BREAKPOINTS.lg}px)`);
    const handleChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  const hasDistinctMobileImage = Boolean(imageMobile && imageMobile !== image);

  const offsetX = parallax?.x ?? 0;
  const offsetY = parallax?.y ?? 0;
  const hasParallax = !prefersReducedMotion && (offsetX !== 0 || offsetY !== 0);

  const mainAmplitude = isDesktop ? MAIN_TRANSLATE_DESKTOP : MAIN_TRANSLATE_MOBILE;
  const bgAmplitude = isDesktop ? BG_TRANSLATE_DESKTOP : BG_TRANSLATE_MOBILE;
  const ambientAmplitude = isDesktop ? AMBIENT_TRANSLATE_DESKTOP : AMBIENT_TRANSLATE_MOBILE;

  // "Ana görsel" layer — translate (5-8% desktop / lower on mobile) plus a
  // subtle rotateX/rotateY tilt, desktop-only, capped at MAIN_TILT_MAX_DEG.
  const mainParallaxStyle: CSSProperties = {
    transform: `translate3d(${offsetX * mainAmplitude}%, ${offsetY * mainAmplitude}%, 0)${
      isDesktop ? ` rotateX(${offsetY * -MAIN_TILT_MAX_DEG}deg) rotateY(${offsetX * MAIN_TILT_MAX_DEG}deg)` : ""
    }`,
    willChange: hasParallax ? "transform" : undefined,
  };

  // "Arka plan" layer — the existing readability gradients, nudged a
  // couple of percent in the opposite direction of the main image for a
  // cheap two-plane depth cue without a second image asset.
  const bgParallaxStyle: CSSProperties = {
    transform: `translate3d(${offsetX * -bgAmplitude}%, ${offsetY * -bgAmplitude}%, 0)`,
    willChange: hasParallax ? "transform" : undefined,
  };

  // Ambient light glow — a plain radial gradient, moved (never resized)
  // via transform so it stays GPU-cheap; not baked into any photo, no
  // text/logo inside it, purely a lighting enhancement.
  const ambientParallaxStyle: CSSProperties = {
    transform: `translate3d(${offsetX * ambientAmplitude}%, ${offsetY * ambientAmplitude}%, 0)`,
    willChange: hasParallax ? "transform" : undefined,
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-brand-background">
      <div
        className={cn(
          "absolute inset-0 transition-transform duration-[1200ms] ease-[var(--motion-easing)]",
          loaded ? "scale-100" : "scale-110",
        )}
        style={{ perspective: 1200 }}
      >
        <div className="absolute inset-0" data-parallax-layer="main" style={mainParallaxStyle}>
          {hasDistinctMobileImage ? (
            <>
              <Image
                src={imageMobile as string}
                alt={alt}
                fill
                priority
                className="object-cover lg:hidden"
                style={{ objectPosition: objectPositionMobile }}
              />
              {image ? (
                <Image
                  src={image}
                  alt={alt}
                  fill
                  priority
                  className="hidden object-cover lg:block"
                  style={{ objectPosition }}
                />
              ) : null}
            </>
          ) : image ? (
            <Image
              src={image}
              alt={alt}
              fill
              priority
              className="object-cover object-[var(--hero-op-mobile)] lg:object-[var(--hero-op-desktop)]"
              style={
                {
                  "--hero-op-mobile": objectPositionMobile,
                  "--hero-op-desktop": objectPosition,
                } as CSSProperties
              }
            />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(ellipse_at_top_right,_var(--color-brand-secondary)_0%,_var(--color-brand-background)_60%)]" />
          )}
        </div>
      </div>

      {image || imageMobile ? (
        // Ambient light: sits above the image, below the darkening
        // gradients (rendered next) so it enhances contrast/depth instead
        // of washing out either the real text (Container, z-10, further
        // above) or any baked-in text already in the photo itself.
        <div
          aria-hidden="true"
          data-parallax-layer="ambient"
          className="pointer-events-none absolute -inset-1/4"
          style={ambientParallaxStyle}
        >
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background: "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.14), transparent 55%)",
            }}
          />
        </div>
      ) : null}
      {/*
        Faz 13 revizyon 2: these two darkening gradients were tuned for a
        wide desktop-style banner (extra contrast for real text/buttons
        laid over a busy photo). A dedicated mobile image (see hero.ts's
        `backgroundImageMobile`) already has a dark navy background baked
        in with its own contrast handled — applying the same gradients on
        top made its bottom icon row nearly unreadable. So below `lg`
        they're skipped entirely when a distinct mobile image is active;
        always applied at `lg`+ (the desktop crop) regardless.
      */}
      {/*
        Faz 14 (interaktif hero parallax): these two solid-color-based
        gradients now double as the brief's "background" depth plane —
        the only other layer available, since this hero has a single
        photographic asset, not a separate background image. `-inset-[4%]`
        overscans them (safely clipped by the root's `overflow-hidden`)
        so the 2-3% translate never reveals a bare edge; every stop in
        both gradients is an opaque/semi-opaque brand color (never fully
        transparent at the edges), so the overscan is invisible when at
        rest (offset 0) — pixel-identical to the pre-parallax version.
      */}
      <div
        className={cn(
          "absolute -inset-[4%] bg-gradient-to-t from-brand-background via-brand-background/70 to-brand-background/20",
          hasDistinctMobileImage && "hidden lg:block",
        )}
        data-parallax-layer="background"
        style={bgParallaxStyle}
      />
      <div
        className={cn(
          "absolute -inset-[4%] bg-gradient-to-r from-brand-background/60 via-transparent to-transparent",
          hasDistinctMobileImage && "hidden lg:block",
        )}
        data-parallax-layer="background"
        style={bgParallaxStyle}
      />
      {!hasDistinctMobileImage ? (
        // Faz 13 (mobil düzeltme): when mobile is sharing the wide desktop
        // crop (no dedicated mobile image set), it can still show a faint
        // sliver of that banner's full-width bottom icon/text row, right
        // around where the real CTA buttons/trustInfo line sit — the two
        // gradients above were tuned for the desktop crop, which doesn't
        // have this row in the same place. This extra bottom-anchored
        // darkening only applies in that fallback case (`lg:hidden`).
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-brand-background to-transparent lg:hidden" />
      ) : null}
    </div>
  );
}
