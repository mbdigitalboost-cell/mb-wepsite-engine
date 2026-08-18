import type { CSSProperties } from "react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { HeroBackground } from "@/components/sections/hero-background";
import { petraHero } from "@/lib/data/petra/hero";
import { petraSiteName } from "@/lib/data/petra/site-config";
import { cn } from "@/lib/utils/cn";

interface HeroProps {
  whatsappHref: string | null;
  /**
   * Optional CMS-sourced override — defaults to the static `petraHero`
   * import when omitted, so every existing call site (and any future one
   * that doesn't pass this) renders exactly as before. See
   * app/(public)/page.tsx for the one place that currently passes a real
   * value (only when the CMS adapter actually returned published data —
   * see lib/cms/petra/mappers.ts).
   */
  hero?: typeof petraHero;
}

export function Hero({ whatsappHref, hero = petraHero }: HeroProps) {
  return (
    <section className="relative -mt-20 flex min-h-[92vh] items-end overflow-hidden pb-16 lg:min-h-screen lg:items-center lg:pb-0">
      <HeroBackground
        image={hero.backgroundImage}
        alt={petraSiteName}
        objectPosition={hero.backgroundObjectPosition}
        objectPositionMobile={hero.backgroundObjectPositionMobile}
      />

      <Container className="relative z-10">
        {/*
          Faz 13 (mobil düzeltme): a background image with baked-in text
          (backgroundHasEmbeddedHeadline) can only ever keep that text
          legible at the crop/aspect-ratio it was designed for — for this
          hero that's a wide desktop banner (see hero.ts's
          `backgroundObjectPositionMobile` doc). So below `lg` this always
          renders the REAL, properly-sized heading/subtext — same as any
          hero without an embedded headline — and only visually hides it
          at `lg`+ (`lg:sr-only` / `lg:hidden`) once the desktop crop
          actually shows the baked-in text in full. The `<h1>` itself
          always stays in the DOM either way for accessibility/SEO.
        */}
        <Reveal variant="fade-up" index={0}>
          <h1
            className={cn(
              // Faz 13: base size dropped from 38px — "İKLİMLENDİRMEDE" (16
              // karakter) 38px'te dar telefon genişliklerinde (~360-390px
              // kullanılabilir alan) taşıp kırpılıyordu. break-words da bir
              // güvenlik önlemi: herhangi bir tek uzun kelime yine de
              // sığmazsa, yatay taşma yerine satır içinde kırılır.
              "max-w-3xl font-[family-name:var(--font-brand-heading)] text-[30px] leading-[1.05] font-semibold tracking-tight text-white break-words sm:text-[46px] md:text-[64px]",
              hero.backgroundHasEmbeddedHeadline ? "lg:sr-only" : "lg:text-[84px]",
            )}
          >
            {hero.headingLines.map((line, index) => (
              <span
                key={line}
                className={index === hero.accentLineIndex ? "block text-brand-primary" : "block"}
              >
                {line}
              </span>
            ))}
          </h1>
        </Reveal>

        <Reveal variant="fade-up" index={1}>
          <p
            className={cn(
              "mt-6 max-w-lg text-base text-white/80 sm:text-lg",
              hero.backgroundHasEmbeddedHeadline && "lg:hidden",
            )}
          >
            {hero.subtext}
          </p>
        </Reveal>

        <Reveal variant="fade-up" index={2}>
          <div
            className={cn(
              "mt-10 flex flex-col gap-4 sm:flex-row",
              hero.backgroundHasEmbeddedHeadline && hero.ctaTopOffset && "lg:mt-[var(--cta-offset)]",
            )}
            style={
              hero.backgroundHasEmbeddedHeadline && hero.ctaTopOffset
                ? ({ "--cta-offset": hero.ctaTopOffset } as CSSProperties)
                : undefined
            }
          >
            <Button
              href={hero.ctaPrimaryHref}
              size="lg"
              showArrow
              trackEvent="generate_lead"
              trackPayload={{ source: "hero" }}
            >
              {hero.ctaPrimaryLabel}
            </Button>
            {whatsappHref ? (
              <Button
                href={whatsappHref}
                external
                variant="outline"
                size="lg"
                className="text-white"
                trackEvent="whatsapp_click"
                trackPayload={{ source: "hero" }}
              >
                {hero.ctaSecondaryLabel}
              </Button>
            ) : null}
          </div>
        </Reveal>

        <Reveal variant="fade-up" index={3}>
          {/*
            trustInfoOffset only ever needs to clear a baked-in image row
            that itself only appears at desktop widths (see
            lib/data/petra/hero.ts's doc) — scoped to lg: so mobile, where
            there's no collision to avoid, keeps its normal left-aligned
            position instead of being pushed off-screen.
          */}
          <div
            className="mt-14 flex items-center gap-6 text-xs font-medium tracking-[0.2em] text-white/60 uppercase lg:ml-[var(--trust-offset)]"
            style={hero.trustInfoOffset ? ({ "--trust-offset": hero.trustInfoOffset } as CSSProperties) : undefined}
          >
            {hero.trustInfo.map((item, i) => (
              <span key={item} className="flex items-center gap-6">
                {i > 0 ? <span aria-hidden="true" className="h-1 w-1 rounded-full bg-white/30" /> : null}
                {item}
              </span>
            ))}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
