import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/ui/reveal";
import { BtuCalculator } from "@/components/btu/btu-calculator";
import { BtuGuide } from "@/components/btu/btu-guide";
import { petraStaticPageSeoDescriptions } from "@/lib/data/petra/seo-descriptions";
import { resolveStaticPageSeo, applyHomeSeoOverrides, withPetraShareImage } from "@/lib/seo/build-metadata";
import { petraBreadcrumbStructuredData } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/seo/json-ld";

const PETRA_CONNECTION_KEY = "PETRA";
const ROUTE_KEY = "btu-hesaplama";

// Petra SEO iyileştirme: başlık layout şablonuyla
// "Klima BTU Hesaplama: Kaç BTU Gerekir? | Petra Mühendislik" (57 karakter)
// olur. Sayfadaki H1 değişmedi.
const staticMetadata: Metadata = {
  title: "Klima BTU Hesaplama: Kaç BTU Gerekir?",
  description: petraStaticPageSeoDescriptions["btu-hesaplama"],
  alternates: { canonical: "/btu-hesaplama" },
};

// Faz 6F-4A-3.3: bkz. app/(public)/hakkimizda/page.tsx'in aynı satırdaki yorumu.
export async function generateMetadata(): Promise<Metadata> {
  const seo = await resolveStaticPageSeo(PETRA_CONNECTION_KEY, ROUTE_KEY);
  return withPetraShareImage(PETRA_CONNECTION_KEY, applyHomeSeoOverrides(staticMetadata, seo), `/${ROUTE_KEY}`);
}

export default function BtuCalculatorPage() {
  // Faz SEO-5: 4 legal sayfanın ve /cozumler/[slug]'ın zaten kullandığı
  // AYNI Breadcrumb JSON-LD deseni.
  const breadcrumbJsonLd = petraBreadcrumbStructuredData([
    { name: "Ana Sayfa", path: "/" },
    { name: "BTU Hesaplama", path: "/btu-hesaplama" },
  ]);

  return (
    <>
      {breadcrumbJsonLd ? <JsonLd data={breadcrumbJsonLd} /> : null}
      <PageHeader
        eyebrow="BTU Hesaplama"
        title="Yaklaşık Klima İhtiyacınızı Hesaplayın"
        description="Alan, bölge ve kullanım bilgilerinizi girin — size uygun standart klima kapasitesi hakkında ön bir fikir verelim."
      />
      <section className="py-24 lg:py-32">
        <Container>
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <BtuCalculator />
            </Reveal>
          </div>
        </Container>
      </section>
      {/*
        Petra SEO iyileştirme: hesaplayıcının ALTINDA, sunucuda render edilen
        açıklayıcı içerik (BtuGuide bir sunucu bileşeni; görünme animasyonunu
        bölüm bölüm kendi içinde yapar).
      */}
      <section className="border-t border-white/10 py-24 lg:py-32">
        <Container>
          <div className="mx-auto max-w-3xl">
            <BtuGuide />
          </div>
        </Container>
      </section>
    </>
  );
}
