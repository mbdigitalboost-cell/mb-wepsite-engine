import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/ui/reveal";
import { petraServices } from "@/lib/data/petra/services";

export const metadata: Metadata = {
  title: "Hizmetler",
  description: "Satış, keşif, projelendirme, kurulum ve teknik servis — uçtan uca iklimlendirme hizmeti.",
  alternates: { canonical: "/hizmetler" },
};

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Hizmetler"
        title="Uçtan Uca İklimlendirme Hizmeti"
        description="Satıştan teknik servise, sürecin her aşamasında yanınızdayız."
      />
      <section className="py-24 lg:py-32">
        <Container>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {petraServices.map((service, index) => (
              <Reveal key={service.title} index={index} className="border-t border-white/10 pt-6">
                <h2 className="text-lg font-semibold text-white">{service.title}</h2>
                <p className="mt-2 text-sm text-brand-muted">{service.description}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
