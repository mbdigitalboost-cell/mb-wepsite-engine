import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { petraFinalCta } from "@/lib/data/petra/final-cta";

export function FinalCta({ whatsappHref }: { whatsappHref: string | null }) {
  return (
    <section className="border-t border-white/10 py-24 text-center lg:py-32">
      <Container>
        <Reveal>
          <h2 className="mx-auto max-w-2xl font-[family-name:var(--font-brand-heading)] text-[32px] leading-tight font-semibold text-white sm:text-[42px] lg:text-[56px]">
            {petraFinalCta.headingLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h2>
        </Reveal>

        <Reveal index={1}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              href={petraFinalCta.ctaPrimaryHref}
              size="lg"
              showArrow
              trackEvent="generate_lead"
              trackPayload={{ source: "final_cta" }}
            >
              {petraFinalCta.ctaPrimaryLabel}
            </Button>
            {whatsappHref ? (
              <Button
                href={whatsappHref}
                external
                variant="outline"
                size="lg"
                className="text-white"
                trackEvent="whatsapp_click"
                trackPayload={{ source: "final_cta" }}
              >
                {petraFinalCta.ctaSecondaryLabel}
              </Button>
            ) : null}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
