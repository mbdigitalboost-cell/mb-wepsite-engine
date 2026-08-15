import "server-only";

import { getCustomerPublicSupabaseClient } from "@/lib/cms/connection";
import type { SeoSettingsRow } from "@/lib/cms/customer-types";

/**
 * `seo_settings` has no `status` column (see migration 0003 — it's
 * config, not draft/published editorial content), so this doesn't go
 * through fetchPublishedSingle's status filter. Optional `pageId` scopes
 * to one page's SEO row; omitted (or `null`) looks up the site-wide
 * default row (`page_id IS NULL`).
 *
 * Per Phase 5 instruction §4: "Mevcut Petra SEO mimarisini bozma. CMS
 * adapter üzerinden veri gelirse onu kullan. Eksikse mevcut statik
 * fallback davranışı devam etsin. Asla sahte SEO bilgisi üretme." — this
 * never invents a title/description; a missing CMS row just falls back
 * to whatever static value the caller already had (e.g. Next's
 * `generateMetadata` defaults, lib/seo/structured-data.ts).
 */
export async function getSeo<T>(
  connectionKey: string,
  fallback: T,
  pageId: string | null = null,
): Promise<SeoSettingsRow | T> {
  const client = await getCustomerPublicSupabaseClient(connectionKey);
  if (!client) return fallback;

  let query = client.from("seo_settings").select("*").limit(1);
  query = pageId ? query.eq("page_id", pageId) : query.is("page_id", null);

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error(`[cms/adapters] seo_settings query failed for connectionKey="${connectionKey}":`, error.message);
    return fallback;
  }

  if (!data) return fallback;

  return data as SeoSettingsRow;
}
