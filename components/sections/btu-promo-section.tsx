import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { petraBtuPromo } from "@/lib/data/petra/btu-promo";

export function BtuPromoSection() {
  return (
    <section className="border-t border-white/10 py-24 text-center lg:py-32">
      <Container>
        <Reveal>
          <h2 className="mx-auto max-w-2xl font-[family-name:var(--font-brand-heading)] text-[32px] leading-tight font-semibold text-white sm:text-[42px] lg:text-[56px]">
            {petraBtuPromo.heading}
          </h2>
        </Reveal>

        <Reveal index={1}>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/70">{petraBtuPromo.description}</p>
        </Reveal>

        <Reveal index={2}>
          <div className="mt-10 flex justify-center">
            <Button href={petraBtuPromo.ctaHref} size="lg" showArrow>
              {petraBtuPromo.ctaLabel}
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
