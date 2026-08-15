import Image from "next/image";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { petraProjects } from "@/lib/data/petra/projects";
import type { PetraProject } from "@/lib/data/petra/types";

interface ProjectsProps {
  headingLevel?: "h1" | "h2";
  /** Optional CMS-sourced override — defaults to the static `petraProjects` import. See components/sections/hero.tsx for the same pattern. */
  projects?: PetraProject[];
}

/**
 * Renders a controlled empty state (no fake case studies) when the
 * resolved project list is empty — true by default until the customer
 * provides real project photos. See lib/data/petra/projects.ts.
 */
export function Projects({ headingLevel = "h2", projects = petraProjects }: ProjectsProps) {
  const Heading = headingLevel;

  return (
    <section id="projeler" className="py-24 lg:py-32">
      <Container>
        <Reveal>
          <Heading className="max-w-xl font-[family-name:var(--font-brand-heading)] text-[32px] leading-tight font-semibold text-white sm:text-[42px] lg:text-[56px]">
            Gerçek Projeler. Gerçek Çözümler.
          </Heading>
        </Reveal>

        {projects.length > 0 ? (
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <Reveal key={project.id} index={index}>
                <div className="group relative aspect-[4/5] overflow-hidden rounded-[var(--radius-brand)] border border-white/10">
                  {project.image ? (
                    <Image
                      src={project.image}
                      alt={project.title}
                      fill
                      className="object-cover transition-transform duration-500 ease-[var(--motion-easing)] group-hover:scale-[1.04]"
                    />
                  ) : null}
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-brand-background via-brand-background/30 to-transparent p-6">
                    {project.category ? (
                      <span className="text-xs font-medium tracking-[0.2em] text-brand-primary uppercase">
                        {project.category}
                      </span>
                    ) : null}
                    <h3 className="mt-1 text-lg font-semibold text-white">{project.title}</h3>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal index={1}>
            <div className="mt-14 rounded-[var(--radius-brand)] border border-dashed border-white/15 p-12 text-center">
              <p className="text-sm text-brand-muted">
                Tamamlanan projelerimiz yakında burada yer alacak.
              </p>
            </div>
          </Reveal>
        )}
      </Container>
    </section>
  );
}
