import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";
import { NO_SHIPPING_FEE_SETTINGS, type ShippingFeeSettings } from "@/lib/commerce/shipping-fee";

/**
 * Faz 31 — mağazanın kargo ücreti ayarı. Herkese açık okuma (RLS: yayındaki
 * mağaza) — sepet, duyuru şeridi, ürün sayfası ve sipariş oluşturma aynı
 * kaynağı kullanır. Satır yoksa / okunamazsa: ücret yok, iddia yok.
 */
export async function getShippingFeeSettings(storeId: string): Promise<ShippingFeeSettings> {
  const client = createSupabasePublicClient();
  const { data, error } = await client
    .from("store_shipping_fee_settings")
    .select("shipping_fee, free_shipping_threshold, threshold_basis, cod_fee")
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) console.error("[shipping-fee] settings read failed:", error.message);
  if (!data) return NO_SHIPPING_FEE_SETTINGS;
  return {
    shippingFee: Number(data.shipping_fee),
    freeShippingThreshold: data.free_shipping_threshold === null ? null : Number(data.free_shipping_threshold),
    thresholdBasis: data.threshold_basis,
    codFee: Number(data.cod_fee),
  };
}
