import "server-only";

import { notifyReturnEvent, notifyReturnEventAfterResponse } from "@/lib/commerce/order-emails/service";
import type { ReturnEmailEvent } from "@/lib/commerce/order-emails/templates";

export type { ReturnEmailEvent };

/**
 * Faz 30 — müşteriye talep e-postaları (talep alındı / onaylandı /
 * reddedildi / iade edildi).
 *
 * Faz 40 — gönderim artık sipariş e-postalarının ortak servisinden geçer:
 * gönderen mağazanın kendi e-posta ayarından gelir (ayar yoksa gönderilmez),
 * her gönderim `order_email_log`'a kaydedilir ve aynı talep için aynı tür
 * ikinci kez gönderilmez. İptal talebinin onayı siparişin "iptal edildi"
 * e-postası olarak gider. Metin ve alıcı, veritabanındaki talep ve sipariş
 * kaydından yeniden okunur (çağıran yalnız kimlikleri verir).
 *
 * Müşterinin e-postası yoksa ya da ayar yoksa SESSİZCE atlanır (kayıtta
 * "skipped" görünür) — yasal teyit ekranda zaten verilir (MSY m.11/2).
 * Hata fırlatmaz.
 */
export async function sendReturnEmail(params: { storeId: string; orderId: string; returnId: string; event: ReturnEmailEvent; refundAmount?: number }): Promise<void> {
  await notifyReturnEvent(params);
}

/**
 * Müşterinin kendi verdiği talep için: e-posta YANITTAN SONRA gönderilir
 * (talep kaydı önce yazılır; müşteri e-posta sağlayıcısını beklemez). Aynı
 * tekrar koruması ve kayıt; hata fırlatmaz, talebi etkilemez.
 */
export async function sendReturnEmailAfterResponse(params: { storeId: string; orderId: string; returnId: string; event: ReturnEmailEvent }): Promise<void> {
  await notifyReturnEventAfterResponse(params);
}
