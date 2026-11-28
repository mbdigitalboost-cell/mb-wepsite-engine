/**
 * Lead bildirimi e-postasının SAF çekirdeği (sunucu modülü
 * send-lead-notification.ts bunu ortam değerleriyle çağırır; testler
 * doğrudan bunu dener).
 *
 * KURALLAR:
 *  - YEDEK GÖNDEREN YOK. Gönderen yalnız ortamdaki RESEND_FROM_EMAIL
 *    değeridir ve OLDUĞU GİBİ kullanılır (görünen ad eklenmez, biçim
 *    değiştirilmez). Değer boşsa ya da geçerli bir gönderen değilse e-posta
 *    GÖNDERİLMEZ ve sunucu loguna "gönderen ayarı yok" yazılır.
 *  - Hiçbir yol hata fırlatmaz: lead kaydı ve form yanıtı bundan etkilenmez.
 *  - Hata yolları loga yazılır (yutulmaz), ama LOGA LEAD İÇERİĞİ YAZILMAZ:
 *    ad, telefon, e-posta, mesaj, alıcı adresi ve anahtar loglanmaz. Yalnız
 *    durum kodu ve sağlayıcının kısa hata adı/mesajı yazılır.
 */

export interface LeadNotificationInput {
  fullName: string;
  phone: string;
  email?: string | null;
  service?: string | null;
  message?: string | null;
}

export interface LeadNotificationDeps {
  apiKey: string | undefined;
  to: string | undefined;
  /** Ortamdaki RESEND_FROM_EMAIL değeri (ham). */
  fromRaw: string | undefined;
  fetch: (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;
  logError: (message: string) => void;
}

export type LeadNotificationOutcome =
  | { status: "sent" }
  | { status: "not_configured" }
  | { status: "no_sender" }
  | { status: "failed"; reason: string };

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

/**
 * Ortam değerinden göndereni çözer. Kabul edilen iki biçim: "adres@alan" ya
 * da "Ad <adres@alan>". Değer (baş/son boşluk dışında) DEĞİŞTİRİLMEDEN döner;
 * boş ya da geçersizse null.
 */
export function resolveLeadSender(raw: string | undefined | null): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (EMAIL.test(value)) return value;
  const named = /^[^<>]+<([^<>]+)>$/.exec(value);
  if (named && EMAIL.test(named[1].trim())) return value;
  return null;
}

export function buildLeadEmail(input: LeadNotificationInput): { subject: string; text: string } {
  const serviceLine = input.service ? `\nİlgilenilen hizmet: ${input.service}` : "";
  const messageLine = input.message ? `\nMesaj: ${input.message}` : "";
  return {
    subject: `Yeni keşif talebi — ${input.fullName}`,
    text: `Web sitenizden yeni bir keşif talebi geldi.\n\nAd Soyad: ${input.fullName}\nTelefon: ${input.phone}\nE-posta: ${input.email || "belirtilmedi"}${serviceLine}${messageLine}`,
  };
}

/** Sağlayıcı hata gövdesinden yalnız kısa hata adı/mesajı (en çok 200 karakter); gövdenin tamamı loglanmaz. */
function providerErrorSummary(body: string): string {
  try {
    const parsed = JSON.parse(body) as { name?: unknown; message?: unknown };
    const parts = [parsed.name, parsed.message].filter((part): part is string => typeof part === "string" && part.length > 0);
    return parts.join(": ").slice(0, 200);
  } catch {
    return "";
  }
}

export async function deliverLeadNotification(deps: LeadNotificationDeps, input: LeadNotificationInput): Promise<LeadNotificationOutcome> {
  try {
    // Anahtar ya da alıcı tanımlı değil: bildirim henüz kurulmamış (olağan durum).
    if (!deps.apiKey || !deps.to) return { status: "not_configured" };

    const from = resolveLeadSender(deps.fromRaw);
    if (!from) {
      deps.logError("[lead-notification] gönderen ayarı yok: RESEND_FROM_EMAIL boş ya da geçersiz; bildirim e-postası gönderilmedi.");
      return { status: "no_sender" };
    }

    const email = buildLeadEmail(input);
    const response = await deps.fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${deps.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [deps.to], subject: email.subject, text: email.text }),
    });
    if (response.ok) return { status: "sent" };

    let summary = "";
    try {
      summary = providerErrorSummary(await response.text());
    } catch {
      summary = "";
    }
    const reason = `HTTP ${response.status}${summary ? ` ${summary}` : ""}`;
    deps.logError(`[lead-notification] sağlayıcı isteği reddetti: ${reason}; bildirim e-postası gönderilmedi.`);
    return { status: "failed", reason };
  } catch (error) {
    // Ağ hatası vb. — yalnız hata türü yazılır (mesajda içerik olmasın diye).
    const reason = error instanceof Error ? error.name : "bilinmeyen hata";
    try {
      deps.logError(`[lead-notification] gönderim hatası: ${reason}; bildirim e-postası gönderilmedi.`);
    } catch {
      // Log da yazılamadı; form yine etkilenmez.
    }
    return { status: "failed", reason };
  }
}
