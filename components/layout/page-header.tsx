import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

export function PageHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <section className="border-b border-white/10 py-20 lg:py-28">
      <Container>
        <Reveal>
          {eyebrow ? (
            <span className="text-xs font-medium tracking-[0.2em] text-brand-primary uppercase">{eyebrow}</span>
          ) : null}
          <h1 className="mt-3 max-w-2xl font-[family-name:var(--font-brand-heading)] text-[38px] leading-[1.05] font-semibold text-white sm:text-[46px] lg:text-[64px]">
            {title}
          </h1>
          {description ? <p className="mt-5 max-w-xl text-base text-brand-muted">{description}</p> : null}
        </Reveal>
      </Container>
    </section>
  );
}
