import "server-only";

import { EMPTY_STOREFRONT_TEXTS, toStorefrontTexts, type StorefrontTexts } from "@/lib/commerce/storefront-texts";
import { createSupabasePublicClient } from "@/lib/supabase/public";

/**
 * Faz 39 — mağazanın vitrin metinleri (duyuru şeridi maddeleri, CTA bandı,
 * "kendi üretim" rozeti). RLS: yalnız yayında olan mağazanın satırı okunur
 * (store_storefront_texts_select_public). Satır yoksa ya da sorgu hata
 * verirse BOŞ döner: o parçalar hiç gösterilmez, uydurma varsayılan yoktur.
 */
export async function getStorefrontTexts(storeId: string): Promise<StorefrontTexts> {
  const client = createSupabasePublicClient();
  const { data, error } = await client
    .from("store_storefront_texts")
    .select("store_id, announcement_items, cta_band_title, cta_band_subtitle, own_production_title, own_production_subtitle")
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) {
    console.error("[commerce/public] getStorefrontTexts failed:", error.message);
    return EMPTY_STOREFRONT_TEXTS;
  }
  if (!data || data.store_id !== storeId) return EMPTY_STOREFRONT_TEXTS;
  return toStorefrontTexts(data);
}
