import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";
import { NO_TRACKING, type StoreTrackingSettings } from "@/lib/tracking/store-tracking";

/**
 * Faz 35 — mağazanın takip ayarı (public client; RLS: yayındaki mağaza).
 * Satır yoksa / tablo yoksa / okuma hata verirse HİÇBİR araç açık değil →
 * bant çıkmaz, betik yüklenmez (fail-closed). Her zaman store_id ile.
 */
export async function getStoreTrackingSettings(storeId: string): Promise<StoreTrackingSettings> {
  const client = createSupabasePublicClient();
  const { data, error } = await client
    .from("store_tracking_settings")
    .select("store_id, meta_pixel_id, meta_enabled, ga4_measurement_id, ga4_enabled, google_ads_id, google_ads_purchase_label, google_ads_enabled, consent_version")
    .eq("store_id", storeId)
    .maybeSingle();
  if (error || !data || data.store_id !== storeId) return NO_TRACKING;
  return {
    metaPixelId: data.meta_pixel_id,
    metaEnabled: data.meta_enabled,
    ga4MeasurementId: data.ga4_measurement_id,
    ga4Enabled: data.ga4_enabled,
    googleAdsId: data.google_ads_id,
    googleAdsPurchaseLabel: data.google_ads_purchase_label,
    googleAdsEnabled: data.google_ads_enabled,
    consentVersion: data.consent_version,
  };
}
