import "server-only";

import { getCustomerPublicSupabaseClient } from "@/lib/cms/connection";
import type { SeoSettingsRow } from "@/lib/cms/customer-types";

/**
 * `seo_settings` has no `status` column (see migration 0003 — it's
 * config, not draft/published editorial content), so this doesn't go
 * through fetchPublishedSingle's status filter. Optional `routeKey`
 * scopes to one static page's SEO row (Faz 6F-4A-3.1's `route_key`
 * column); omitted (or `null`) looks up the site-wide default row
 * (`route_key IS NULL`).
 *
 * Faz 6F-4A-3.3 — KRİTİK DÜZELTME: bu fonksiyon önceden `page_id`'ye göre
 * filtreliyordu. `pages` tablosu hiç aktifleştirilmediği için `page_id`
 * HER satırda (hem site-wide hem her statik sayfa override'ında) her
 * zaman NULL — yani eski filtre (`page_id IS NULL`) site-wide'ı statik
 * sayfa satırlarından AYIRT EDEMİYORDU. Faz 6F-4A-3.2'nin admin ekranı
 * gerçek `route_key` dolu satırlar üretmeye başladığından beri bu,
 * `resolveSiteWideSeo()`'nun yanlış satırı döndürmesine (veya
 * `.maybeSingle()`'ın çoklu-satır hatasıyla sessizce `null`'a
 * düşmesine) yol açabilecek gerçek bir risk. `page_id IS NULL` koşulu
 * (aşağıda hâlâ var, çünkü `pages` gerçekten hiç kullanılmıyor) artık TEK
 * BAŞINA yeterli değil — asıl ayrım `route_key` üzerinden yapılıyor.
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
  routeKey: string | null = null,
): Promise<SeoSettingsRow | T> {
  const client = await getCustomerPublicSupabaseClient(connectionKey);
  if (!client) return fallback;

  let query = client.from("seo_settings").select("*").is("page_id", null).limit(1);
  query = routeKey ? query.eq("route_key", routeKey) : query.is("route_key", null);

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error(`[cms/adapters] seo_settings query failed for connectionKey="${connectionKey}":`, error.message);
    return fallback;
  }

  if (!data) return fallback;

  return data as SeoSettingsRow;
}
