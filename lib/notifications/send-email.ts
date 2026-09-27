import "server-only";
import { serverEnv } from "@/lib/config/env";

export interface SendEmailResult {
  sent: boolean;
  /** Present only when sent=false — a user-facing Turkish message, never a raw provider/network error string. */
  error?: string;
}

/**
 * GENEL, serbest-metin e-posta gönderimi — "Aboneler" sayfasının
 * "E-posta Gönder" aksiyonu için. lib/notifications/send-lead-notification.ts
 * ile AYNI Resend API deseni (o dosya değiştirilmedi, bu ayrı bir fonksiyon —
 * lead-notification "best-effort, asla hata döndürme" iken bu fonksiyon bir
 * admin'in kendi, o anki gönderim eylemi: sonucu (başarılı/başarısız)
 * ARAYANA döndürmesi gerekiyor ki admin UI'da gerçek bir geri bildirim
 * gösterilebilsin).
 *
 * RESEND_API_KEY platform genelinde paylaşımlı (lead-notification'la aynı
 * env var) — ayrı bir "Aboneler'e özel" key YOK, tek bir Resend hesabı hepsini
 * kapsıyor, tıpkı lead notification'daki gibi.
 *
 * YAPILANDIRILMAMIŞSA (RESEND_API_KEY yok): hata FIRLATMAZ — { sent: false,
 * error: "..." } döner, admin UI bunu nazik bir mesaj olarak gösterir. Bu
 * dosya bu env var'ı hiçbir deployment'ta test EDEMEDİ (bkz. bu fazın kendi
 * raporu) — gerçek bir gönderim, RESEND_API_KEY eklenene kadar doğrulanamaz.
 */
export async function sendEmail(params: { to: string; subject: string; text: string }): Promise<SendEmailResult> {
  const apiKey = serverEnv.resendApiKey;
  if (!apiKey) {
    return { sent: false, error: "E-posta sağlayıcısı henüz yapılandırılmadı (RESEND_API_KEY eksik)." };
  }

  const from = serverEnv.resendFromEmail || "onboarding@resend.dev";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        text: params.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[notifications/send-email] Resend request failed:", response.status, body);
      return { sent: false, error: "E-posta gönderilemedi, lütfen daha sonra tekrar deneyin." };
    }

    return { sent: true };
  } catch (err) {
    console.error("[notifications/send-email] unexpected error:", err);
    return { sent: false, error: "E-posta gönderilemedi, lütfen daha sonra tekrar deneyin." };
  }
}
