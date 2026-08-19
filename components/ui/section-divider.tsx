/**
 * Premium replacement for a plain `border-t border-white/10` between two
 * dark sections — a hairline with a centered accent dot + soft glow
 * instead of a flat line, so consecutive sections still read as
 * connected (not literally split apart) while feeling less like a raw
 * div border. Used at the top of WhyPetra and Faq (homepage visual
 * revision brief, "section between visual separator").
 */
export function SectionDivider() {
  return (
    <div aria-hidden="true" className="relative h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent">
      <span
        className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-primary shadow-[0_0_14px_3px_var(--tw-shadow-color)] shadow-brand-primary/50"
      />
    </div>
  );
}
