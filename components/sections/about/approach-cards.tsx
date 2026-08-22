import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Icon } from "@/components/ui/icon";
import { SectionDivider } from "@/components/ui/section-divider";
import { HvacGridPattern } from "@/components/decorative/hvac-grid-pattern";
import { petraApproachSteps, petraApproachIntro } from "@/lib/data/petra/about";
import { petraApproachIcons, petraApproachIconFallback } from "@/lib/data/petra/approach-icons";

/**
 * "Mühendislik Yaklaşımımız" — Hakkımızda sayfasına özel 4 kart bölümü.
 * `WhyPetra`'nın (lib/data/petra/why-petra.ts + components/sections/
 * why-petra.tsx) Faz "Homepage Visual Revision"te kurduğu kart dilini
 * (numara + ikon + hover lift + kırmızı accent + teknik grid) birebir
 * tekrar kullanıyor, ama kendi verisiyle (lib/data/petra/about.ts,
 * petraApproachSteps) — WhyPetra'nın kendisine hiç dokunulmadı.
 */
export function ApproachCards() {
  return (
    <section className="relative overflow-hidden border-b border-white/10 py-20 lg:py-28">
      <SectionDivider />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 right-[-10%] h-[380px] w-[380px] rounded-full bg-brand-primary/10 blur-[130px]" />
        <HvacGridPattern className="opacity-[0.03]" />
      </div>

      <Container className="relative">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-[family-name:var(--font-brand-heading)] text-[28px] leading-tight font-semibold text-white sm:text-[36px] lg:text-[40px]">
            {petraApproachIntro.heading}
          </h2>
          <p className="mt-4 text-sm text-brand-muted sm:text-base">{petraApproachIntro.description}</p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {petraApproachSteps.map((step, index) => (
            <Reveal key={step.title} index={index}>
              <div className="group relative h-full overflow-hidden rounded-[var(--radius-brand)] border border-white/10 bg-white/[0.03] p-6 transition-[transform,border-color,box-shadow] duration-300 ease-[var(--motion-easing)] hover:-translate-y-1 hover:border-brand-primary/30 hover:shadow-[0_20px_45px_-24px_var(--tw-shadow-color)] hover:shadow-black/70">
                <HvacGridPattern className="opacity-[0.05]" />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-brand-primary/0 transition-colors duration-500 group-hover:bg-brand-primary/[0.04]"
                />

                <div className="relative flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-brand-background/60 transition-transform duration-300 group-hover:scale-105">
                    <Icon
                      icon={petraApproachIcons[step.title] ?? petraApproachIconFallback}
                      size="md"
                      className="text-brand-primary"
                    />
                  </span>
                  <span
                    aria-hidden="true"
                    className="font-[family-name:var(--font-brand-heading)] text-4xl leading-none font-semibold text-white/10 select-none"
                  >
                    {step.index}
                  </span>
                </div>

                <h3 className="relative mt-6 text-base font-semibold text-white">{step.title}</h3>
                <p className="relative mt-2 text-sm text-brand-muted">{step.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
