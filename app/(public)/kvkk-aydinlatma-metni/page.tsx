import type { Metadata } from "next";
import { LegalHero } from "@/components/legal/legal-hero";
import { LegalDocument } from "@/components/legal/legal-document";
import { petraKvkkAydinlatmaMetni } from "@/lib/data/petra/legal/kvkk-aydinlatma-metni";
import { petraBreadcrumbStructuredData } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/seo/json-ld";
import { withPetraShareImage } from "@/lib/seo/build-metadata";

const PETRA_CONNECTION_KEY = "PETRA";

const staticMetadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description: "Petra Mühendislik KVKK aydınlatma metni — 6698 sayılı Kanun kapsamında kişisel verilerin işlenmesine ilişkin bilgilendirme.",
  alternates: { canonical: "/kvkk-aydinlatma-metni" },
};

// Petra SEO iyileştirme: paylaşım görseli (CMS görseli öncelikli, yoksa
// /og/kvkk-aydinlatma-metni). Site geneli CMS görselini okuyabilmek için statik
// `metadata` yerine generateMetadata(); başlık/açıklama/canonical aynı.
export async function generateMetadata(): Promise<Metadata> {
  return withPetraShareImage(PETRA_CONNECTION_KEY, staticMetadata, "/kvkk-aydinlatma-metni");
}

export default function KvkkPage() {
  const breadcrumbJsonLd = petraBreadcrumbStructuredData([
    { name: "Ana Sayfa", path: "/" },
    { name: petraKvkkAydinlatmaMetni.title, path: "/kvkk-aydinlatma-metni" },
  ]);

  return (
    <>
      {breadcrumbJsonLd ? <JsonLd data={breadcrumbJsonLd} /> : null}
      <LegalHero title={petraKvkkAydinlatmaMetni.title} lastUpdated={petraKvkkAydinlatmaMetni.lastUpdated} />
      <LegalDocument document={petraKvkkAydinlatmaMetni} />
    </>
  );
}
