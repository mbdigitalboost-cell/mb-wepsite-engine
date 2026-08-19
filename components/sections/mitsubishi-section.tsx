import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { petraMitsubishi } from "@/lib/data/petra/mitsubishi";
import { petraMitsubishiModels } from "@/lib/data/petra/mitsubishi-models";
import { MitsubishiSlider } from "@/components/sections/mitsubishi-slider";

/**
 * "Yetkili bayi/servis" wording only ever renders when
 * `dealerStatusVerified` is true (see lib/data/petra/mitsubishi.ts) — the
 * brief is explicit that this is a claim with legal/brand-usage
 * implications and must not be made without confirmation.
 *
 * Faz 13: sağ taraftaki tek statik görsel/placeholder yerine, 6 gerçek
 * Mitsubishi Heavy model görseliyle çalışan tıklanabilir slider
 * (MitsubishiSlider, lib/data/petra/mitsubishi-models.ts) — bkz.
 * PHASE_13_RAPOR.md.
 */
export function MitsubishiSection() {
  const description = petraMitsubishi.dealerStatusVerified
    ? petraMitsubishi.verifiedDealerDescription
    : petraMitsubishi.neutralDescription;

  return (
    <section className="border-t border-white/10 bg-brand-secondary py-24 lg:py-32">
      <Container className="grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <span className="text-xs font-medium tracking-[0.2em] text-brand-primary uppercase">
            {petraMitsubishi.brandName}
          </span>
          <h2 className="mt-4 font-[family-name:var(--font-brand-heading)] text-[32px] leading-tight font-semibold text-white sm:text-[42px]">
            {petraMitsubishi.heading}
          </h2>
          <p className="mt-4 max-w-md text-sm text-brand-muted">{description}</p>
          <Button
            href={petraMitsubishi.ctaHref}
            variant="outline"
            className="mt-8 text-white"
            showArrow
            trackEvent="service_view"
            trackPayload={{ source: "mitsubishi_section" }}
          >
            {petraMitsubishi.ctaLabel}
          </Button>
        </Reveal>

        <Reveal index={1}>
          <MitsubishiSlider models={petraMitsubishiModels} brandName={petraMitsubishi.brandName} />
        </Reveal>
      </Container>
    </section>
  );
}
