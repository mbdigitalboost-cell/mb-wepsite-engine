import { SHARED_BRANCH, SITES, type SiteDefinition } from "./registry.ts";

/**
 * Faz 38 — "bu Vercel projesi bu dalı derlemeli mi?" kararının saf mantığı.
 * scripts/vercel-should-build.mjs (Vercel → Ignored Build Step) kullanır.
 *
 * Amaç: her proje YALNIZ kendi sitesinin dallarını derlesin. Bugüne kadar
 * her push'ta bütün projeler derleme başlatıyordu (ör. bir Petra dalı,
 * mağaza ve panel projelerinde de önizleme derlemesi açıyordu).
 *
 *  - Production dalı: SITE_KEY'in `deployBranch`'i → derle.
 *  - Kendi önizleme dalları: `<siteKey>-*` → derle.
 *  - Ortak motor dalları (`faz-*`, `shared-*`): yalnız production dalı ortak
 *    dal (main) olan projelerde derle. Ayrı soydaki site (Petra) derlemez.
 *  - Başka bir sitenin dalı (`<başkaKey>-*` ya da onun production dalı) → ASLA.
 *  - Bunların dışındaki her dal → atla (dal adı kuralı: SITE_IZOLASYON.md).
 *
 * SITE_KEY yoksa/bilinmiyorsa "derle" döner: derleme scripts/check-site-env.mjs'te
 * açıklayıcı hatayla durur (sessizce atlanan bir production yayını olmasın).
 */

export interface BuildDecision {
  build: boolean;
  reason: string;
}

/** Ortak motor üzerinde çalışılan dalların ön ekleri (yalnız main'den yayınlanan projeler derler). */
export const SHARED_PREVIEW_PREFIXES: readonly string[] = ["faz-", "shared-"];

export function shouldBuild(input: { siteKey?: string | null; ref?: string | null }, sites: readonly SiteDefinition[] = SITES): BuildDecision {
  const siteKey = input.siteKey?.trim().toLowerCase();
  const ref = input.ref?.trim();
  const site = siteKey ? sites.find((candidate) => candidate.key === siteKey) : undefined;

  if (!site) return { build: true, reason: `SITE_KEY ${siteKey ? `"${siteKey}" registry'de yok` : "tanımlı değil"}; derleme check-site-env'de durur` };
  if (!ref) return { build: true, reason: "dal bilgisi yok (git dışı deploy)" };

  if (ref === site.deployBranch) return { build: true, reason: `"${ref}" ${site.key} sitesinin production dalı` };
  if (ref.startsWith(`${site.key}-`)) return { build: true, reason: `"${ref}" ${site.key} sitesinin önizleme dalı` };

  for (const other of sites) {
    if (other.key === site.key) continue;
    if (ref.startsWith(`${other.key}-`)) return { build: false, reason: `"${ref}" ${other.key} sitesinin dalı` };
    if (ref === other.deployBranch && other.deployBranch !== site.deployBranch) {
      return { build: false, reason: `"${ref}" ${other.key} sitesinin production dalı` };
    }
  }

  if (site.deployBranch === SHARED_BRANCH && SHARED_PREVIEW_PREFIXES.some((prefix) => ref.startsWith(prefix))) {
    return { build: true, reason: `"${ref}" ortak motor dalı; ${site.key} "${SHARED_BRANCH}"den yayınlanıyor` };
  }

  return { build: false, reason: `"${ref}" ${site.key} sitesinin dalı değil (derlenenler: ${site.deployBranch}, ${site.key}-*${site.deployBranch === SHARED_BRANCH ? `, ${SHARED_PREVIEW_PREFIXES.map((prefix) => `${prefix}*`).join(", ")}` : ""})` };
}
