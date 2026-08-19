import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { HvacGridPattern } from "@/components/decorative/hvac-grid-pattern";
import { ReferencesShowcase } from "@/components/sections/references/references-showcase";
import { ReferenceList } from "@/components/sections/references/reference-list";
import { petraReferences } from "@/lib/data/petra/references";

export const metadata: Metadata = {
  title: "Referanslarımız",
  description:
    "Petra Mühendislik'in kamu, sağlık, turizm, eğitim ve ticari alanlarda tamamladığı iklimlendirme projelerinden referanslar.",
  alternates: { canonical: "/referanslar" },
};

/**
 * Full References page — the cinematic showcase (every reference, same
 * `ReferencesShowcase` used on the homepage teaser) followed by the
 * complete accessible list grouped by category, ending in a sales CTA to
 * `/iletisim` ("Bir sonraki projeniz burada olabilir." — a call to
 * action, not a claim about any specific project). Every reference name
 * and its 2 real logos are the only confirmed data here; no project
 * descriptions, dates, capacities or brand-collaboration claims are
 * rendered anywhere on this page (see lib/data/petra/references.ts).
 *
 * The count in the intro paragraph reads from `references.length` (not
 * hardcoded) so a future reference batch never leaves a stale number
 * here — see PHASE_REFERANSLAR_EK_RAPOR.md for why this was worth fixing
 * (the first version had a literal "25 referans" that went stale the
 * moment 8 more were added).
 */
export default function ReferanslarPage() {
  const references = [...petraReferences].sort((a, b) => a.order - b.order);

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10 py-20 lg:py-28">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 right-[-10%] h-[420px] w-[420px] rounded-full bg-brand-primary/10 blur-[130px]" />
          <HvacGridPattern className="opacity-[0.035]" />
        </div>
        <Container className="relative">
          <Reveal>
            <span className="text-xs font-medium tracking-[0.2em] text-brand-primary uppercase">Referanslarımız</span>
            <h1 className="mt-3 max-w-2xl font-[family-name:var(--font-brand-heading)] text-[38px] leading-[1.05] font-semibold text-white sm:text-[46px] lg:text-[64px]">
              Gerçek projeler. Gerçek mühendislik.
            </h1>
            <p className="mt-5 max-w-xl text-base text-brand-muted">
              Kamu ve sağlık kurumlarından turizm, eğitim ve ticari işletmelere kadar tamamladığımız iklimlendirme
              projelerinden {references.length} referans.
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="py-20 lg:py-28">
        <Container>
          <Reveal variant="scale-in">
            <ReferencesShowcase references={references} />
          </Reveal>
        </Container>
      </section>

      <section className="border-t border-white/10 py-20 lg:py-28">
        <Container>
          <Reveal>
            <ReferenceList references={references} />
          </Reveal>
        </Container>
      </section>

      <section className="border-t border-white/10 py-24 text-center lg:py-32">
        <Container>
          <Reveal>
            <h2 className="mx-auto max-w-2xl font-[family-name:var(--font-brand-heading)] text-[32px] leading-tight font-semibold text-white sm:text-[42px] lg:text-[56px]">
              Bir sonraki projeniz burada olabilir.
            </h2>
          </Reveal>
          <Reveal index={1} className="mt-10 flex justify-center">
            <Button href="/iletisim" size="lg" showArrow>
              Keşif Talep Et
            </Button>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
