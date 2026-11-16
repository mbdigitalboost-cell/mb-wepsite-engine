/**
 * Faz 33 — ÇEREZ ONAYI KAPISI (saf; tests/legal-acceptance.test.ts).
 *
 * Vitrinde bugün yalnız zorunlu çerez/depolama var (cookies.md). Analitik
 * veya pazarlama betiği (GTM/GA4/Meta Pixel) ileride eklenirse YALNIZ
 * kullanıcının o kategori için açık onayından sonra yüklenir; banner ise
 * yalnız en az bir zorunlu olmayan betik tanımlıyken görünür. Onay yoksa
 * hiçbir şey yüklenmez (varsayılan: reddedilmiş).
 */

export const CONSENT_COOKIE = "mb_cookie_consent";
/** Onayın saklama süresi (gün) — süre dolunca yeniden sorulur. */
export const CONSENT_MAX_AGE_DAYS = 180;

export type ConsentCategory = "analytics" | "marketing";

export interface ConsentState {
  analytics: boolean;
  marketing: boolean;
}

export interface TrackerDefinition {
  id: string;
  category: ConsentCategory;
  /** Dış betik adresi (https). */
  src?: string;
  /** Satır içi başlatma kodu. */
  inline?: string;
}

export function parseConsent(raw: string | null | undefined): ConsentState | null {
  if (!raw) return null;
  const match = /^v1:a([01])m([01])$/.exec(raw.trim());
  if (!match) return null;
  return { analytics: match[1] === "1", marketing: match[2] === "1" };
}

export function serializeConsent(state: ConsentState): string {
  return `v1:a${state.analytics ? 1 : 0}m${state.marketing ? 1 : 0}`;
}

export function readConsentFromCookieHeader(cookieHeader: string): ConsentState | null {
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === CONSENT_COOKIE) return parseConsent(decodeURIComponent(rest.join("=")));
  }
  return null;
}

/** Banner yalnız zorunlu olmayan bir betik tanımlıysa ve henüz karar verilmemişse. */
export function shouldShowConsentBanner(trackers: readonly TrackerDefinition[], consent: ConsentState | null): boolean {
  return trackers.length > 0 && consent === null;
}

/** Yüklenmesine izin verilen betikler (onay yoksa hiçbiri). */
export function allowedTrackers(trackers: readonly TrackerDefinition[], consent: ConsentState | null): TrackerDefinition[] {
  if (!consent) return [];
  return trackers.filter((tracker) => consent[tracker.category]);
}
