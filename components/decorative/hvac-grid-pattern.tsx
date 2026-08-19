import { cn } from "@/lib/utils/cn";

interface HvacGridPatternProps {
  className?: string;
}

/**
 * Purely decorative, brand-neutral technical grid — a stand-in for
 * "hafif HVAC çizgileri / grid" texture behind cards/sections (homepage
 * visual revision brief). White lines at very low opacity so it reads
 * the same regardless of which customer's brand color is active; the
 * actual visibility is tuned by the opacity Tailwind class the caller
 * passes in `className` (kept intentionally low everywhere it's used —
 * "arka plan kesinlikle dikkat çekmemeli").
 */
export function HvacGridPattern({ className }: HvacGridPatternProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.7) 0px, rgba(255,255,255,0.7) 1px, transparent 1px, transparent 32px), repeating-linear-gradient(90deg, rgba(255,255,255,0.7) 0px, rgba(255,255,255,0.7) 1px, transparent 1px, transparent 32px)",
      }}
    />
  );
}
