import "server-only";

import { getStoreBySlug } from "@/lib/commerce/public/store";
import { createSupabaseStorefrontServerClient } from "@/lib/supabase/storefront-server";
import { verifyGuestReturnToken } from "@/lib/commerce/returns/guest-token";
import { getReturnSettings, guestReturnTokenKey, loadReturnOrderContext, type ReturnOrderContext, type ReturnSettings } from "@/lib/commerce/returns/service";

/**
 * Faz 30 — vitrin talep sayfası ERİŞİM KONTROLÜ. Sipariş id'si tek başına
 * yetmez:
 *  - üye: oturumdaki mağaza müşterisi siparişin sahibi (customer_user_id),
 *  - misafir: sipariş no + telefon sorgusundan sonra verilen 2 saatlik imzalı
 *    jeton (?t=…), mağaza + sipariş ikilisine bağlı.
 * Sipariş başka mağazanınsa (store_id filtresi) bağlam hiç yüklenmez.
 */
export interface CustomerReturnAccess {
  storeId: string;
  storeName: string;
  context: ReturnOrderContext;
  settings: ReturnSettings;
  channel: "member" | "guest";
  actorUserId: string | null;
  token: string | null;
}

export async function resolveCustomerReturnAccess(storeSlug: string, orderId: string, token: string | null): Promise<CustomerReturnAccess | null> {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  const store = await getStoreBySlug(storeSlug);
  if (!store) return null;

  const context = await loadReturnOrderContext(store.id, orderId);
  if (!context) return null;

  const supabase = await createSupabaseStorefrontServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let channel: "member" | "guest" | null = null;
  if (user && context.order.customerUserId === user.id) channel = "member";
  else if (verifyGuestReturnToken(guestReturnTokenKey(), store.id, orderId, token)) channel = "guest";
  if (!channel) return null;

  return {
    storeId: store.id,
    storeName: store.name,
    context,
    settings: await getReturnSettings(store.id),
    channel,
    actorUserId: channel === "member" ? (user?.id ?? null) : null,
    token: channel === "guest" ? token : null,
  };
}
