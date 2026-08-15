"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";
import { petraFaqs } from "@/lib/data/petra/faqs";
import type { PetraFaq } from "@/lib/data/petra/types";

interface FaqProps {
  /** Optional CMS-sourced override — defaults to the static `petraFaqs` import. See components/sections/hero.tsx for the same pattern. */
  faqs?: PetraFaq[];
}

export function Faq({ faqs = petraFaqs }: FaqProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="border-t border-white/10 py-24 lg:py-32">
      <Container className="max-w-3xl">
        <Reveal>
          <h2 className="font-[family-name:var(--font-brand-heading)] text-[32px] leading-tight font-semibold text-white sm:text-[42px]">
            Sıkça Sorulan Sorular
          </h2>
        </Reveal>

        <div className="mt-10 divide-y divide-white/10 border-t border-white/10">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;

            return (
              <div key={faq.question}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left text-base font-medium text-white"
                  >
                    {faq.question}
                    <Icon
                      icon={ChevronDown}
                      className={cn("transition-transform duration-300", isOpen && "rotate-180")}
                    />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  className={cn(
                    "grid overflow-hidden transition-[grid-template-rows] duration-300",
                    isOpen ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]",
                  )}
                >
                  <p className="min-h-0 text-sm text-brand-muted">{faq.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
