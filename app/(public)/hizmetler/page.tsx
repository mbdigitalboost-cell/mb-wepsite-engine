import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/ui/reveal";
import { petraServices, petraServicesBannerImage } from "@/lib/data/petra/services";
import { petraServiceOfferings } from "@/lib/data/petra/service-offerings";
import { petraServiceOfferingIcons, petraServiceOfferingIconFallback } from "@/lib/data/petra/service-offering-icons";
import { getServices } from "@/lib/cms/adapters";
import { isCmsRow, mapServiceRows } from "@/lib/cms/petra/mappers";
import { resolveStaticPageSeo, applyHomeSeoOverrides } from "@/lib/seo/build-metadata";
import { petraBreadcrumbStructuredData } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/seo/json-ld";
import { Icon } from "@/components/ui/icon";
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
  // Faz SEO-5: 4 legal sayfanın ve /cozumler/[slug]'ın zaten kullandığı
  // AYNI Breadcrumb JSON-LD deseni.
  const breadcrumbJsonLd = petraBreadcrumbStructuredData([
    { name: "Ana Sayfa", path: "/" },
    { name: "Hizmetler", path: "/hizmetler" },
  ]);

  return (
    <>
      {breadcrumbJsonLd ? <JsonLd data={breadcrumbJsonLd} /> : null}
      {/* Faz SEO-A: description'a "Kahramanmaraş'ta" eklendi — meta
          description DEĞİL, sayfanın GÖRÜNÜR H1 altındaki paragrafı;
          serviceArea ("Onikişubat, Kahramanmaraş") ile tutarlı, teyitli
          bir bilgi. */}
      <PageHeader
        eyebrow="Hizmetler"
        title="Uçtan Uca İklimlendirme Hizmeti"
        description="Kahramanmaraş'ta satıştan teknik servise, sürecin her aşamasında yanınızdayız."
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
          {/* Faz SEO-A: /cozumler'e doğal internal link — hangi ürün
              kategorilerine bu hizmet sürecinin uygulandığını gösteren,
              spammy olmayan bir anchor metni. */}
          <Reveal index={services.length} className="mt-12 border-t border-white/10 pt-8">
            <p className="text-sm text-brand-muted">
              Bu süreci uyguladığımız iklimlendirme kategorilerini{" "}
              <Link href="/cozumler" className="text-brand-primary hover:text-white">
                Çözümlerimiz
              </Link>{" "}
              sayfasından inceleyebilirsiniz.
            </p>
          </Reveal>
        </Container>
      </section>

      {/*
        Faz D: müşteri tarafından doğrudan teyit edilen 5 somut hizmet
        kategorisi (lib/data/petra/service-offerings.ts) — yukarıdaki
        satış-süreci grid'inden (Satış/Keşif/Projelendirme/Kurulum/Teknik
        Servis) AYRI, tek sayfada ek bir bölüm (yeni route yok, mevcut
        /hizmetler URL'i aynı). CMS'e bağlı değil, statik — mevcut
        `WhyPetra` bölümünün ikon-daire kart dilini (border, rounded,
        hover lift) sadeleştirilmiş haliyle kullanıyor.
      */}
      <section className="border-t border-white/10 py-24 lg:py-32">
        <Container>
          <Reveal>
            <h2 className="max-w-xl font-[family-name:var(--font-brand-heading)] text-[32px] leading-tight font-semibold text-white sm:text-[42px]">
              Sunduğumuz Klima Hizmetleri
            </h2>
            <p className="mt-4 max-w-xl text-sm text-brand-muted">
              Onikişubat, Kahramanmaraş ve çevresinde, aşağıdaki hizmet kategorilerinin her birinde yanınızdayız.
            </p>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {petraServiceOfferings.map((offering, index) => (
              <Reveal key={offering.title} index={index}>
                <div className="group h-full rounded-[var(--radius-brand)] border border-white/10 bg-white/[0.03] p-6 transition-[transform,border-color] duration-300 ease-[var(--motion-easing)] hover:-translate-y-1 hover:border-brand-primary/30 sm:p-7">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-brand-background/60 transition-transform duration-300 group-hover:scale-105">
                    <Icon
                      icon={petraServiceOfferingIcons[offering.title] ?? petraServiceOfferingIconFallback}
                      size="md"
                      className="text-brand-primary"
                    />
                  </span>
                  <h3 className="mt-6 text-base font-semibold text-white">{offering.title}</h3>
                  <p className="mt-2 text-sm text-brand-muted">{offering.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
