import type { Metadata } from "next";
import { LegalHero } from "@/components/legal/legal-hero";
import { LegalDocument } from "@/components/legal/legal-document";
import { petraKullanimSartlari } from "@/lib/data/petra/legal/kullanim-sartlari";
import { petraBreadcrumbStructuredData } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/seo/json-ld";
import { withPetraShareImage } from "@/lib/seo/build-metadata";

const PETRA_CONNECTION_KEY = "PETRA";

const staticMetadata: Metadata = {
  title: "Kullanım Şartları",
  description: "Petra Mühendislik web sitesi kullanım şartları — sitenin kullanımına ilişkin temel koşullar.",
  alternates: { canonical: "/kullanim-sartlari" },
};

// Petra SEO iyileştirme: paylaşım görseli (CMS görseli öncelikli, yoksa
// /og/kullanim-sartlari). Site geneli CMS görselini okuyabilmek için statik
// `metadata` yerine generateMetadata(); başlık/açıklama/canonical aynı.
export async function generateMetadata(): Promise<Metadata> {
  return withPetraShareImage(PETRA_CONNECTION_KEY, staticMetadata, "/kullanim-sartlari");
}

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
