"use client";

import { useEffect, useState } from "react";
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
   * CSS object-position for the background image, e.g. "22% center".
   * Defaults to "center" (plain object-cover). Needed when the image has
   * important baked-in content (logo/headline/text) off-center — object-
   * cover's default centered crop would clip it on narrower viewports.
   * See lib/data/petra/hero.ts's current image: its content sits in the
   * left ~45%, so the homepage passes an off-center value here instead
   * of this component guessing/hardcoding one image's specific framing.
   */
  objectPosition?: string;
}

export function HeroBackground({ image, alt, objectPosition = "center" }: HeroBackgroundProps) {
  const prefersReducedMotion = useReducedMotion();
  const [loaded, setLoaded] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = requestAnimationFrame(() => setLoaded(true));
    return () => cancelAnimationFrame(id);
  }, [prefersReducedMotion]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-brand-background">
      <div
        className={cn(
          "absolute inset-0 transition-transform duration-[1200ms] ease-[var(--motion-easing)]",
          loaded ? "scale-100" : "scale-110",
        )}
      >
        {image ? (
          <Image
            src={image}
            alt={alt}
            fill
            priority
            className="object-cover"
            style={{ objectPosition }}
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(ellipse_at_top_right,_var(--color-brand-secondary)_0%,_var(--color-brand-background)_60%)]" />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-brand-background via-brand-background/70 to-brand-background/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-brand-background/60 via-transparent to-transparent" />
    </div>
  );
}
