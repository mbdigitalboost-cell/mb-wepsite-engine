import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isEmailProviderConfigured, sendViaResend } from "@/lib/notifications/resend";
import { resolveSender, toStoreEmailSettings } from "@/lib/commerce/order-emails/settings";

export interface SendEmailResult {
  sent: boolean;
  /** Present only when sent=false — a user-facing Turkish message, never a raw provider/network error string. */
  error?: string;
}

/**
 * Bir MAĞAZA adına serbest metin e-postası — "Aboneler" sayfasının
 * "E-posta Gönder" aksiyonu için. Sonucu arayana döndürür (admin UI gerçek
 * bir geri bildirim gösterir); hata fırlatmaz.
 *
 * Faz 40 — GÖNDEREN artık ortam değişkeninden DEĞİL, mağazanın kendi
 * `store_email_settings` satırından gelir. Satır yoksa e-posta gönderilmez;
 * ortam adresine, sağlayıcının deneme adresine ya da başka bir mağazanın
 * adresine düşmek yoktur (SITE_IZOLASYON.md §2.8). `storeId` zorunludur:
 * bu fonksiyonla mağazasız e-posta gönderilemez.
 */
export async function sendEmail(params: { storeId: string; to: string; subject: string; text: string }): Promise<SendEmailResult> {
  if (!isEmailProviderConfigured()) {
    return { sent: false, error: "E-posta sağlayıcısı henüz yapılandırılmadı (RESEND_API_KEY eksik)." };
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("store_email_settings")
      .select("from_name, from_email, reply_to_email, order_notification_emails, send_order_confirmation, send_shipped, send_cancel_refund, send_store_new_order")
      .eq("store_id", params.storeId)
      .maybeSingle();
    if (error) {
      console.error("[notifications/send-email] settings read failed:", error.message);
      return { sent: false, error: "E-posta gönderilemedi, lütfen daha sonra tekrar deneyin." };
    }
    const sender = resolveSender(toStoreEmailSettings(data));
    if (!sender) {
      console.info("[notifications/send-email] e-posta ayarı yok — gönderilmedi");
      return { sent: false, error: "Bu mağazanın e-posta ayarı yok. Mağaza → Ayarlar → E-posta bölümünden gönderen adresini tanımlayın." };
    }

    const result = await sendViaResend({ from: sender.from, replyTo: sender.replyTo, to: [params.to], subject: params.subject, text: params.text });
    if (!result.ok) {
      console.error("[notifications/send-email] send failed:", result.error);
      return { sent: false, error: "E-posta gönderilemedi, lütfen daha sonra tekrar deneyin." };
    }
    return { sent: true };
  } catch (err) {
    console.error("[notifications/send-email] unexpected error:", err instanceof Error ? err.message : "unknown");
    return { sent: false, error: "E-posta gönderilemedi, lütfen daha sonra tekrar deneyin." };
  }
}
