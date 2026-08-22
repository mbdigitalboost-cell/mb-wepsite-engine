"use client";

import { useInView } from "@/lib/motion/use-in-view";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils/cn";
import { petraTimeline } from "@/lib/data/petra/about";

/**
 * Premium dikey zaman çizelgesi — brief'in istediği "timeline çizgisinin
 * scroll ile ortaya çıkması" efekti: dikey kırmızı çizginin `height`'ı
 * bölüm görünüme girene kadar 0, girince CSS transition ile %100'e
 * büyüyor (`useInView`, `Reveal`'ın kullandığı aynı IntersectionObserver
 * primitive'i). Yalnızca 2 doğrulanmış nokta var — 2017 (kuruluş) ve
 * "Bugün" — aradaki yıllar için uydurma kilometre taşı YOK (bkz.
 * lib/data/petra/about.ts).
 *
 * `prefers-reduced-motion`'da `useInView` anında `inView: true` döndürür
 * (observer hiç bağlanmaz) — çizgi transitionsuz, doğrudan tam boyda
 * render olur.
 */
export function Timeline() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section className="border-b border-white/10 py-20 lg:py-28">
      <Container>
        <Reveal className="max-w-xl">
          <span className="text-xs font-medium tracking-[0.2em] text-brand-primary uppercase">Zaman Çizelgesi</span>
          <h2 className="mt-3 font-[family-name:var(--font-brand-heading)] text-[28px] leading-tight font-semibold text-white sm:text-[34px]">
            Kuruluştan Bugüne
          </h2>
        </Reveal>

        <div ref={ref} className="relative mt-14 max-w-2xl pl-10 sm:pl-12">
          {/* Dikey iz — ince beyaz çizgi (statik) + üzerine büyüyen kırmızı çizgi. */}
          <div aria-hidden="true" className="absolute top-1 bottom-1 left-[7px] w-px bg-white/10 sm:left-[9px]" />
          <div
            aria-hidden="true"
            className="absolute top-1 left-[7px] w-px origin-top bg-brand-primary shadow-[0_0_10px_1px_var(--tw-shadow-color)] shadow-brand-primary/40 transition-transform duration-1000 ease-[var(--motion-easing)] sm:left-[9px]"
            style={{ height: "calc(100% - 8px)", transform: inView ? "scaleY(1)" : "scaleY(0)" }}
          />

          <ol className="flex flex-col gap-14">
            {petraTimeline.map((item, index) => (
              <li key={item.year} className="relative">
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-1 -left-10 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 bg-brand-background transition-colors duration-500 sm:-left-12",
                    inView ? "border-brand-primary" : "border-white/20",
                  )}
                  style={{ transitionDelay: `${index * 300}ms` }}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-colors duration-500",
                      inView ? "bg-brand-primary" : "bg-white/20",
                    )}
                    style={{ transitionDelay: `${index * 300}ms` }}
                  />
                </span>
                <Reveal index={index}>
                  <span className="font-[family-name:var(--font-brand-heading)] text-3xl font-semibold text-white sm:text-4xl">
                    {item.year}
                  </span>
                  <p className="mt-2 text-sm font-medium tracking-[0.15em] text-brand-primary uppercase">
                    {item.title}
                  </p>
                  <p className="mt-2 max-w-md text-sm text-brand-muted">{item.description}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
