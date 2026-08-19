"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { HvacGridPattern } from "@/components/decorative/hvac-grid-pattern";
import { ReferenceLogo } from "./reference-logo";
import { cn } from "@/lib/utils/cn";
import { petraReferenceCategories } from "@/lib/data/petra/references";
import type { PetraReference } from "@/lib/data/petra/references";

interface ReferenceListProps {
  references: PetraReference[];
  className?: string;
}

/**
 * The full, accessible list of every reference — thin numbered rows
 * grouped by category (eyebrow label, not a table header), never a
 * classic 3-column card grid or logo wall per the brief's explicit ban.
 * Rows are real `<button>` elements (not `<a>`): there is no real project
 * detail page to link to yet, so hover/focus is the only interaction —
 * this keeps the "clickable-ready" structure the brief asked for without
 * a fake href (see lib/data/petra/references.ts, `href` is always null).
 *
 * On `lg`+ screens a sticky side panel mirrors whichever row is currently
 * hovered/focused with a larger logo + name + abstract background (brief
 * §6, "optional side preview panel on wide screens") — never a fabricated
 * project photo. It's hidden below `lg` entirely: the brief requires
 * mobile to have no hover-dependent behavior, and every row already shows
 * its number/logo/name/category in its resting state, so nothing here is
 * ever hidden behind a hover that mobile can't reliably trigger.
 */
export function ReferenceList({ references, className }: ReferenceListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const previewReference = references.find((reference) => reference.id === activeId) ?? references[0];

  return (
    <div className={cn("grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px] lg:items-start lg:gap-16", className)}>
      <div>
        {petraReferenceCategories.map((category) => {
          const items = references.filter((reference) => reference.category === category).sort((a, b) => a.order - b.order);
          if (items.length === 0) return null;

          return (
            <div key={category} className="mb-10 last:mb-0">
              <span className="text-xs font-medium tracking-[0.2em] text-brand-primary/80 uppercase">{category}</span>
              <div className="mt-4 border-t border-white/10">
                {items.map((reference) => {
                  const number = String(reference.order).padStart(2, "0");
                  return (
                    <button
                      key={reference.id}
                      type="button"
                      onMouseEnter={() => setActiveId(reference.id)}
                      onFocus={() => setActiveId(reference.id)}
                      onMouseLeave={() => setActiveId(null)}
                      onBlur={() => setActiveId(null)}
                      className="group relative flex w-full items-center gap-4 border-b border-white/10 px-2 py-4 text-left transition-colors duration-300 hover:bg-white/[0.03] focus-visible:bg-white/[0.03] focus-visible:outline-none sm:px-3"
                    >
                      <span
                        aria-hidden="true"
                        className="w-8 shrink-0 font-[family-name:var(--font-brand-heading)] text-sm text-white/25 transition-[color,transform] duration-300 group-hover:scale-110 group-hover:text-brand-primary group-focus-visible:text-brand-primary"
                      >
                        {number}
                      </span>
                      <ReferenceLogo
                        reference={reference}
                        variant="badge"
                        className="h-10 w-10 transition-transform duration-300 group-hover:scale-105 sm:h-12 sm:w-12"
                        sizes="48px"
                      />
                      <span className="flex-1 text-sm font-medium text-white/80 transition-colors duration-300 group-hover:text-white group-focus-visible:text-white sm:text-base">
                        {reference.name}
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        size={16}
                        strokeWidth={1.75}
                        className="shrink-0 text-white/30 transition-[transform,color] duration-300 group-hover:translate-x-1.5 group-hover:text-brand-primary group-focus-visible:translate-x-1.5 group-focus-visible:text-brand-primary"
                      />
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 bg-brand-primary shadow-[0_0_10px_2px_var(--tw-shadow-color)] shadow-brand-primary/40 transition-transform duration-300 ease-[var(--motion-easing)] group-hover:scale-y-100 group-focus-visible:scale-y-100"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky top-24 hidden lg:block">
        <div className="relative overflow-hidden rounded-[var(--radius-brand)] border border-white/10 bg-white/[0.02] p-8">
          <HvacGridPattern className="opacity-[0.05]" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 right-[-10%] h-56 w-56 rounded-full bg-brand-primary/10 blur-[100px]"
          />
          <div key={previewReference.id} className="animate-reference-fade relative flex flex-col items-center text-center">
            <ReferenceLogo reference={previewReference} variant="panel" className="w-full max-w-[140px]" sizes="140px" />
            <p className="mt-5 text-xs font-medium tracking-[0.2em] text-brand-primary uppercase">
              {previewReference.category}
            </p>
            <p className="mt-2 text-base font-semibold text-white">{previewReference.name}</p>
            <p className="mt-1 text-xs text-brand-muted">Petra Mühendislik Referansı</p>
          </div>
        </div>
      </div>
    </div>
  );
}
