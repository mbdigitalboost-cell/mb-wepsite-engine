import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/config/env";
import { petraSolutions } from "@/lib/data/petra/solutions";

const staticRoutes = ["/", "/cozumler", "/hizmetler", "/projeler", "/kampanyalar", "/hakkimizda", "/iletisim"];

/**
 * Covers every public Petra route, including the dynamic /cozumler/[slug]
 * pages (generated from the same `petraSolutions` data the pages
 * themselves use — adding a solution automatically adds it here too).
 * Dashboard routes are intentionally excluded (see app/robots.ts).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const solutionRoutes = petraSolutions.map((solution) => `/cozumler/${solution.slug}`);

  return [...staticRoutes, ...solutionRoutes].map((path) => ({
    url: `${publicEnv.siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: path === "/" ? 1 : 0.7,
  }));
}
