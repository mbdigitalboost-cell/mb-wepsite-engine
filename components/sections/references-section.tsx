import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { SectionDivider } from "@/components/ui/section-divider";
import { HvacGridPattern } from "@/components/decorative/hvac-grid-pattern";
import { ReferencesShowcase } from "@/components/sections/references/references-showcase";
import { petraReferences } from "@/lib/data/petra/references";

/**
 * Homepage "Referanslarımız" teaser — a cinematic showcase of the 8
 * `featured` references (see lib/data/petra/references.ts for selection
 * criteria) plus a CTA to `/referanslar`, which holds the full 25. Not a
 * flat logo wall: reuses the same `ReferencesShowcase` cinematic
 * component built for the full page, so the homepage gets the same
 * "wow effect" premium treatment rather than a cut-down plain version.
 *
 * Scroll narrative per the revision brief: this sits right after
 * "Neden Petra?" (`app/(public)/page.tsx`), before Statistics —
 * "Neden Petra? → Referanslarımız → 25 gerçek kurum/proje → CTA".
 */
export function ReferencesSection() {
  const featuredReferences = petraReferences.filter((reference) => reference.featured).sort((a, b) => a.order - b.order);

  return (
    <section className="relative overflow-hidden border-t border-white/10 py-24 lg:py-32">
      <SectionDivider />

      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-[-8%] h-[380px] w-[380px] rounded-full bg-brand-primary/10 blur-[130px]" />
        <HvacGridPattern className="opacity-[0.03]" />
      </div>

      <Container className="relative">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium tracking-[0.2em] text-brand-primary uppercase">Referanslarımız</span>
          <h2 className="mt-4 font-[family-name:var(--font-brand-heading)] text-[32px] leading-tight font-semibold text-white sm:text-[42px] lg:text-[44px]">
            Gerçek projeler. Gerçek mühendislik.
          </h2>
          <p className="mt-4 text-sm text-brand-muted">
            Kamu, sağlık, turizm, eğitim ve ticari alanlarda tamamladığımız iklimlendirme projelerinden bir kesit.
          </p>
        </Reveal>

        <Reveal index={1} variant="scale-in" className="mt-12">
          <ReferencesShowcase references={featuredReferences} />
        </Reveal>

        <Reveal index={2} className="mt-10 flex justify-center">
          <Button href="/referanslar" variant="outline" size="lg" showArrow className="text-white">
            Tüm Referansları Gör
          </Button>
        </Reveal>
      </Container>
    </section>
  );
}
