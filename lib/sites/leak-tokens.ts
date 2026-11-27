import { ALLOWED_EVERYWHERE, SITES, type SiteDefinition } from "./registry.ts";

/**
 * Faz 38 — "sızıntı ifadesi" eşleştirme (saf TS; scripts/*.mjs ve testler
 * Node'un tür ayıklamasıyla doğrudan çalıştırır, uygulama kodu import etmez).
 *
 * Kurallar:
 *  - Büyük/küçük harf ve Türkçe İ/I/ı farkı yok sayılır ("PETRA MÜHENDİSLİK",
 *    "Petra Mühendislik" ve "petra mühendislik" aynıdır).
 *  - İfadedeki boşluk, metinde bir ya da daha çok boşluk/satır sonu olabilir
 *    (JSX'te iki satıra bölünmüş bir ad da yakalanır).
 *  - Telefon ifadesi (yalnız rakam ve ayraçtan oluşan) son 10 haneye
 *    indirgenir ve araya boşluk, tire, nokta, parantez girmiş hâliyle de
 *    yakalanır: "0537 322 26 46", "05373222646", "+90 537 322 26 46".
 */

/** Uzunluğu KORUYAN katlama (eşleşme konumu → satır numarası hesabı bozulmasın). */
export function foldForLeakScan(text: string): string {
  return text.replace(/[İIı]/g, "i").toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isPhoneToken(token: string): boolean {
  return /^[\d\s+().-]+$/.test(token) && token.replace(/\D/g, "").length >= 10;
}

/** İfadeyi, katlanmış metinde aranacak düzenli ifadeye çevirir. */
export function leakTokenPattern(token: string): RegExp {
  if (isPhoneToken(token)) {
    const digits = token.replace(/\D/g, "").slice(-10);
    return new RegExp(digits.split("").join("[\\s().-]*"), "g");
  }
  const folded = foldForLeakScan(token.trim());
  return new RegExp(folded.split(/\s+/).map(escapeRegExp).join("\\s+"), "g");
}

export interface LeakTokenHit {
  siteKey: string;
  token: string;
  /** Metindeki konum (0 tabanlı). */
  index: number;
  /** 1 tabanlı satır numarası. */
  line: number;
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i += 1) if (text.charCodeAt(i) === 10) line += 1;
  return line;
}

const allowedEverywhere = new Set(ALLOWED_EVERYWHERE.map((token) => foldForLeakScan(token)));

/** Bir sitenin taranacak ifadeleri (ajans imzası listesindekiler hariç). */
export function scannableLeakTokens(site: SiteDefinition): string[] {
  return site.leakTokens.filter((token) => !allowedEverywhere.has(foldForLeakScan(token)));
}

/** `text` içinde, verilen sitelerin sızıntı ifadelerinin geçtiği her yer. */
export function findLeakTokens(text: string, sites: readonly SiteDefinition[]): LeakTokenHit[] {
  const folded = foldForLeakScan(text);
  const hits: LeakTokenHit[] = [];
  for (const site of sites) {
    for (const token of scannableLeakTokens(site)) {
      const pattern = leakTokenPattern(token);
      for (const match of folded.matchAll(pattern)) {
        const index = match.index ?? 0;
        hits.push({ siteKey: site.key, token, index, line: lineOf(text, index) });
      }
    }
  }
  return hits.sort((a, b) => a.index - b.index);
}

/** `ownSiteKey` dışındaki bütün siteler (null: hepsi). */
export function otherSites(ownSiteKey: string | null, sites: readonly SiteDefinition[] = SITES): SiteDefinition[] {
  return sites.filter((site) => site.key !== ownSiteKey);
}
