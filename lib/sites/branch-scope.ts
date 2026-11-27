import { ALWAYS_ALLOWED_DOC_FILES, SHARED_OWNER, normalizeRepoPath, ownerOf } from "./ownership.ts";
import { SHARED_BRANCH, SITES, type SiteDefinition } from "./registry.ts";

/**
 * Faz 38 — PUSH KORUMASININ saf mantığı (git yok; scripts/check-branch-scope.mjs
 * commit'leri okuyup buraya verir). Kurallar: SITE_IZOLASYON.md §2.2, §2.3.
 *
 *  1. Bir commit İKİ FARKLI SİTENİN dosyasına dokunamaz (ortak + tek site serbest).
 *  2. "Ayrı soy" site dalı (deployBranch'i main OLMAYAN site: bugün Petra →
 *     `petra-production` ve `petra-*`). Serbest: o sitenin dosyaları, iki kural
 *     dokümanı ve sitenin production dalında ZATEN VAR OLAN ortak dosyalar
 *     (o soy, ortak motorun kendi dondurulmuş kopyasını taşır). Reddedilir:
 *     başka sitenin (panel dahil) dosyası; production dalında olmayan YENİ
 *     ortak dosya (main'den taşınmış olabilir); ortak dalın (main) soyundan
 *     bir commit (merge/cherry-pick). (Kullanıcı kararı, 2026-11-28.)
 *  3. Diğer bütün dallar (main, faz-*, taktikalp46-* …): ayrı soy sitesinin
 *     (Petra) dosyası değişemez. Bilinçli geçiş: commit mesajında
 *     `[petra-main]` etiketi → hata yerine uyarı.
 *  4. Commit başlığı `[site]` / `[shared]` etiketiyle başlamıyorsa uyarı.
 */

export interface CommitInfo {
  sha: string;
  /** Commit mesajının ilk satırı. */
  subject: string;
  /** Mesajın tamamı (geçiş etiketi gövdede de olabilir). */
  message?: string;
  /** Değişen dosyalar (repo köküne göre). */
  files: readonly string[];
  /** Bu commit ortak dalın (main) soyunda mı? Yalnız ayrı soy dallarında anlamlı. */
  onSharedLineage?: boolean;
  /**
   * Yalnız ayrı soy dallarında: `files` içinden, sitenin production dalının
   * (ör. petra-production) uzaktaki ucunda ZATEN VAR OLAN dosyalar.
   */
  existingOnBase?: readonly string[];
}

export interface BranchScopeResult {
  errors: string[];
  warnings: string[];
}

/** deployBranch'i ortak dal olmayan siteler (kendi dalında yaşayan, main ile birleşmeyen). */
export function isolatedSites(sites: readonly SiteDefinition[] = SITES): SiteDefinition[] {
  return sites.filter((site) => site.deployBranch !== SHARED_BRANCH);
}

/** Dal bir ayrı soy sitesine mi ait? `petra-production`, `petra-seo` → petra. */
export function isolatedSiteForBranch(branch: string, sites: readonly SiteDefinition[] = SITES): SiteDefinition | null {
  return isolatedSites(sites).find((site) => branch === site.deployBranch || branch.startsWith(`${site.key}-`)) ?? null;
}

export function mainOverrideTag(siteKey: string): string {
  return `[${siteKey}-main]`;
}

export function hasScopeTag(subject: string): boolean {
  return /^\[[a-z0-9][a-z0-9-]*\]/i.test(subject.trim());
}

/** Dosya → sahip özeti (push öncesi rapor ve hata mesajları için). */
export function ownershipSummary(files: readonly string[]): Map<string, string[]> {
  const summary = new Map<string, string[]>();
  for (const file of files) {
    const normalized = normalizeRepoPath(file);
    const owner = ownerOf(normalized);
    const list = summary.get(owner);
    if (list) list.push(normalized);
    else summary.set(owner, [normalized]);
  }
  return summary;
}

function sample(files: readonly string[]): string {
  const shown = files.slice(0, 4).join(", ");
  return files.length > 4 ? `${shown} … (+${files.length - 4})` : shown;
}

export function evaluateCommit(branch: string, commit: CommitInfo, sites: readonly SiteDefinition[] = SITES): BranchScopeResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const label = `${commit.sha.slice(0, 7)} "${commit.subject}"`;
  const summary = ownershipSummary(commit.files);
  const siteOwners = [...summary.keys()].filter((owner) => owner !== SHARED_OWNER);

  // 1 — iki site aynı commit'te.
  if (siteOwners.length >= 2) {
    const parts = siteOwners.map((owner) => `${owner}: ${sample(summary.get(owner) ?? [])}`).join(" | ");
    errors.push(`${label}: bir commit iki sitenin dosyasına dokunamaz (${parts}). Commit'i siteye göre bölün.`);
  }

  const isolated = isolatedSiteForBranch(branch, sites);
  if (isolated) {
    // 2 — ayrı soy dalı: yalnız o site + kural dokümanları.
    const onBase = new Set((commit.existingOnBase ?? []).map(normalizeRepoPath));
    const otherSite: string[] = [];
    const newShared: string[] = [];
    for (const file of commit.files.map(normalizeRepoPath)) {
      const owner = ownerOf(file);
      if (owner === isolated.key || ALWAYS_ALLOWED_DOC_FILES.includes(file)) continue;
      if (owner !== SHARED_OWNER) otherSite.push(file);
      else if (!onBase.has(file)) newShared.push(file);
    }
    if (otherSite.length > 0) {
      errors.push(`${label}: "${branch}" bir ${isolated.key} dalı; başka bir sitenin dosyası değişemez. Reddedilen: ${sample(otherSite)}`);
    }
    if (newShared.length > 0) {
      errors.push(
        `${label}: "${branch}" bir ${isolated.key} dalı; "${isolated.deployBranch}" tabanında OLMAYAN ortak dosya eklenemez (${SHARED_BRANCH} dalından gelmiş olabilir). ${isolated.key} sahipli olmalı ya da tabanda zaten bulunmalı. Reddedilen: ${sample(newShared)}`,
      );
    }
    if (commit.onSharedLineage) {
      errors.push(`${label}: bu commit "${SHARED_BRANCH}" dalının soyundan; ${isolated.key} dalına ${SHARED_BRANCH} merge/rebase/cherry-pick edilmez.`);
    }
  } else {
    // 3 — ortak soydaki dallar: ayrı soy sitesinin dosyası değişemez.
    for (const site of isolatedSites(sites)) {
      const files = summary.get(site.key);
      if (!files || files.length === 0) continue;
      const tag = mainOverrideTag(site.key);
      const text = `${commit.subject}\n${commit.message ?? ""}`;
      if (text.includes(tag)) {
        warnings.push(`${label}: ${tag} etiketiyle "${branch}" dalında ${site.key} dosyası değişiyor (${sample(files)}). ${site.key} canlısı "${site.deployBranch}" dalından yayınlanır; bu değişiklik canlıya GİTMEZ.`);
      } else {
        errors.push(
          `${label}: "${branch}" dalında ${site.key} dosyası değişemez (${sample(files)}). ${site.key} işi "${site.deployBranch}"den açılan bir ${site.key}-* dalında yapılır. Bilinçli bir istisnaysa commit mesajına ${tag} yazın.`,
        );
      }
    }
  }

  // 4 — etiket.
  if (!hasScopeTag(commit.subject)) {
    const example = sites.find((site) => site.kind !== "panel")?.key ?? "site-anahtarı";
    warnings.push(`${label}: commit başlığı [site] ya da [shared] etiketiyle başlamıyor (ör. "[${example}] …", "[shared] …").`);
  }
  return { errors, warnings };
}

export function evaluatePush(branch: string, commits: readonly CommitInfo[], sites: readonly SiteDefinition[] = SITES): BranchScopeResult {
  const result: BranchScopeResult = { errors: [], warnings: [] };
  for (const commit of commits) {
    const single = evaluateCommit(branch, commit, sites);
    result.errors.push(...single.errors);
    result.warnings.push(...single.warnings);
  }
  return result;
}
