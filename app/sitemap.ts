import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/config/env";
import { resolvePetraSolutions } from "@/lib/cms/petra/resolve-solutions";

const staticRoutes = ["/", "/cozumler", "/hizmetler", "/projeler", "/kampanyalar", "/hakkimizda", "/iletisim"];

// Faz 12: legal/policy pages — low priority (0.3), not in changeFrequency
// "monthly" tier with the main content pages since they change rarely.
const legalRoutes = ["/gizlilik-politikasi", "/kvkk-aydinlatma-metni", "/cerez-politikasi", "/kullanim-sartlari"];

/**
 * Covers every public Petra route, including the dynamic /cozumler/[slug]
 * pages.
 *
 * Phase 9.3: now CMS-first via the same `resolvePetraSolutions()` helper
 * app/(public)/cozumler/[slug]/page.tsx uses (lib/cms/petra/resolve-
 * solutions.ts) — a solution published through the dashboard shows up
 * here automatically, no code change needed; without a CMS connection
 * (or with nothing published yet), this resolves to the exact same
 * static `petraSolutions` list as before Phase 9.3, so the sitemap is
 * unchanged for today's actual (still-draft) data.
 *
 * Dashboard routes are intentionally excluded (see app/robots.ts).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const solutions = await resolvePetraSolutions();
  const solutionRoutes = solutions.map((solution) => `/cozumler/${solution.slug}`);

  return [
    ...[...staticRoutes, ...solutionRoutes].map((path) => ({
      url: `${publicEnv.siteUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: path === "/" ? 1 : 0.7,
    })),
    ...legalRoutes.map((path) => ({
      url: `${publicEnv.siteUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
