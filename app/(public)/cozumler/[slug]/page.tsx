import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { petraBreadcrumbStructuredData } from "@/lib/seo/structured-data";
import { resolvePetraSolutions } from "@/lib/cms/petra/resolve-solutions";

/**
 * Phase 9.2: `resolvePetraSolutions()` (lib/cms/petra/resolve-solutions.ts,
 * shared with app/sitemap.ts as of Phase 9.3) is the single resolution
 * helper used by generateStaticParams, generateMetadata, and the page
 * body below — same CMS-first/static-fallback rule as
 * app/(public)/page.tsx (Phase 6 §20). NOTE: the CMS `solutions` table
 * has one `description` column, not separate short/long fields (see
 * PHASE_9_2_RAPOR.md), so a CMS-sourced solution shows the same text in
 * both the /cozumler card and this detail page — a real but cosmetic
 * limitation, not fabricated content.
 *
 * generateStaticParams calling this means a build with real CMS access
 * (Vercel) will prerender any published solution the CMS has, including
 * ones added after this file was written — no code change needed to add
 * a 7th solution. `dynamicParams` defaults to true, so even a slug
 * missing from the build-time snapshot still resolves correctly on
 * request (this same function runs again, server-side, per request).
 */
export async function generateStaticParams() {
  const solutions = await resolvePetraSolutions();
  return solutions.map((solution) => ({ slug: solution.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const solutions = await resolvePetraSolutions();
  const solution = solutions.find((item) => item.slug === slug);
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
  const solutions = await resolvePetraSolutions();
  const solution = solutions.find((item) => item.slug === slug);
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
