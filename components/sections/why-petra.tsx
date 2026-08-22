"use client";

import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Icon } from "@/components/ui/icon";
import { SectionDivider } from "@/components/ui/section-divider";
import { HvacGridPattern } from "@/components/decorative/hvac-grid-pattern";
import { useParallaxPointer } from "@/lib/motion/use-parallax-pointer";
import { petraAdvantages } from "@/lib/data/petra/why-petra";
import { petraWhyPetraIcons, petraWhyPetraIconFallback } from "@/lib/data/petra/why-petra-icons";
import { petraSiteName } from "@/lib/data/petra/site-config";

/**
 * Homepage visual revision: same 4 advantages / same copy as before
 * (lib/data/petra/why-petra.ts, untouched) — only the presentation
 * changed, from 4 plain text columns to a premium card grid with a
 * ~30/70 heading-vs-cards split at `lg`+. No CMS wiring exists for this
 * section (still static-only, matching its pre-existing behavior — see
 * app/(public)/page.tsx, `<WhyPetra />` takes no props) and none was
 * added here.
 *
 * Hakkımızda sayfası revizyonu: kart grid'ine çok hafif masaüstü
 * mouse-parallax eklendi (`useParallaxPointer` — References showcase'te
 * kullanılan aynı hook, yalnızca `source === "mouse"` olduğunda, dokunma-
 * tikte tamamen kapalı). Bu, bileşeni Client Component yapıyor (önceden
 * Server Component'ti) — hem anasayfada hem `/hakkimizda`'da kullanıldığı
 * için değişiklik her iki yerde de görünür, brief'in "Neden Petra?
 * bölümünü kaldırma, daha görsel hale getir" isteğiyle uyumlu.
 */
export function WhyPetra() {
  const { ref: parallaxRef, state: parallax } = useParallaxPointer<HTMLDivElement>();
  const isMouse = parallax.source === "mouse";
  const offsetX = isMouse ? parallax.x * 4 : 0;
  const offsetY = isMouse ? parallax.y * 4 : 0;

  return (
    <section className="relative overflow-hidden border-t border-white/10 py-24 lg:py-32">
      <SectionDivider />

      {/*
        Section-wide depth layer (brief §3): a soft red glow + a very
        faint technical grid, both far below anything that would compete
        with the real content — "arka plan kesinlikle dikkat çekmemeli".
        `overflow-hidden` on the section keeps the blurred glow circle
        from ever causing horizontal scroll.
      */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 right-[-10%] h-[420px] w-[420px] rounded-full bg-brand-primary/10 blur-[130px]" />
        <HvacGridPattern className="opacity-[0.035]" />
      </div>

      <Container className="relative grid grid-cols-1 gap-12 lg:grid-cols-[1fr_2fr] lg:gap-16 xl:gap-20">
        <Reveal>
          <h2 className="max-w-sm font-[family-name:var(--font-brand-heading)] text-[32px] leading-tight font-semibold text-white sm:text-[42px] lg:text-[44px]">
            Neden {petraSiteName.split(" ")[0]}?
          </h2>
          <p className="mt-4 max-w-sm text-sm text-brand-muted">
            Mühendislik yaklaşımımızdan servis deneyimine kadar her aşamada kontrollü süreç.
          </p>
        </Reveal>

        <div
          ref={parallaxRef}
          className="grid grid-cols-1 gap-5 will-change-transform sm:grid-cols-2 sm:gap-6"
          style={{ transform: `translate3d(${offsetX}px, ${offsetY}px, 0)` }}
        >
          {petraAdvantages.map((advantage, index) => {
            const number = String(index + 1).padStart(2, "0");
            return (
              <Reveal key={advantage.title} index={index}>
                <div className="group relative overflow-hidden rounded-[var(--radius-brand)] border border-white/10 bg-white/[0.03] p-6 transition-[transform,border-color,box-shadow] duration-300 ease-[var(--motion-easing)] hover:-translate-y-1 hover:border-brand-primary/30 hover:shadow-[0_20px_45px_-24px_var(--tw-shadow-color)] hover:shadow-black/70 sm:p-7">
                  {/* Very low-opacity technical grid, unique per card. */}
                  <HvacGridPattern className="opacity-[0.05]" />

                  {/* Two soft highlights crossfade on hover — a cheap
                      stand-in for an actually-animating gradient position
                      (only opacity is transitioned, so it stays GPU-cheap). */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-100 transition-opacity duration-500 group-hover:opacity-0"
                    style={{ background: "radial-gradient(circle at 20% 15%, rgba(255,255,255,0.05), transparent 60%)" }}
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-brand-primary/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{ background: "radial-gradient(circle at 80% 85%, rgba(255,255,255,0.07), transparent 60%)" }}
                  />
                  {/* Petra red, kept deliberately faint — "çok düşük yoğunlukta accent". */}
                  <div className="pointer-events-none absolute inset-0 bg-brand-primary/0 transition-colors duration-500 group-hover:bg-brand-primary/[0.04]" />

                  <div className="relative flex items-start justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-brand-background/60 transition-transform duration-300 group-hover:scale-105">
                      <Icon
                        icon={petraWhyPetraIcons[advantage.title] ?? petraWhyPetraIconFallback}
                        size="md"
                        className="text-brand-primary"
                      />
                    </span>
                    <span
                      aria-hidden="true"
                      className="font-[family-name:var(--font-brand-heading)] text-4xl leading-none font-semibold text-white/10 select-none sm:text-5xl"
                    >
                      {number}
                    </span>
                  </div>

                  <h3 className="relative mt-6 text-base font-semibold text-white">{advantage.title}</h3>
                  <p className="relative mt-2 text-sm text-brand-muted">{advantage.description}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
