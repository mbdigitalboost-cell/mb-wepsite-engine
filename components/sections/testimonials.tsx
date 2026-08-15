import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { petraTestimonials } from "@/lib/data/petra/testimonials";
import type { PetraTestimonial } from "@/lib/data/petra/types";

interface TestimonialsProps {
  /** Optional CMS-sourced override — defaults to the static `petraTestimonials` import. See components/sections/hero.tsx for the same pattern. */
  testimonials?: PetraTestimonial[];
}

/**
 * Renders nothing until real reviews exist — no fabricated testimonials.
 * See lib/data/petra/testimonials.ts.
 */
export function Testimonials({ testimonials = petraTestimonials }: TestimonialsProps) {
  if (testimonials.length === 0) return null;

  return (
    <section className="border-t border-white/10 py-24 lg:py-32">
      <Container>
        <Reveal>
          <h2 className="max-w-xl font-[family-name:var(--font-brand-heading)] text-[32px] leading-tight font-semibold text-white sm:text-[42px]">
            Müşterilerimiz Ne Diyor?
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Reveal key={testimonial.id} index={index}>
              <blockquote className="rounded-[var(--radius-brand)] border border-white/10 p-6">
                <p className="text-sm text-white/80">&ldquo;{testimonial.quote}&rdquo;</p>
                <footer className="mt-4 text-xs font-medium text-brand-muted">{testimonial.author}</footer>
              </blockquote>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
