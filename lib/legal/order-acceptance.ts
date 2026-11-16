import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createGuestReturnToken } from "@/lib/commerce/returns/guest-token";
import { guestReturnTokenKey } from "@/lib/commerce/returns/service";
import { storeBase } from "@/lib/sites/store-href";

/**
 * Faz 33 — siparişin sözleşme kaydı (order_legal_acceptances). Tabloya
 * anon/authenticated yazamaz/okuyamaz (editor+ okur); vitrin bu kaydı
 * service-role ile, HER ZAMAN store_id + order_id ile okur ve yalnız erişim
 * kontrolünden (üye oturumu / misafir imzalı jetonu) SONRA çağrılır.
 */
export interface OrderLegalAcceptance {
  acceptedAt: string;
  preInformationVersion: number;
  distanceSalesVersion: number;
  preInformationSnapshot: string;
  distanceSalesSnapshot: string;
  marketingConsent: boolean;
  marketingConsentText: string | null;
}

export async function getOrderLegalAcceptance(storeId: string, orderId: string): Promise<OrderLegalAcceptance | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("order_legal_acceptances")
    .select(
      "store_id, order_id, accepted_at, pre_information_version, distance_sales_version, pre_information_snapshot, distance_sales_snapshot, marketing_consent, marketing_consent_text",
    )
    .eq("store_id", storeId)
    .eq("order_id", orderId)
    .maybeSingle();
  if (error || !data || data.store_id !== storeId) return null;
  return {
    acceptedAt: data.accepted_at,
    preInformationVersion: data.pre_information_version,
    distanceSalesVersion: data.distance_sales_version,
    preInformationSnapshot: data.pre_information_snapshot,
    distanceSalesSnapshot: data.distance_sales_snapshot,
    marketingConsent: data.marketing_consent,
    marketingConsentText: data.marketing_consent_text,
  };
}

/**
 * "Sözleşmeyi görüntüle" bağlantısı. Üye: oturum yeterli. Misafir: Faz 30'un
 * 2 saatlik imzalı jetonu (mağaza + sipariş). Sonra "Siparişlerim"den
 * sipariş no + telefonla yeniden açılabilir.
 */
export function orderContractHref(storeSlug: string, storeId: string, orderId: string, isMember: boolean): string {
  const base = `${storeBase(storeSlug)}/siparislerim/${orderId}/sozlesme`;
  if (isMember) return base;
  const key = guestReturnTokenKey();
  return key ? `${base}?t=${encodeURIComponent(createGuestReturnToken(key, storeId, orderId))}` : base;
}
