import type { Metadata } from "next";
import { LegalHero } from "@/components/legal/legal-hero";
import { LegalDocument } from "@/components/legal/legal-document";
import { petraGizlilikPolitikasi } from "@/lib/data/petra/legal/gizlilik-politikasi";
import { petraBreadcrumbStructuredData } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description:
    "Petra Mühendislik gizlilik politikası — web sitesi ve iletişim/hizmet talepleri kapsamında kişisel bilgilerin nasıl işlenebileceği.",
  alternates: { canonical: "/gizlilik-politikasi" },
};

export default function PrivacyPolicyPage() {
  const breadcrumbJsonLd = petraBreadcrumbStructuredData([
    { name: "Ana Sayfa", path: "/" },
    { name: petraGizlilikPolitikasi.title, path: "/gizlilik-politikasi" },
  ]);

  return (
    <>
      {breadcrumbJsonLd ? (
        // Static JSON-LD we generate ourselves — no user input reaches this.
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      ) : null}
      <LegalHero title={petraGizlilikPolitikasi.title} lastUpdated={petraGizlilikPolitikasi.lastUpdated} />
      <LegalDocument document={petraGizlilikPolitikasi} />
    </>
  );
}
