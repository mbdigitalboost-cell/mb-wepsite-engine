import type { Metadata } from "next";
import { Projects } from "@/components/sections/projects";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { SiteWorksGallery } from "@/components/sections/site-works-gallery";
import { petraProjects } from "@/lib/data/petra/projects";
import { petraSiteWorksFull } from "@/lib/data/petra/site-works";
import { getProjects } from "@/lib/cms/adapters";
import { isCmsRow, mapProjectRows } from "@/lib/cms/petra/mappers";
import type { ProjectRow } from "@/lib/cms/customer-types";

const PETRA_CONNECTION_KEY = "PETRA";

export const metadata: Metadata = {
  title: "Projeler",
  description: "Petra Mühendislik tarafından tamamlanan iklimlendirme projeleri ve gerçek saha uygulamaları.",
  alternates: { canonical: "/projeler" },
};

// When published (named/CMS) projects exist, `Projects` renders its own
// heading ("Gerçek Projeler. Gerçek Çözümler.") below this page's own
// h1 — that's fine, two headings at different levels (h1 then h2) is
// standard.
//
// Faz 9.9: `Projects` still renders nothing at all when `projects` is
// empty (consistent with Statistics/Testimonials/Campaigns — see
// PHASE_9_9_RAPOR.md) — no code change needed there.
//
// Faz "Sahadaki Çalışmalarımız" revizyonu: bu sayfa artık asla tamamen
// boş kalmıyor. `petraProjects` (isimli/CMS proje kartları) hâlâ boş
// olabilir, ama kullanıcının sağladığı gerçek saha fotoğraf/video seti
// (lib/data/petra/site-works.ts) her zaman var — eski "Proje
// portföyümüz hazırlanıyor" boş durumu bu yüzden kaldırıldı: artık
// göstermek için gerçek içerik var. `Projects` (isimli projeler)
// ilerde dolduğunda bu galerinin ÜSTÜNDE ayrıca görünmeye devam eder.
export default async function ProjectsPage() {
  const projectsResult = await getProjects(PETRA_CONNECTION_KEY, petraProjects);
  const projects = isCmsRow((projectsResult as unknown[])[0])
    ? mapProjectRows(projectsResult as ProjectRow[])
    : petraProjects;

  return (
    <>
      <PageHeader
        eyebrow="Projeler"
        title="Sahadaki Çalışmalarımız"
        description="Petra Mühendislik ekibinin farklı ölçeklerde gerçekleştirdiği iklimlendirme ve mekanik sistem uygulamalarından gerçek saha görüntüleri."
      />

      {projects.length > 0 ? <Projects projects={projects} /> : null}

      <section className="py-16 lg:py-20">
        <Container>
          <SiteWorksGallery items={petraSiteWorksFull} />
        </Container>
      </section>
    </>
  );
}
