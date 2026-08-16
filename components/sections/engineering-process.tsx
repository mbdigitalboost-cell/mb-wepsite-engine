import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Icon } from "@/components/ui/icon";
import { petraProcessSteps } from "@/lib/data/petra/process-steps";
import { petraProcessIcons, petraProcessIconFallback } from "@/lib/data/petra/process-icons";

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
                <div className="flex items-center gap-3 lg:mb-4">
                  <span className="font-[family-name:var(--font-brand-heading)] text-4xl font-semibold text-brand-primary">
                    {step.index}
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-brand-background/60 lg:hidden">
                    <Icon
                      icon={petraProcessIcons[step.title] ?? petraProcessIconFallback}
                      size="sm"
                      className="text-brand-primary"
                    />
                  </span>
                </div>
                <div className="lg:flex lg:items-center lg:justify-between lg:gap-3 lg:border-t lg:border-white/10 lg:pt-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                    <p className="mt-2 text-sm text-brand-muted">{step.description}</p>
                  </div>
                  <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-brand-background/60 lg:flex">
                    <Icon
                      icon={petraProcessIcons[step.title] ?? petraProcessIconFallback}
                      size="sm"
                      className="text-brand-primary"
                    />
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
