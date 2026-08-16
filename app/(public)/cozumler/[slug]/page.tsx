import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { petraBreadcrumbStructuredData } from "@/lib/seo/structured-data";
import { resolvePetraSolutions } from "@/lib/cms/petra/resolve-solutions";
import { petraSolutionIcons, petraSolutionIconFallback } from "@/lib/data/petra/solution-icons";

/**
 * Phase 9.2: `resolvePetraSolutions()` (lib/cms/petra/resolve-solutions.ts,
 * shared with app/sitemap.ts as of Phase 9.3) is the single resolution
 * helper used by generateStaticParams, generateMetadata, and the page
 * body below — same CMS-first/static-fallback rule as
 * app/(public)/page.tsx (Phase 6 §20). Phase 9.6 (migration 0007) added
 * `solutions.short_description`, so a CMS-sourced solution can now show
 * different text on the /cozumler list card vs this detail page — a
 * solution that hasn't had its short text filled in yet still falls
 * back to showing `description` in both places (see
 * lib/cms/petra/mappers.ts's mapSolutionRows), never a blank card.
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

      {/*
        Faz 9.9: this page had no visual element at all before (flagged as
        "too thin/bare" in PHASE_9_7_AUDIT.md §1) — a real photo when the
        solution has one, otherwise the same icon-over-gradient treatment
        used on the /cozumler cards (components/sections/solutions.tsx),
        never a fabricated photo.
      */}
      <section className="py-16 lg:py-20">
        <Container>
          <Reveal>
            <div className="relative aspect-[21/9] w-full overflow-hidden rounded-[var(--radius-brand)] border border-white/10">
              {solution.image ? (
                <Image src={solution.image} alt={solution.title} fill sizes="100vw" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(160deg,_var(--color-brand-secondary)_0%,_var(--color-brand-background)_100%)]">
                  <Icon
                    icon={petraSolutionIcons[solution.slug] ?? petraSolutionIconFallback}
                    className="h-20 w-20 text-white/10"
                    strokeWidth={1.25}
                  />
                </div>
              )}
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
