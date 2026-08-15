import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { petraTrustItems } from "@/lib/data/petra/trust-items";

export function TrustBar() {
  if (petraTrustItems.length === 0) return null;

  return (
    <section className="border-b border-white/10 py-10">
      <Container>
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {petraTrustItems.map((item, index) => (
            <Reveal key={item.title} index={index}>
              <h2 className="text-sm font-semibold text-white">{item.title}</h2>
              <p className="mt-1 text-xs text-brand-muted">{item.description}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
