import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { petraSolutions, getPetraSolutionBySlug } from "@/lib/data/petra/solutions";
import { petraBreadcrumbStructuredData } from "@/lib/seo/structured-data";

export function generateStaticParams() {
  return petraSolutions.map((solution) => ({ slug: solution.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const solution = getPetraSolutionBySlug(slug);
  if (!solution) return {};

  return {
    title: solution.title,
    description: solution.shortDescription,
    alternates: { canonical: `/cozumler/${solution.slug}` },
  };
}

export default async function SolutionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const solution = getPetraSolutionBySlug(slug);
  if (!solution) notFound();

  const breadcrumbJsonLd = petraBreadcrumbStructuredData([
    { name: "Ana Sayfa", path: "/" },
    { name: "Çözümler", path: "/cozumler" },
    { name: solution.title, path: `/cozumler/${solution.slug}` },
  ]);

  return (
    <>
      {breadcrumbJsonLd ? (
        // Static JSON-LD we generate ourselves — no user input reaches this.
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      ) : null}
      <section className="border-b border-white/10 py-20 lg:py-28">
        <Container>
          <Reveal>
            <span className="text-xs font-medium tracking-[0.2em] text-brand-primary uppercase">Çözüm</span>
            <h1 className="mt-3 max-w-2xl font-[family-name:var(--font-brand-heading)] text-[38px] leading-[1.05] font-semibold text-white sm:text-[46px] lg:text-[64px]">
              {solution.title}
            </h1>
            <p className="mt-5 max-w-xl text-base text-brand-muted">{solution.longDescription}</p>
            <Button
              href="/iletisim"
              size="lg"
              className="mt-8"
              showArrow
              trackEvent="generate_lead"
              trackPayload={{ source: "solution_detail", solution: solution.slug }}
            >
              Keşif Talep Et
            </Button>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
