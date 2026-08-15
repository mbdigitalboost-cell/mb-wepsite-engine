import "server-only";

import { petraSolutions } from "@/lib/data/petra/solutions";
import type { PetraSolution } from "@/lib/data/petra/types";
import { getSolutions } from "@/lib/cms/adapters";
import { isCmsRow, mapSolutionRows } from "@/lib/cms/petra/mappers";
import type { NamedContentRow } from "@/lib/cms/customer-types";

const PETRA_CONNECTION_KEY = "PETRA";

/**
 * Shared CMS-first/static-fallback resolution for Petra's solutions list
 * — used by app/(public)/cozumler/[slug]/page.tsx (generateStaticParams,
 * generateMetadata, and the page body all need the exact same resolved
 * list) and app/sitemap.ts (Phase 9.3: keeps the sitemap in sync with
 * whichever solutions are actually published, instead of only ever
 * listing the static six). Never fabricates a solution — CMS rows if the
 * adapter genuinely returned published data, otherwise exactly the
 * static `petraSolutions` fallback, nothing in between.
 */
export async function resolvePetraSolutions(): Promise<PetraSolution[]> {
  const solutionsResult = await getSolutions(PETRA_CONNECTION_KEY, petraSolutions);
  return isCmsRow((solutionsResult as unknown[])[0])
    ? mapSolutionRows(solutionsResult as NamedContentRow[])
    : petraSolutions;
}
