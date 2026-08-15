import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { petraProcessSteps } from "@/lib/data/petra/process-steps";

export function EngineeringProcess() {
  return (
    <section className="border-t border-white/10 bg-brand-secondary/40 py-24 lg:py-32">
      <Container>
        <Reveal>
          <h2 className="max-w-xl font-[family-name:var(--font-brand-heading)] text-[32px] leading-tight font-semibold text-white sm:text-[42px] lg:text-[56px]">
            Sadece Klima Değil. Baştan Sona İklimlendirme Çözümü.
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-4 lg:gap-6">
          {petraProcessSteps.map((step, index) => (
            <Reveal key={step.index} index={index} className="relative">
              <div className="flex items-start gap-4 lg:block">
                <span className="font-[family-name:var(--font-brand-heading)] text-4xl font-semibold text-brand-primary lg:mb-4 lg:block">
                  {step.index}
                </span>
                <div className="lg:border-t lg:border-white/10 lg:pt-4">
                  <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm text-brand-muted">{step.description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
