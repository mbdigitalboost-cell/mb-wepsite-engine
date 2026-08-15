import "server-only";

import { fetchPublishedSingle } from "@/lib/cms/adapters/shared";
import type { HeroSectionRow } from "@/lib/cms/customer-types";

/**
 * Site-wide hero only (there is no `page_id` filter here — a page-scoped
 * hero would need its own lookup once pages actually use this). Returns
 * the caller's `fallback` untouched whenever the customer CMS isn't
 * connected, has no published hero, or the query fails — see
 * lib/cms/adapters/shared.ts for the full fallback contract.
 */
export async function getHero<T>(connectionKey: string, fallback: T): Promise<HeroSectionRow | T> {
  return fetchPublishedSingle<HeroSectionRow, T>(connectionKey, "hero_sections", fallback);
}
