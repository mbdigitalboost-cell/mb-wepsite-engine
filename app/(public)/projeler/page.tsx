import type { Metadata } from "next";
import { Projects } from "@/components/sections/projects";
import { petraProjects } from "@/lib/data/petra/projects";
import { getProjects } from "@/lib/cms/adapters";
import { isCmsRow, mapProjectRows } from "@/lib/cms/petra/mappers";
import type { NamedContentRow } from "@/lib/cms/customer-types";

const PETRA_CONNECTION_KEY = "PETRA";

export const metadata: Metadata = {
  title: "Projeler",
  description: "Petra Mühendislik tarafından tamamlanan iklimlendirme projeleri.",
  alternates: { canonical: "/projeler" },
};

// Projects renders its own heading ("Gerçek Projeler. Gerçek Çözümler.").
// headingLevel="h1" because it's this page's single main heading.
//
// Phase 9.2: CMS-first, static petraProjects (empty by design) as
// fallback. The customer-template `projects` table has no `category`
// column, so CMS-sourced projects always render with category=null (no
// fabricated label) — see lib/cms/petra/mappers.ts mapProjectRows.
export default async function ProjectsPage() {
  const projectsResult = await getProjects(PETRA_CONNECTION_KEY, petraProjects);
  const projects = isCmsRow((projectsResult as unknown[])[0])
    ? mapProjectRows(projectsResult as NamedContentRow[])
    : petraProjects;

  return <Projects headingLevel="h1" projects={projects} />;
}
