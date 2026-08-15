import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { CountUp } from "@/components/ui/count-up";
import { petraStatistics } from "@/lib/data/petra/statistics";

/**
 * Renders nothing until `petraStatistics` has real, customer-confirmed
 * entries — see lib/data/petra/statistics.ts. Never shows the brief's
 * illustrative numbers (1000+, 500+, 15+, 7/24) as real content.
 */
export function Statistics() {
  if (petraStatistics.length === 0) return null;

  return (
    <section className="border-t border-white/10 bg-brand-secondary/40 py-20">
      <Container>
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {petraStatistics.map((stat, index) => (
            <Reveal key={stat.label} index={index} className="text-center">
              <p className="font-[family-name:var(--font-brand-heading)] text-4xl font-semibold text-white sm:text-5xl">
                <CountUp value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-2 text-sm text-brand-muted">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
