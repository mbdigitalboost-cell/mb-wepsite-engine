import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/ui/reveal";
import { petraServices } from "@/lib/data/petra/services";
import { getServices } from "@/lib/cms/adapters";
import { isCmsRow, mapServiceRows } from "@/lib/cms/petra/mappers";
import type { NamedContentRow } from "@/lib/cms/customer-types";

const PETRA_CONNECTION_KEY = "PETRA";

export const metadata: Metadata = {
  title: "Hizmetler",
  description: "Satış, keşif, projelendirme, kurulum ve teknik servis — uçtan uca iklimlendirme hizmeti.",
  alternates: { canonical: "/hizmetler" },
};

// Phase 9.2: CMS-first, static petraServices as fallback — same pattern
// as app/(public)/page.tsx (Phase 6 §20). Published-only via
// fetchPublishedList (server-side filter) + customer DB RLS (defense in
// depth, see supabase/customer-template/migrations/0005_customer_rls.sql).
export default async function ServicesPage() {
  const servicesResult = await getServices(PETRA_CONNECTION_KEY, petraServices);
  const services = isCmsRow((servicesResult as unknown[])[0])
    ? mapServiceRows(servicesResult as NamedContentRow[])
    : petraServices;

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
            {services.map((service, index) => (
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
