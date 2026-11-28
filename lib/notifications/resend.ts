import "server-only";

import { serverEnv } from "@/lib/config/env";

/**
 * Faz 40 — e-posta sağlayıcısına (Resend) TEK giriş noktası.
 *
 * GÖNDEREN BURADA BELİRLENMEZ: `from` zorunlu parametredir ve çağıran onu
 * mağazanın kendi ayarından (lib/commerce/order-emails/settings.ts →
 * resolveSender) üretir. Bu dosyada varsayılan/yedek gönderen adresi YOKTUR.
 *
 * Anahtar ortamdan okunur ve hiçbir yere yazılmaz/loglanmaz. Hata mesajında
 * yalnız sağlayıcının durum kodu ve kısa hata adı yer alır; e-posta içeriği
 * ya da alıcı adresi loglanmaz.
 */
export interface ResendEmail {
  from: string;
  to: string[];
  replyTo?: string | null;
  subject: string;
  text: string;
  html?: string;
  idempotencyKey?: string;
}

export type ResendResult = { ok: true; messageId: string | null } | { ok: false; error: string };

const TIMEOUT_MS = 8000;

export function isEmailProviderConfigured(): boolean {
  return Boolean(serverEnv.resendApiKey);
}

export async function sendViaResend(email: ResendEmail): Promise<ResendResult> {
  const apiKey = serverEnv.resendApiKey;
  if (!apiKey) return { ok: false, error: "E-posta sağlayıcısı yapılandırılmadı." };
  if (!email.from.trim() || email.to.length === 0) return { ok: false, error: "Gönderen ya da alıcı eksik." };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(email.idempotencyKey ? { "Idempotency-Key": email.idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from: email.from,
        to: email.to,
        subject: email.subject,
        text: email.text,
        ...(email.html ? { html: email.html } : {}),
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      let name = "";
      try {
        const body = (await response.json()) as { name?: unknown };
        if (typeof body?.name === "string") name = body.name.slice(0, 80);
      } catch {
        // Gövde JSON değilse yalnız durum kodu yazılır.
      }
      return { ok: false, error: `Sağlayıcı hatası ${response.status}${name ? ` (${name})` : ""}` };
    }

    const body = (await response.json().catch(() => null)) as { id?: unknown } | null;
    return { ok: true, messageId: typeof body?.id === "string" ? body.id : null };
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return { ok: false, error: timedOut ? "Sağlayıcı zaman aşımı." : "Sağlayıcıya ulaşılamadı." };
  }
}
