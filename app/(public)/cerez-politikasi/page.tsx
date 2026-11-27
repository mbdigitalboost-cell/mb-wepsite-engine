import type { Metadata } from "next";
import { LegalHero } from "@/components/legal/legal-hero";
import { LegalDocument } from "@/components/legal/legal-document";
import { petraCerezPolitikasi } from "@/lib/data/petra/legal/cerez-politikasi";
import { petraBreadcrumbStructuredData } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/seo/json-ld";
import { withPetraShareImage } from "@/lib/seo/build-metadata";

const PETRA_CONNECTION_KEY = "PETRA";

const staticMetadata: Metadata = {
  title: "Çerez Politikası",
  description: "Petra Mühendislik çerez politikası — web sitesinde kullanılabilecek çerez türleri ve tercihleri yönetme.",
  alternates: { canonical: "/cerez-politikasi" },
};

// Petra SEO iyileştirme: paylaşım görseli (CMS görseli öncelikli, yoksa
// /og/cerez-politikasi). Site geneli CMS görselini okuyabilmek için statik
// `metadata` yerine generateMetadata(); başlık/açıklama/canonical aynı.
export async function generateMetadata(): Promise<Metadata> {
  return withPetraShareImage(PETRA_CONNECTION_KEY, staticMetadata, "/cerez-politikasi");
}

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
