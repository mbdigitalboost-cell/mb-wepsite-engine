import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/ui/reveal";
import { ContactDetails } from "@/components/sections/contact-details";
import { DiscoveryRequestForm } from "@/components/forms/discovery-request-form";
import { petraContactInfo } from "@/lib/data/petra/site-config";
import { buildWhatsappHref } from "@/lib/data/petra/whatsapp";
import { getSiteSettings } from "@/lib/cms/adapters";
import { mapSiteSettingsContactInfo } from "@/lib/cms/petra/mappers";
import { resolveStaticPageSeo, applyHomeSeoOverrides } from "@/lib/seo/build-metadata";
import type { SiteSettingsRow } from "@/lib/cms/customer-types";

const PETRA_CONNECTION_KEY = "PETRA";
const ROUTE_KEY = "iletisim";

const staticMetadata: Metadata = {
  title: "İletişim",
  description: "Petra Mühendislik ile iletişime geçin — keşif talebi oluşturun.",
  alternates: { canonical: "/iletisim" },
};

// Faz 6F-4A-3.3: bkz. app/(public)/hakkimizda/page.tsx'in aynı satırdaki yorumu.
export async function generateMetadata(): Promise<Metadata> {
  const seo = await resolveStaticPageSeo(PETRA_CONNECTION_KEY, ROUTE_KEY);
  return applyHomeSeoOverrides(staticMetadata, seo);
}

export default async function ContactPage() {
  // Faz 6A (P1 düzeltmesi): bu sayfa daha önce statik `petraContactInfo`'yu
  // doğrudan kullanıyordu, CMS'i hiç sorgulamıyordu — bkz. hakkimizda/page.tsx'teki
  // aynı yorum. Artık layout.tsx ile aynı zincir: getSiteSettings →
  // mapSiteSettingsContactInfo. `mapUrl`'in CMS'te karşılığı yok, her zaman
  // statik kalır (mapper'ın kendi davranışı, burada değişmedi).
  const siteSettings = await getSiteSettings<SiteSettingsRow | null>(PETRA_CONNECTION_KEY, null);
  const contactInfo = siteSettings ? mapSiteSettingsContactInfo(siteSettings, petraContactInfo) : petraContactInfo;
  const whatsappHref = buildWhatsappHref(contactInfo.whatsapp);
  const hasContactDetails =
    contactInfo.phone ||
    whatsappHref ||
    contactInfo.email ||
    contactInfo.address ||
    contactInfo.serviceArea ||
    contactInfo.workingHours ||
    contactInfo.mapUrl;

  return (
    <>
      <PageHeader
        eyebrow="İletişim"
        title="İhtiyacınız İçin Doğru Çözümü Birlikte Belirleyelim"
        description="Formu doldurun, en kısa sürede sizinle iletişime geçelim."
      />
      <section className="py-24 lg:py-32">
        <Container className="grid grid-cols-1 gap-16 lg:grid-cols-2">
          <Reveal>
            <DiscoveryRequestForm />
          </Reveal>

          {hasContactDetails ? (
            <Reveal index={1}>
              <ContactDetails
                phone={contactInfo.phone}
                phoneDisplay={contactInfo.phoneDisplay}
                whatsappHref={whatsappHref}
                email={contactInfo.email}
                address={contactInfo.address}
                serviceArea={contactInfo.serviceArea}
                workingHours={contactInfo.workingHours}
                mapUrl={contactInfo.mapUrl}
              />
            </Reveal>
          ) : null}
        </Container>
      </section>
    </>
  );
}
