import type { Metadata } from "next";
import { LegalHero } from "@/components/legal/legal-hero";
import { LegalDocument } from "@/components/legal/legal-document";
import { petraKvkkAydinlatmaMetni } from "@/lib/data/petra/legal/kvkk-aydinlatma-metni";
import { petraBreadcrumbStructuredData } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description: "Petra Mühendislik KVKK aydınlatma metni — 6698 sayılı Kanun kapsamında kişisel verilerin işlenmesine ilişkin bilgilendirme.",
  alternates: { canonical: "/kvkk-aydinlatma-metni" },
};

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
