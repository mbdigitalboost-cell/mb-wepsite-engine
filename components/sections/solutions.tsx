import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Icon } from "@/components/ui/icon";
import { petraSolutions } from "@/lib/data/petra/solutions";
import type { PetraSolution } from "@/lib/data/petra/types";

interface SolutionsProps {
  headingLevel?: "h1" | "h2";
  /** Optional CMS-sourced override — defaults to the static `petraSolutions` import. See components/sections/hero.tsx for the same pattern. */
  solutions?: PetraSolution[];
}

export function Solutions({ headingLevel = "h2", solutions = petraSolutions }: SolutionsProps) {
  const Heading = headingLevel;

  return (
    <section id="cozumler" className="py-24 lg:py-32">
      <Container>
        <Reveal>
          <Heading className="max-w-xl font-[family-name:var(--font-brand-heading)] text-[32px] leading-tight font-semibold text-white sm:text-[42px] lg:text-[56px]">
            İhtiyacınıza Uygun İklimlendirme Çözümleri
          </Heading>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {solutions.map((solution, index) => (
            <Reveal key={solution.slug} index={index}>
              <Link
                href={`/cozumler/${solution.slug}`}
                className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[var(--radius-brand)] border border-white/10"
              >
                <div className="absolute inset-0 -z-10">
                  {solution.image ? (
                    <Image
                      src={solution.image}
                      alt={solution.title}
                      fill
                      className="object-cover transition-transform duration-500 ease-[var(--motion-easing)] group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="h-full w-full bg-[linear-gradient(160deg,_var(--color-brand-secondary)_0%,_var(--color-brand-background)_100%)]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-background via-brand-background/40 to-transparent transition-opacity duration-300 group-hover:from-brand-background/95" />
                </div>

                <div className="p-6 transition-transform duration-300 ease-[var(--motion-easing)] group-hover:-translate-y-1">
                  <span className="text-xs font-medium tracking-[0.2em] text-brand-primary uppercase">
                    Çözüm
                  </span>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white">{solution.title}</h3>
                    <Icon
                      icon={ArrowUpRight}
                      className="text-white transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                    />
                  </div>
                  <p className="mt-2 text-sm text-white/70">{solution.shortDescription}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
