import type { Metadata } from "next";
import { LegalHero } from "@/components/legal/legal-hero";
import { LegalDocument } from "@/components/legal/legal-document";
import { petraCerezPolitikasi } from "@/lib/data/petra/legal/cerez-politikasi";
import { petraBreadcrumbStructuredData } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Çerez Politikası",
  description: "Petra Mühendislik çerez politikası — web sitesinde kullanılabilecek çerez türleri ve tercihleri yönetme.",
  alternates: { canonical: "/cerez-politikasi" },
};

export default function CookiePolicyPage() {
  const breadcrumbJsonLd = petraBreadcrumbStructuredData([
    { name: "Ana Sayfa", path: "/" },
    { name: petraCerezPolitikasi.title, path: "/cerez-politikasi" },
  ]);

  return (
    <>
      {breadcrumbJsonLd ? <JsonLd data={breadcrumbJsonLd} /> : null}
      <LegalHero title={petraCerezPolitikasi.title} lastUpdated={petraCerezPolitikasi.lastUpdated} />
      <LegalDocument document={petraCerezPolitikasi} />
    </>
  );
}
