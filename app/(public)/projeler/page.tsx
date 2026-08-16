import type { Metadata } from "next";
import { HardHat } from "lucide-react";
import { Projects } from "@/components/sections/projects";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { petraProjects } from "@/lib/data/petra/projects";
import { getProjects } from "@/lib/cms/adapters";
import { isCmsRow, mapProjectRows } from "@/lib/cms/petra/mappers";
import type { ProjectRow } from "@/lib/cms/customer-types";

const PETRA_CONNECTION_KEY = "PETRA";

export const metadata: Metadata = {
  title: "Projeler",
  description: "Petra Mühendislik tarafından tamamlanan iklimlendirme projeleri.",
  alternates: { canonical: "/projeler" },
};

// When published projects exist, `Projects` renders its own heading
// ("Gerçek Projeler. Gerçek Çözümler.") — headingLevel="h1" because it's
// this page's single main heading in that case.
//
// Faz 9.9: `Projects` now renders nothing at all when empty (consistent
// with Statistics/Testimonials/Campaigns — see PHASE_9_9_RAPOR.md). This
// page is the one place that still needs an h1 + some content even when
// there's nothing published yet, so it renders its own `PageHeader` +
// `EmptyState` in that case — same pattern `/kampanyalar` already used.
//
// Phase 9.2: CMS-first, static petraProjects (empty by design) as
// fallback. Phase 9.6 (migration 0007) added `projects.category`, so a
// CMS-sourced project can now show a real category badge — see
// lib/cms/petra/mappers.ts mapProjectRows.
export default async function ProjectsPage() {
  const projectsResult = await getProjects(PETRA_CONNECTION_KEY, petraProjects);
  const projects = isCmsRow((projectsResult as unknown[])[0])
    ? mapProjectRows(projectsResult as ProjectRow[])
    : petraProjects;

  if (projects.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Projeler" title="Projelerimiz" />
        <EmptyState
          icon={HardHat}
          title="Proje portföyümüz hazırlanıyor"
          description="Tamamladığımız iklimlendirme projelerini yakında burada paylaşacağız."
        />
      </>
    );
  }

  return <Projects headingLevel="h1" projects={projects} />;
}
