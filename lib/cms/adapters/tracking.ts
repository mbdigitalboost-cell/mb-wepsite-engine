import "server-only";

import { getCustomerPublicSupabaseClient } from "@/lib/cms/connection";
import type { TrackingPublicSettingsRow } from "@/lib/cms/customer-types";

/**
 * CRITICAL: this queries the `tracking_public_settings` VIEW only —
 * `ga4_id`/`gtm_id`/`meta_pixel_id`, never the `tracking_settings` base
 * table (which has `meta_capi_token` and gets NO anon/authenticated
 * SELECT policy at all, see 0005_customer_rls.sql). This function uses
 * `getCustomerPublicSupabaseClient` (anon key, RLS-bound) — the same
 * public-safe client every other public CMS adapter uses — never the
 * service-role client. Even if this function were called with the wrong
 * intentions, the view itself has no `meta_capi_token` column to select,
 * so there is no code path here that can leak it.
 *
 * Not built on `fetchPublishedList`/`fetchPublishedSingle`
 * (lib/cms/adapters/shared.ts) because those are typed against
 * `CustomerDatabase["public"]["Tables"]` and filter by `status` — this
 * is a `Views` entry with no `status` column, so it gets its own tiny,
 * equally fail-soft implementation instead of forcing an `as any` through
 * the shared helpers.
 */
export async function getTrackingPublicSettings<T>(
  connectionKey: string,
  fallback: T,
): Promise<TrackingPublicSettingsRow | T> {
  const client = await getCustomerPublicSupabaseClient(connectionKey);
  if (!client) return fallback;

  const { data, error } = await client.from("tracking_public_settings").select("*").maybeSingle();

  if (error) {
    console.error(`[cms/adapters] tracking_public_settings query failed for connectionKey="${connectionKey}":`, error.message);
    return fallback;
  }

  if (!data) return fallback;

  return data;
}
