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
 * Faz 9.9: renders nothing at all when the resolved project list is
 * empty — same rule as Statistics/Testimonials/Campaigns (all four
 * homepage sections must behave identically when their data is empty,
 * see PHASE_9_9_RAPOR.md's "Empty state tutarlılığı" section). This used
 * to render its own "yakında" box here; that's moved to
 * app/(public)/projeler/page.tsx (a page-level `EmptyState`, same
 * pattern `/kampanyalar` already used) so the homepage stays clean while
 * the dedicated /projeler page still tells a visitor something is coming.
 */
export function Projects({ headingLevel = "h2", projects = petraProjects }: ProjectsProps) {
  if (projects.length === 0) return null;
  const Heading = headingLevel;

  return (
    <section id="projeler" className="py-24 lg:py-32">
      <Container>
        <Reveal>
          <Heading className="max-w-xl font-[family-name:var(--font-brand-heading)] text-[32px] leading-tight font-semibold text-white sm:text-[42px] lg:text-[56px]">
            Gerçek Projeler. Gerçek Çözümler.
          </Heading>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <Reveal key={project.id} index={index}>
              <div className="group relative aspect-[4/5] overflow-hidden rounded-[var(--radius-brand)] border border-white/10">
                {project.image ? (
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
      </Container>
    </section>
  );
}
