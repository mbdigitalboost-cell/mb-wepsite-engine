import { z } from "zod";

/**
 * PHASE 2 CRITICAL REMEDIATION (CRITICAL 1, kısım C — bkz.
 * PHASE_2_CRITICAL_REMEDIATION_PLAN.md §6) — paylaşılan, ALLOWLIST
 * tabanlı URL güvenlik doğrulaması. `lib/validation/store-navigation.ts`
 * (navigation item `url`) VE `lib/validation/homepage-section.ts`
 * (`linkUrl`, hero'nun `secondaryCtaHref`'i) TARAFINDAN paylaşılır — aynı
 * mantığın iki ayrı dosyada, birbirinden bağımsız (ve zamanla birbirinden
 * FARKLI şekilde bozulabilir) yazılmasını önlemek için tek bir yerde.
 *
 * TASARIM — BLOCKLIST DEĞİL ALLOWLIST: sadece iki şekil kabul edilir:
 *   1) site-içi göreli path — "/", "/urunler", "/kategori/x" — ve SADECE
 *      `lib/security/safe-redirect.ts`'in `resolveSafeNextPath()` ile
 *      AYNI kısıtlamaları taşır ("//" ile başlayamaz, "@"/":"/"\\"
 *      içeremez) — kanıtlanmış bir deseni yeniden kullanmak, subtly
 *      farklı bir ikinci regex'in kendi bypass'ını icat etme riskini
 *      ortadan kaldırır.
 *   2) güvenilir harici bağlantı — SADECE "https://..." (http:// KABUL
 *      EDİLMEZ — düz metin taşımayı reddetme, TLS zorunluluğu).
 * `javascript:`/`data:`/`vbscript:`/`file:`/`about:`/`blob:`/`mailto:`
 * gibi HİÇBİR şema bu iki şeklin PREFIX kuralına uymadığı için otomatik
 * olarak reddedilir — gelecekte icat edilecek, bugün blocklist'te akla
 * gelmeyecek bir şema bile aynı nedenle (ne "/" ne "https://" ile
 * başlamadığı için) reddedilir.
 *
 * Kontrol karakteri/CRLF ve encode edilmiş varyantlar (`%6a%61...`,
 * `javascript://%0Aalert(1)` gibi) AYRICA, hem ham hem `decodeURIComponent`
 * edilmiş haliyle kontrol edilir — "sadece regex'e güvenme" ilkesi gereği
 * tek bir regex yerine üç aşamalı bir kontrol zinciri (kontrol karakteri
 * → decode → prefix/karakter allowlist'i).
 */

// Unicode U+0000-U+001F (C0 kontrol bloğu, \r \n \t dahil). Kaynak dosyaya
// ham kontrol byte'ı gömmemek için String.fromCharCode ile inşa edilir.
const CONTROL_CHAR_RE = new RegExp(`[${String.fromCharCode(0)}-${String.fromCharCode(31)}]`);

const HTTPS_URL_RE = /^https:\/\/[a-zA-Z0-9.-]+(:\d+)?(\/[^\s]*)?$/;

export const UNSAFE_URL_MESSAGE =
  "Geçersiz veya güvensiz URL. Sadece '/' ile başlayan iç bağlantılara veya 'https://' ile başlayan harici bağlantılara izin verilir.";

/**
 * `raw` bu üç aşamayı GEÇERSE true döner: (1) ham veya decode edilmiş
 * haliyle hiçbir kontrol karakteri/CRLF taşımıyor, (2) decode edilebiliyor
 * (bozuk/kötü niyetli çift-encode değil), (3) ya güvenli bir göreli path
 * ya da bir https:// bağlantısı şeklinde.
 */
export function isSafeNavigationUrl(raw: string): boolean {
  const value = raw.trim();
  if (value.length === 0) return false;
  if (CONTROL_CHAR_RE.test(value)) return false;

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return false; // bozuk/kötü niyetli çift-encode -> reddet
  }
  if (CONTROL_CHAR_RE.test(decoded)) return false; // ör. "%0d%0a" -> "\r\n"

  if (value.startsWith("/")) {
    if (value.startsWith("//")) return false; // protocol-relative URL
    if (/[@:\\]/.test(value) || /[@:\\]/.test(decoded)) return false;
    return true;
  }

  if (HTTPS_URL_RE.test(value) && decoded.toLowerCase().startsWith("https://")) {
    return true;
  }

  return false;
}

/** Zorunlu URL alanı (ör. navigation item `url`) için hazır Zod şeması. */
export function safeNavigationUrlSchema(maxLength = 500) {
  return z
    .string()
    .trim()
    .min(1, "URL zorunlu.")
    .max(maxLength)
    .refine(isSafeNavigationUrl, { message: UNSAFE_URL_MESSAGE });
}

/** Opsiyonel URL alanı (ör. homepage `linkUrl`/`secondaryCtaHref`) için hazır Zod şeması — boş string her zaman geçerli. */
export function optionalSafeNavigationUrlSchema(maxLength = 500) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .refine((value) => value === "" || isSafeNavigationUrl(value), { message: UNSAFE_URL_MESSAGE })
    .optional()
    .or(z.literal(""));
}
