import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/ui/reveal";
import { ContactDetails } from "@/components/sections/contact-details";
import { DiscoveryRequestForm } from "@/components/forms/discovery-request-form";
import { petraContactInfo } from "@/lib/data/petra/site-config";
import { buildWhatsappHref } from "@/lib/data/petra/whatsapp";

export const metadata: Metadata = {
  title: "İletişim",
  description: "Petra Mühendislik ile iletişime geçin — keşif talebi oluşturun.",
  alternates: { canonical: "/iletisim" },
};

export default function ContactPage() {
  const whatsappHref = buildWhatsappHref(petraContactInfo.whatsapp);
  const hasContactDetails =
    petraContactInfo.phone ||
    whatsappHref ||
    petraContactInfo.email ||
    petraContactInfo.address ||
    petraContactInfo.serviceArea ||
    petraContactInfo.workingHours;

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
                phone={petraContactInfo.phone}
                phoneDisplay={petraContactInfo.phoneDisplay}
                whatsappHref={whatsappHref}
                email={petraContactInfo.email}
                address={petraContactInfo.address}
                serviceArea={petraContactInfo.serviceArea}
                workingHours={petraContactInfo.workingHours}
              />
            </Reveal>
          ) : null}
        </Container>
      </section>
    </>
  );
}
