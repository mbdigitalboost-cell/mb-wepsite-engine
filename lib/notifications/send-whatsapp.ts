import "server-only";
import { serverEnv } from "@/lib/config/env";

export interface SendWhatsappResult {
  sent: boolean;
  /** Present only when sent=false — a user-facing Turkish message, never a raw provider/network error string. */
  error?: string;
}

/**
 * Meta WhatsApp Cloud API üzerinden serbest-metin mesaj — "Aboneler"
 * sayfasının "WhatsApp'tan Mesaj At" aksiyonu için. Bu dosyanın yazıldığı
 * turda META_WHATSAPP_ACCESS_TOKEN/META_WHATSAPP_PHONE_NUMBER_ID hiçbir
 * deployment'ta ayarlı DEĞİL (Vercel MCP ile taktikalp46-store'un gerçek env
 * var listesi doğrudan kontrol edildi) — bu yüzden gerçek bir gönderim BU
 * FAZDA test edilemedi, sadece kod yazıldı. Yapılandırılmamışsa hata
 * FIRLATMAZ, { sent:false, error } döner.
 *
 * NUMARA NORMALİZASYONU — en iyi çaba, TR'ye özel bir varsayım: Meta Cloud
 * API "to" alanının ülke koduyla, başında "+" OLMADAN gelmesini bekliyor
 * (ör. "905551234567"). store_customers.phone/orders.customer_phone farklı
 * biçimlerde saklanmış olabilir ("0555...", "+90555...", "555...") — bu
 * fonksiyon sadece rakamları alıp, "0" ile başlayan 11 haneli bir TR yerel
 * numarayı ülke koduyla (90) değiştiriyor. Bu bir varsayım, kesin bir
 * doğrulama değil — gerçek bir gönderim denenmeden bunun her durumda doğru
 * çalıştığı iddia edilemez (bkz. bu fazın kendi raporu).
 */
function normalizeToE164WithoutPlus(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) {
    return `90${digits.slice(1)}`;
  }
  if (digits.startsWith("90")) return digits;
  return digits;
}

export async function sendWhatsappMessage(params: { to: string; text: string }): Promise<SendWhatsappResult> {
  const accessToken = serverEnv.metaWhatsappAccessToken;
  const phoneNumberId = serverEnv.metaWhatsappPhoneNumberId;

  if (!accessToken || !phoneNumberId) {
    return {
      sent: false,
      error: "WhatsApp sağlayıcısı henüz yapılandırılmadı (META_WHATSAPP_ACCESS_TOKEN / META_WHATSAPP_PHONE_NUMBER_ID eksik).",
    };
  }

  const to = normalizeToE164WithoutPlus(params.to);
  if (to.length < 10) {
    return { sent: false, error: "Geçerli bir telefon numarası bulunamadı." };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: params.text },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[notifications/send-whatsapp] Meta Cloud API request failed:", response.status, body);
      return { sent: false, error: "WhatsApp mesajı gönderilemedi, lütfen daha sonra tekrar deneyin." };
    }

    return { sent: true };
  } catch (err) {
    console.error("[notifications/send-whatsapp] unexpected error:", err);
    return { sent: false, error: "WhatsApp mesajı gönderilemedi, lütfen daha sonra tekrar deneyin." };
  }
}
