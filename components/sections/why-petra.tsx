import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { petraAdvantages } from "@/lib/data/petra/why-petra";
import { petraSiteName } from "@/lib/data/petra/site-config";

export function WhyPetra() {
  return (
    <section className="border-t border-white/10 py-24 lg:py-32">
      <Container>
        <Reveal>
          <h2 className="max-w-xl font-[family-name:var(--font-brand-heading)] text-[32px] leading-tight font-semibold text-white sm:text-[42px] lg:text-[56px]">
            Neden {petraSiteName.split(" ")[0]}?
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {petraAdvantages.map((advantage, index) => (
            <Reveal key={advantage.title} index={index} className="border-t border-white/10 pt-6">
              <h3 className="text-base font-semibold text-white">{advantage.title}</h3>
              <p className="mt-2 text-sm text-brand-muted">{advantage.description}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
