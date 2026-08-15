import Image from "next/image";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { petraCampaigns } from "@/lib/data/petra/campaigns";
import type { PetraCampaign } from "@/lib/data/petra/types";

interface CampaignsProps {
  headingLevel?: "h1" | "h2";
  /** Optional CMS-sourced override — defaults to the static `petraCampaigns` import. See components/sections/hero.tsx for the same pattern. */
  campaigns?: PetraCampaign[];
}

/**
 * Empty by design until real, customer-confirmed campaigns exist — the
 * brief's example figures (50.900 TL, 12 taksit) must never render as
 * real content. Section renders nothing at all (not even a heading) when
 * there's no active campaign, rather than an empty-looking promo block.
 */
export function Campaigns({ headingLevel = "h2", campaigns = petraCampaigns }: CampaignsProps) {
  if (campaigns.length === 0) return null;
  const Heading = headingLevel;

  return (
    <section id="kampanyalar" className="border-t border-white/10 py-24 lg:py-32">
      <Container>
        <Reveal>
          <Heading className="max-w-xl font-[family-name:var(--font-brand-heading)] text-[32px] leading-tight font-semibold text-white sm:text-[42px] lg:text-[56px]">
            Kampanyalar
          </Heading>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {campaigns.map((campaign, index) => (
            <Reveal key={campaign.id} index={index}>
              <div className="relative flex aspect-[16/10] flex-col justify-end overflow-hidden rounded-[var(--radius-brand)] border border-white/10 p-8">
                {campaign.image ? (
                  <Image src={campaign.image} alt={campaign.title} fill className="-z-10 object-cover" />
                ) : (
                  <div className="absolute inset-0 -z-10 bg-[linear-gradient(160deg,_var(--color-brand-secondary)_0%,_var(--color-brand-background)_100%)]" />
                )}
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-background via-brand-background/50 to-transparent" />
                <h3 className="text-2xl font-semibold text-white">{campaign.title}</h3>
                <p className="mt-2 text-sm text-white/70">{campaign.description}</p>
                {campaign.priceLabel ? (
                  <p className="mt-3 text-brand-primary text-sm font-semibold">{campaign.priceLabel}</p>
                ) : null}
                <Button
                  href={campaign.ctaHref}
                  variant="outline"
                  className="mt-6 w-fit text-white"
                  showArrow
                  trackEvent="campaign_view"
                  trackPayload={{ campaign: campaign.id }}
                >
                  {campaign.ctaLabel}
                </Button>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
