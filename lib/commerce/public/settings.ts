import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";

export interface PublicStoreSettings {
  currency: string;
  locale: string;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
}

/**
 * PHASE 2 public read model — reads `store_public_settings` (the VIEW),
 * NEVER `store_settings` directly (that table has no anon SELECT policy
 * at all — see migration 0009's comment). This is deliberate: the view is
 * the only public-safe projection (currency/locale/maintenance only,
 * never customer_settings/order_settings/general_preferences).
 */
export async function getPublicStoreSettings(storeId: string): Promise<PublicStoreSettings | null> {
  const client = createSupabasePublicClient();

  const { data, error } = await client
    .from("store_public_settings")
    .select("currency, locale, maintenance_mode, maintenance_message")
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) {
    console.error("[commerce/public] getPublicStoreSettings failed:", error.message);
    return null;
  }

  if (!data) return null;

  return {
    currency: data.currency,
    locale: data.locale,
    maintenanceMode: data.maintenance_mode,
    maintenanceMessage: data.maintenance_message,
  };
}
