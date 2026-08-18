import Image from "next/image";
import { Snowflake } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { petraMitsubishi } from "@/lib/data/petra/mitsubishi";

/**
 * "Yetkili bayi/servis" wording only ever renders when
 * `dealerStatusVerified` is true (see lib/data/petra/mitsubishi.ts) — the
 * brief is explicit that this is a claim with legal/brand-usage
 * implications and must not be made without confirmation.
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
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-brand)] border border-white/10">
            {petraMitsubishi.image ? (
              <Image
                src={petraMitsubishi.image}
                alt={petraMitsubishi.brandName}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              // Faz 13 (mobil düzeltme): önceki düz gradyan, bu bölümün
              // arka planıyla (bg-brand-secondary) neredeyse birebir
              // aynı renkte olduğu için özellikle mobilde tek başına
              // dururken "bozuk/boş kutu" gibi görünüyordu — gerçek bir
              // Mitsubishi Heavy görseli onaylanana kadar (bkz.
              // lib/data/petra/mitsubishi.ts, `image: null`) bunun yerine
              // "içerik hazırlanıyor" olduğunu açıkça belli eden, kesikli
              // çerçeveli bir yer tutucu — uydurma bir görsel değil.
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 border border-dashed border-white/15 bg-[linear-gradient(160deg,_var(--color-brand-background)_0%,_var(--color-brand-secondary)_100%)] text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-brand-background/60">
                  <Icon icon={Snowflake} size="lg" className="text-brand-primary" />
                </div>
                <p className="max-w-[220px] text-xs text-brand-muted">Görsel hazırlanıyor</p>
              </div>
            )}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
