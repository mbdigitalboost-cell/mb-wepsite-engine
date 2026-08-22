import type { Metadata } from "next";
import { LegalHero } from "@/components/legal/legal-hero";
import { LegalDocument } from "@/components/legal/legal-document";
import { petraKullanimSartlari } from "@/lib/data/petra/legal/kullanim-sartlari";
import { petraBreadcrumbStructuredData } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Kullanım Şartları",
  description: "Petra Mühendislik web sitesi kullanım şartları — sitenin kullanımına ilişkin temel koşullar.",
  alternates: { canonical: "/kullanim-sartlari" },
};

export default function TermsPage() {
  const breadcrumbJsonLd = petraBreadcrumbStructuredData([
    { name: "Ana Sayfa", path: "/" },
    { name: petraKullanimSartlari.title, path: "/kullanim-sartlari" },
  ]);

  return (
    <>
      {breadcrumbJsonLd ? <JsonLd data={breadcrumbJsonLd} /> : null}
      <LegalHero title={petraKullanimSartlari.title} lastUpdated={petraKullanimSartlari.lastUpdated} />
      <LegalDocument document={petraKullanimSartlari} />
    </>
  );
}
