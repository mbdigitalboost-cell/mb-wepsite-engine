"use client";

import type { CSSProperties } from "react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { HeroBackground } from "@/components/sections/hero-background";
import { useParallaxPointer } from "@/lib/motion/use-parallax-pointer";
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
  const hideMobile = hero.backgroundHasEmbeddedHeadlineMobile;
  const hideDesktop = hero.backgroundHasEmbeddedHeadline;

  // İnteraktif hero parallax: mouse (desktop) / touch-drag (mobil) takibi,
  // yalnızca bu hero <section>'ına bağlı — sitedeki diğer bölümlere
  // yayılmaz (bkz. lib/motion/use-parallax-pointer.ts, components/
  // sections/hero-background.tsx). `ref` doğrudan <section>'a bağlanıyor
  // ki mousemove olayları CTA butonları/metin gibi üstteki gerçek
  // içeriğin üzerinden geçerken de yakalansın (event bubbling) — arka
  // planın kendisine değil, tüm hero alanına tepki verir.
  const { ref: parallaxRef, state: parallax } = useParallaxPointer<HTMLElement>();

  return (
    <section
      ref={parallaxRef}
      className={cn(
        "relative -mt-20 flex overflow-hidden pb-16 lg:min-h-screen lg:aspect-auto lg:pb-0",
        // Faz 13 revizyon 2: `min-h-[92vh]` (a fixed viewport-height box)
        // made the visible object-cover crop fraction of the mobile image
        // vary with viewport width — verified broken at 820px (a portrait
        // tablet): the crop shifted enough that the vertically-centered
        // CTA buttons landed on top of the image's own baked-in subtext.
        // Locking the SECTION's own aspect ratio to the mobile image's
        // (864:1821) instead means the visible crop fraction stays ~constant
        // across every width below `lg` (little to no cropping at all,
        // any width), so a single vertically-centered position works
        // everywhere. Only applied while `hideMobile` (a dedicated mobile
        // image is actually active) — any other hero keeps the previous
        // fixed-viewport-height behavior.
        // w-full is required alongside aspect-ratio here: as a flex item
        // in the root layout's column flex container, aspect-ratio alone
        // can make the browser derive WIDTH from the ratio too (shrinking
        // the whole hero into a narrow column instead of spanning full
        // width) — verified broken without this. No max-height cap: any
        // cap that activates on a wide-but-short mobile-tier viewport
        // (e.g. a portrait tablet) reintroduces cropping and undoes the
        // whole point of this aspect-ratio fix (see the comment above) —
        // a portrait tablet visitor scrolling slightly further through a
        // correctly-legible hero beats a shorter hero with text/buttons
        // overlapping.
        hideMobile ? "aspect-[864/1821] w-full" : "min-h-[92vh]",
        // Faz 13 revizyon 2: a bottom-anchored mobile layout (items-end)
        // made sense when mobile always showed the real, always-visible
        // heading/CTA stack clustered low. With a dedicated mobile image
        // that has its own baked-in headline block (see hero.ts's
        // `backgroundImageMobile` doc), the real CTA buttons are the
        // ONLY visible element left below `lg` and need to land in that
        // image's empty middle gap instead — items-center does that.
        hideMobile ? "items-center" : "items-end",
        "lg:items-center",
      )}
    >
      <HeroBackground
        image={hero.backgroundImage}
        imageMobile={hero.backgroundImageMobile}
        alt={petraSiteName}
        objectPosition={hero.backgroundObjectPosition}
        objectPositionMobile={hero.backgroundObjectPositionMobile}
        parallax={parallax}
      />

      <Container className="relative z-10">
        {/*
          Faz 13 (mobil düzeltme): a background image with baked-in text
          only keeps that text legible at the crop/aspect-ratio it was
          designed for. This hero has two purpose-built images — a wide
          desktop banner (`backgroundHasEmbeddedHeadline`, `lg`+) and a
          portrait mobile banner (`backgroundHasEmbeddedHeadlineMobile`,
          below `lg`) — each hides the real H1/subtext/trustInfo only at
          the width where ITS OWN baked-in text is legible. The `<h1>`
          itself always stays in the DOM (via `sr-only`, never `hidden`)
          for accessibility/SEO regardless of which image is active.
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
              hideMobile && "sr-only",
              hideDesktop ? "lg:sr-only" : hideMobile && "lg:not-sr-only",
              !hideDesktop && "lg:text-[84px]",
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
              hideMobile && "hidden",
              hideDesktop ? "lg:hidden" : hideMobile && "lg:block",
            )}
          >
            {hero.subtext}
          </p>
        </Reveal>

        {/*
          Faz 4J (hizalama revizyonu): CTA butonları ve trustInfo satırı
          artık masaüstünde (`lg`+) bu ORTAK sarmalayıcı üzerinden DİKEY
          olarak (üstte CTA, altında trustInfo) sağ tarafta gruplanıyor —
          `trustInfoOffset` (`%44`), önceden trustInfo'nun kendi div'inde
          uygulanan sağa-itme kaydırmasıydı; artık TEK YERDE, bu grubun
          tamamına uygulanıyor (aşağıda `lg:ml-[var(--trust-offset)]`) —
          trustInfo'nun kendi div'inde AYNI class tekrar YOK, aksi halde
          %44 iki kere uygulanırdı. Mobilde bu div hiçbir unprefixed class
          taşımadığı için tamamen etkisiz (düz bir <div>), iki alt öge
          eskisi gibi ayrı ayrı akışta kalır. Dikey konumlandırma offset'i
          (`ctaTopOffset`) hâlâ CTA'nın kendi div'inden değil bu
          sarmalayıcıdan uygulanıyor — aksi halde flex sütununda CTA kendi
          margin-top'uyla trustInfo'dan aşağı kayardı. Her iki <Reveal>
          kendi bağımsız stagger index'ini (2 / 3) koruyor, DOM/animasyon
          davranışları değişmedi.
        */}
        <div
          className={cn(
            "lg:flex lg:flex-col lg:items-start lg:gap-6 lg:ml-[var(--trust-offset)]",
            hideDesktop && hero.ctaTopOffset && "lg:mt-[var(--cta-offset)]",
          )}
          style={
            {
              ...(hideDesktop && hero.ctaTopOffset ? { "--cta-offset": hero.ctaTopOffset } : {}),
              ...(hero.trustInfoOffset ? { "--trust-offset": hero.trustInfoOffset } : {}),
            } as CSSProperties
          }
        >
          <Reveal variant="fade-up" index={2}>
            <div
              className={cn(
                "mt-10 flex flex-col gap-4 sm:flex-row lg:mt-0",
                hideMobile && hero.ctaTopOffsetMobile && "mt-[var(--cta-offset-mobile)]",
              )}
              style={
                hideMobile && hero.ctaTopOffsetMobile
                  ? ({ "--cta-offset-mobile": hero.ctaTopOffsetMobile } as CSSProperties)
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
              position instead of being pushed off-screen. When the mobile
              image has its own baked-in "why us" icon row (`hideMobile`),
              this real trustInfo line would duplicate it, so it's hidden
              below `lg` the same way the heading/subtext are.

              Faz 4I: `lg:mt-0` added — trustInfo now sits below CTA
              inside the shared right-side group (via the wrapper above)
              with the gap coming from the wrapper's `lg:gap-6`, so the
              old `mt-14` (meant for the original stacked layout) must
              not add extra vertical offset at `lg`+. Mobile keeps `mt-14`
              unchanged (irrelevant anyway while `hidden` there).

              Faz 4J: `lg:ml-[var(--trust-offset)]` moved OFF this div —
              the `%44` shift now applies once, to the whole CTA+trustInfo
              group (see wrapper above). Re-adding it here would double it.
            */}
            <div
              className={cn(
                "mt-14 items-center gap-6 text-xs font-medium tracking-[0.2em] text-white/60 uppercase lg:mt-0",
                // trustInfo is never hidden at `lg`+ — even when the desktop
                // image has its own baked icon row, the real line stays
                // visible there and just shifts via `trustInfoOffset`
                // instead (unchanged, pre-existing behavior).
                hideMobile ? "hidden lg:flex" : "flex",
              )}
            >
              {hero.trustInfo.map((item, i) => (
                <span key={item} className="flex items-center gap-6">
                  {i > 0 ? <span aria-hidden="true" className="h-1 w-1 rounded-full bg-white/30" /> : null}
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
