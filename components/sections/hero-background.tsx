"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { cn } from "@/lib/utils/cn";

/**
 * Full-bleed hero background with a subtle scale-in on load and a dark
 * gradient overlay for text readability. Renders a real photo when
 * `image` is provided; otherwise a brand-toned gradient placeholder — the
 * gradient is intentionally NOT styled to look like a real photo, so it
 * reads as "no image yet" rather than a fake project image.
 */
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
}

export function HeroBackground({
  image,
  imageMobile = image,
  alt,
  objectPosition = "center",
  objectPositionMobile = objectPosition,
}: HeroBackgroundProps) {
  const prefersReducedMotion = useReducedMotion();
  const [loaded, setLoaded] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = requestAnimationFrame(() => setLoaded(true));
    return () => cancelAnimationFrame(id);
  }, [prefersReducedMotion]);

  const hasDistinctMobileImage = Boolean(imageMobile && imageMobile !== image);

  return (
    <div className="absolute inset-0 overflow-hidden bg-brand-background">
      <div
        className={cn(
          "absolute inset-0 transition-transform duration-[1200ms] ease-[var(--motion-easing)]",
          loaded ? "scale-100" : "scale-110",
        )}
      >
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
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-brand-background via-brand-background/70 to-brand-background/20",
          hasDistinctMobileImage && "hidden lg:block",
        )}
      />
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-r from-brand-background/60 via-transparent to-transparent",
          hasDistinctMobileImage && "hidden lg:block",
        )}
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
