import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/ui/reveal";
import { petraServices, petraServicesBannerImage } from "@/lib/data/petra/services";
import { getServices } from "@/lib/cms/adapters";
import { isCmsRow, mapServiceRows } from "@/lib/cms/petra/mappers";
import { resolveStaticPageSeo, applyHomeSeoOverrides } from "@/lib/seo/build-metadata";
import type { NamedContentRow } from "@/lib/cms/customer-types";

const PETRA_CONNECTION_KEY = "PETRA";
const ROUTE_KEY = "hizmetler";

// Faz 4G — güvenlik ağı: bkz. app/(public)/page.tsx'in aynı satırındaki
// yorum. Admin'deki anlık webhook birincil mekanizma; bu sadece arıza
// durumunda devreye giren bir üst sınır.
export const revalidate = 300;

const staticMetadata: Metadata = {
  title: "Hizmetler",
  description: "Satış, keşif, projelendirme, kurulum ve teknik servis — uçtan uca iklimlendirme hizmeti.",
  alternates: { canonical: "/hizmetler" },
};

// Faz 6F-4A-3.3: bkz. app/(public)/hakkimizda/page.tsx'in aynı satırdaki yorumu.
export async function generateMetadata(): Promise<Metadata> {
  const seo = await resolveStaticPageSeo(PETRA_CONNECTION_KEY, ROUTE_KEY);
  return applyHomeSeoOverrides(staticMetadata, seo);
}

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
      {/*
        Faz 9.9: decorative banner from the customer-provided visual pack —
        deliberately kept OUT of the shared PageHeader (used by 6+ other
        routes) so this page-specific addition can't affect any other page.
        `fill` + a fixed-aspect wrapper + `object-cover` keeps it crop-free
        across breakpoints (no distortion/overflow on mobile/tablet/desktop).
      */}
      {petraServicesBannerImage ? (
        <section className="pt-4">
          <Container>
            <div className="relative aspect-[16/7] w-full overflow-hidden rounded-[var(--radius-brand)] sm:aspect-[21/9]">
              <Image
                src={petraServicesBannerImage}
                alt="Petra Mühendislik teknik servis ve bakım"
                fill
                sizes="(min-width: 1024px) 1024px, 100vw"
                className="object-cover"
                priority={false}
              />
            </div>
          </Container>
        </section>
      ) : null}
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
