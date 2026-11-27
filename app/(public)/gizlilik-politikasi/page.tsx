import type { Metadata } from "next";
import { LegalHero } from "@/components/legal/legal-hero";
import { LegalDocument } from "@/components/legal/legal-document";
import { petraGizlilikPolitikasi } from "@/lib/data/petra/legal/gizlilik-politikasi";
import { petraBreadcrumbStructuredData } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/seo/json-ld";
import { withPetraShareImage } from "@/lib/seo/build-metadata";

const PETRA_CONNECTION_KEY = "PETRA";

const staticMetadata: Metadata = {
  title: "Gizlilik Politikası",
  description:
    "Petra Mühendislik gizlilik politikası — web sitesi ve iletişim/hizmet talepleri kapsamında kişisel bilgilerin nasıl işlenebileceği.",
  alternates: { canonical: "/gizlilik-politikasi" },
};

// Petra SEO iyileştirme: paylaşım görseli (CMS görseli öncelikli, yoksa
// /og/gizlilik-politikasi). Site geneli CMS görselini okuyabilmek için statik
// `metadata` yerine generateMetadata(); başlık/açıklama/canonical aynı.
export async function generateMetadata(): Promise<Metadata> {
  return withPetraShareImage(PETRA_CONNECTION_KEY, staticMetadata, "/gizlilik-politikasi");
}

export default function PrivacyPolicyPage() {
  const breadcrumbJsonLd = petraBreadcrumbStructuredData([
    { name: "Ana Sayfa", path: "/" },
    { name: petraGizlilikPolitikasi.title, path: "/gizlilik-politikasi" },
  ]);

  return (
    <>
      {breadcrumbJsonLd ? <JsonLd data={breadcrumbJsonLd} /> : null}
      <LegalHero title={petraGizlilikPolitikasi.title} lastUpdated={petraGizlilikPolitikasi.lastUpdated} />
      <LegalDocument document={petraGizlilikPolitikasi} />
    </>
  );
}
