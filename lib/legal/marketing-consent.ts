/**
 * Faz 33 — "Aboneler" için ticari elektronik ileti izni (saf; testli).
 * Kaynak: siparişlerde verilen AYRI, opsiyonel onay (order_legal_acceptances.
 * marketing_consent). Kişiye ait EN SON kayıt karar verir (onayı sonradan
 * vermeyen bir sipariş, eski onayı geri almış sayılır). Kayıt yoksa
 * "unknown" — gönderim açısından İZİNSİZ (6563 ETK m.6: ticari ileti için
 * önceden onay gerekir).
 *
 * Sipariş/hizmet bilgilendirmesi gibi ticari olmayan mesajlar izinsiz kişiye
 * de gönderilebilir; admin bunu her gönderimde AYRICA beyan eder (denetim
 * kaydına yazılır).
 */
export interface ConsentEvidence {
  email: string | null;
  phone: string | null;
  consent: boolean;
  /** ISO zaman. */
  at: string;
}

export type MarketingConsentStatus = "granted" | "denied" | "unknown";

const email = (value: string | null | undefined) => (value && value.trim() ? value.trim().toLowerCase() : null);
function phone(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length >= 7 ? digits.slice(-10) : null;
}

export function marketingConsentStatus(contact: { email?: string | null; phone?: string | null }, evidence: readonly ConsentEvidence[]): MarketingConsentStatus {
  const targetEmail = email(contact.email);
  const targetPhone = phone(contact.phone);
  let latest: ConsentEvidence | null = null;
  for (const item of evidence) {
    const matches = (targetEmail !== null && email(item.email) === targetEmail) || (targetPhone !== null && phone(item.phone) === targetPhone);
    if (matches && (!latest || item.at > latest.at)) latest = item;
  }
  if (!latest) return "unknown";
  return latest.consent ? "granted" : "denied";
}

/** Ticari ileti yalnız izin varsa; değilse admin "ticari değil" beyan etmeli. */
export function canSendSubscriberMessage(status: MarketingConsentStatus, declaredNonCommercial: boolean): boolean {
  return status === "granted" || declaredNonCommercial;
}

export const MARKETING_CONSENT_LABELS: Record<MarketingConsentStatus, string> = {
  granted: "İleti izni var",
  denied: "İleti izni yok",
  unknown: "İleti izni yok (kayıt yok)",
};
