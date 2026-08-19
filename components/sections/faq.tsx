"use client";

import { useState } from "react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionDivider } from "@/components/ui/section-divider";
import { cn } from "@/lib/utils/cn";
import { petraFaqs } from "@/lib/data/petra/faqs";
import type { PetraFaq } from "@/lib/data/petra/types";

interface FaqProps {
  /** Optional CMS-sourced override — defaults to the static `petraFaqs` import. See components/sections/hero.tsx for the same pattern. */
  faqs?: PetraFaq[];
}

/**
 * Homepage visual revision: same questions/answers, same CMS-or-static
 * `faqs` prop contract as before (app/(public)/page.tsx unchanged) —
 * only the presentation changed, from a plain divided list to numbered
 * accordion cards with a left-column eyebrow/heading, matching WhyPetra's
 * ~30/70 split for visual rhythm between the two sections.
 */
export function Faq({ faqs = petraFaqs }: FaqProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="relative border-t border-white/10 py-24 lg:py-32">
      <SectionDivider />

      <Container className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_2fr] lg:gap-16 xl:gap-20">
        <Reveal>
          <span className="text-xs font-medium tracking-[0.2em] text-brand-primary uppercase">
            Merak Ettikleriniz
          </span>
          <h2 className="mt-4 max-w-sm font-[family-name:var(--font-brand-heading)] text-[32px] leading-tight font-semibold text-white sm:text-[42px] lg:text-[44px]">
            Sıkça Sorulan Sorular
          </h2>
          <p className="mt-4 max-w-sm text-sm text-brand-muted">
            Doğru iklimlendirme çözümünü seçmeden önce en çok merak edilenler.
          </p>
        </Reveal>

        <div className="flex flex-col gap-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            const buttonId = `faq-button-${index}`;
            const number = String(index + 1).padStart(2, "0");

            return (
              <Reveal key={faq.question} index={index}>
                <div
                  className={cn(
                    "overflow-hidden rounded-[var(--radius-brand)] border bg-white/[0.03] transition-colors duration-300",
                    isOpen ? "border-brand-primary/30 bg-white/[0.05]" : "border-white/10",
                  )}
                >
                  <h3>
                    <button
                      type="button"
                      id={buttonId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                      className="flex w-full min-h-[44px] items-center gap-4 px-5 py-5 text-left sm:px-6"
                    >
                      <span
                        className={cn(
                          "font-[family-name:var(--font-brand-heading)] text-lg font-semibold transition-colors duration-300 sm:text-xl",
                          isOpen ? "text-brand-primary" : "text-white/25",
                        )}
                      >
                        {number}
                      </span>
                      <span className="flex-1 text-base font-medium text-white">{faq.question}</span>
                      {/*
                        A literal "+"/"−" toggle (per the brief's example),
                        built from two bars instead of a lucide icon: the
                        vertical bar scales to 0 on open, leaving just the
                        horizontal one — a genuine plus-to-minus morph
                        rather than a rotated glyph standing in for it.
                      */}
                      <span
                        aria-hidden="true"
                        className={cn(
                          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-[border-color,background-color] duration-300",
                          isOpen
                            ? "border-brand-primary/40 bg-brand-primary/10 text-brand-primary"
                            : "border-white/10 bg-brand-background/60 text-white/70",
                        )}
                      >
                        <span className="absolute h-3.5 w-px bg-current transition-transform duration-300 ease-[var(--motion-easing)]" style={{ transform: isOpen ? "scaleY(0)" : "scaleY(1)" }} />
                        <span className="absolute h-px w-3.5 bg-current" />
                      </span>
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className={cn(
                      "grid overflow-hidden transition-[grid-template-rows] duration-300 ease-[var(--motion-easing)]",
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <p
                        className={cn(
                          "px-5 pb-5 text-sm text-brand-muted transition-[opacity,transform] duration-300 ease-[var(--motion-easing)] sm:px-6",
                          isOpen ? "translate-y-0 opacity-100 delay-100" : "-translate-y-1 opacity-0",
                        )}
                      >
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
