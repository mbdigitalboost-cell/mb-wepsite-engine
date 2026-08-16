import type { LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Icon } from "@/components/ui/icon";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

/**
 * Faz 9.9: single shared "nothing published yet" block for dedicated
 * list pages (/projeler, /kampanyalar) — engine-neutral (no Petra-specific
 * copy baked in), so every future Website Engine customer's empty list
 * pages look the same polished way instead of each page inventing its
 * own placeholder. Deliberately NOT used on the homepage: homepage
 * sections (Statistics/Testimonials/Campaigns/Projects) all render
 * nothing at all when their data is empty — see PHASE_9_9_RAPOR.md's
 * "Empty state tutarlılığı" section for why the homepage and the
 * dedicated list pages intentionally behave differently.
 */
export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <section className="pb-24 lg:pb-32">
      <Container>
        <Reveal>
          <div className="flex flex-col items-center rounded-[var(--radius-brand)] border border-dashed border-white/15 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-brand-secondary/60">
              <Icon icon={icon} size="lg" className="text-brand-primary" />
            </div>
            <h2 className="mt-6 font-[family-name:var(--font-brand-heading)] text-lg font-semibold text-white sm:text-xl">
              {title}
            </h2>
            {description ? <p className="mt-2 max-w-sm text-sm text-brand-muted">{description}</p> : null}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
