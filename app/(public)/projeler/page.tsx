import type { Metadata } from "next";
import { Projects } from "@/components/sections/projects";

export const metadata: Metadata = {
  title: "Projeler",
  description: "Petra Mühendislik tarafından tamamlanan iklimlendirme projeleri.",
  alternates: { canonical: "/projeler" },
};

// Projects renders its own heading ("Gerçek Projeler. Gerçek Çözümler.").
// headingLevel="h1" because it's this page's single main heading.
export default function ProjectsPage() {
  return <Projects headingLevel="h1" />;
}
