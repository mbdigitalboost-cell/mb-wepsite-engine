import type { CSSProperties } from "react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { HeroBackground } from "@/components/sections/hero-background";
import { petraHero } from "@/lib/data/petra/hero";
import { petraSiteName } from "@/lib/data/petra/site-config";

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
      />

      <Container className="relative z-10">
        {/*
          Faz 9.9: when the background image already has its own baked-in
          headline/subtext (see lib/data/petra/hero.ts's
          `backgroundHasEmbeddedHeadline`), rendering this H1/subtext on
          top of it would duplicate/clash with the image's own text. The
          real, functional CTA buttons and trust-info line below are
          NEVER baked into an image (they're interactive — tracked links,
          WhatsApp deep link) so they always render regardless.
        */}
        {!hero.backgroundHasEmbeddedHeadline ? (
          <>
            <Reveal variant="fade-up" index={0}>
              <h1 className="max-w-3xl font-[family-name:var(--font-brand-heading)] text-[38px] leading-[1.05] font-semibold tracking-tight text-white sm:text-[46px] md:text-[64px] lg:text-[84px]">
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
              <p className="mt-6 max-w-lg text-base text-white/80 sm:text-lg">{hero.subtext}</p>
            </Reveal>
          </>
        ) : (
          // Screen-reader-only heading: the visual headline lives inside the
          // background image itself — a real <h1> must still exist for
          // accessibility/SEO structure even though it isn't shown visually.
          <h1 className="sr-only">{hero.headingLines.join(" ")}</h1>
        )}

        <Reveal variant="fade-up" index={2}>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
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
