import { findLeakTokens } from "./leak-tokens.ts";
import { SHARED_OWNER, normalizeRepoPath, ownerOf } from "./ownership.ts";
import { SITES, type SiteDefinition } from "./registry.ts";

/**
 * Faz 38 — STATİK İZOLASYON DENETİMİNİN saf mantığı (dosya sistemi yok;
 * scripts/check-isolation.mjs dosyaları okuyup buraya verir, testler sahte
 * dosyalarla aynı fonksiyonları çağırır). Kurallar: SITE_IZOLASYON.md §2–§3.
 *
 *  (a) "token"  — bir siteye ait dosyada BAŞKA bir sitenin sızıntı ifadesi
 *                 (ad, alan adı, telefon, e-posta) geçemez.
 *  (b) "import" — bir dosya, kendi sahibi olmayan bir SİTEnin dosyasını
 *                 import edemez (site → başka site; ortak motor → site).
 *                 Site → ortak motor serbesttir.
 *  (c) "token"  — ortak ("shared") dosyada HİÇBİR sitenin ifadesi geçemez:
 *                 ortak motor site adını, alan adını, telefonunu sabit kodlamaz.
 *
 * Panel bütün müşterileri listelediği için panelin kendi dosyalarında marka
 * taraması yapılmaz ((a) uygulanmaz); import kuralı (b) panele de uygulanır.
 *
 * Yorum satırları taranmaz (betik, taramadan önce yorumları boşlukla
 * değiştirir): yorum hiçbir sitenin çıktısına girmez. Dosya YOLU taranır.
 */

export type IsolationRule = "token" | "import";

export interface IsolationViolation {
  rule: IsolationRule;
  file: string;
  /** "token": ihlal eden ifade. "import": import edilen dosyanın yolu. */
  match: string;
  /** 1 tabanlı satır; 0 = dosya yolunun kendisi. */
  line: number;
  detail: string;
}

/** İfade taramasından muaf dosyalar (kuralların ve verinin kendisi). */
const TOKEN_SCAN_EXEMPT_FILES = new Set(["lib/sites/registry.ts", "lib/sites/ownership.ts", "scripts/isolation-baseline.json"]);

/** İçeriği taranan (metin) dosya uzantıları. Dokümanlar (.md) bilerek dışarıda: siteleri adıyla anlatırlar. */
const TEXT_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "css", "json", "svg", "html", "txt", "xml", "webmanifest", "sql", "sh", "yml", "yaml", "example",
]);

export function isTextFileForScan(path: string): boolean {
  const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  return TEXT_EXTENSIONS.has(extension);
}

export function isCodeFileForImports(path: string): boolean {
  return /\.(tsx?|jsx?|mjs|cjs)$/.test(path);
}

/** Testler bütün sitelerin verisini ve dosyalarını bilerek kullanır. */
export function isIsolationExempt(path: string): boolean {
  const normalized = normalizeRepoPath(path);
  return normalized.startsWith("tests/") || TOKEN_SCAN_EXEMPT_FILES.has(normalized);
}

function isPanelSite(siteKey: string, sites: readonly SiteDefinition[]): boolean {
  return sites.some((site) => site.key === siteKey && site.kind === "panel");
}

/**
 * (a) ve (c): `scanText` yorumları temizlenmiş dosya içeriğidir (ikili
 * dosyalarda boş metin verilir; yol yine taranır).
 */
export function tokenViolations(path: string, scanText: string, sites: readonly SiteDefinition[] = SITES): IsolationViolation[] {
  const file = normalizeRepoPath(path);
  if (isIsolationExempt(file)) return [];
  const owner = ownerOf(file);
  if (owner !== SHARED_OWNER && isPanelSite(owner, sites)) return [];

  const forbiddenSites = owner === SHARED_OWNER ? sites : sites.filter((site) => site.key !== owner);
  const ownerLabel = owner === SHARED_OWNER ? "ortak (shared) dosya" : `"${owner}" sitesinin dosyası`;
  const violations: IsolationViolation[] = [];

  for (const hit of findLeakTokens(file, forbiddenSites)) {
    violations.push({ rule: "token", file, match: hit.token, line: 0, detail: `${ownerLabel}; dosya YOLUNDA "${hit.siteKey}" sitesinin ifadesi "${hit.token}"` });
  }
  for (const hit of findLeakTokens(scanText, forbiddenSites)) {
    violations.push({ rule: "token", file, match: hit.token, line: hit.line, detail: `${ownerLabel}; "${hit.siteKey}" sitesinin ifadesi "${hit.token}"` });
  }
  return violations;
}

const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)(["'])([^"'\n]+)\1/g;

/** Yorumları temizlenmiş kaynak metninden import/require hedeflerini (ve satırlarını) çıkarır. */
export function extractImportSpecifiers(text: string): Array<{ specifier: string; line: number }> {
  const results: Array<{ specifier: string; line: number }> = [];
  for (const match of text.matchAll(IMPORT_SPECIFIER)) {
    const index = match.index ?? 0;
    let line = 1;
    for (let i = 0; i < index; i += 1) if (text.charCodeAt(i) === 10) line += 1;
    results.push({ specifier: match[2], line });
  }
  return results;
}

const RESOLVE_SUFFIXES = ["", ".ts", ".tsx", ".mjs", ".js", ".jsx", ".css", ".json", "/index.ts", "/index.tsx"];

/** "@/x" ve göreceli import → repodaki dosya yolu (paket importları ve bulunamayanlar: null). */
export function resolveImport(fromPath: string, specifier: string, fileSet: ReadonlySet<string>): string | null {
  let base: string;
  if (specifier.startsWith("@/")) {
    base = specifier.slice(2);
  } else if (specifier.startsWith(".")) {
    const segments = normalizeRepoPath(fromPath).split("/").slice(0, -1);
    for (const part of specifier.split("/")) {
      if (part === "" || part === ".") continue;
      if (part === "..") segments.pop();
      else segments.push(part);
    }
    base = segments.join("/");
  } else {
    return null;
  }
  for (const suffix of RESOLVE_SUFFIXES) {
    const candidate = `${base}${suffix}`;
    if (fileSet.has(candidate)) return candidate;
  }
  return null;
}

/** (b): `imports` çözülmüş hedef dosya yollarıdır. */
export function importViolations(path: string, imports: ReadonlyArray<{ target: string; line: number }>): IsolationViolation[] {
  const file = normalizeRepoPath(path);
  if (isIsolationExempt(file)) return [];
  const owner = ownerOf(file);
  const violations: IsolationViolation[] = [];
  for (const { target, line } of imports) {
    const targetOwner = ownerOf(target);
    if (targetOwner === SHARED_OWNER || targetOwner === owner) continue;
    const ownerLabel = owner === SHARED_OWNER ? "ortak (shared) dosya" : `"${owner}" sitesinin dosyası`;
    violations.push({ rule: "import", file, match: normalizeRepoPath(target), line, detail: `${ownerLabel}, "${targetOwner}" sitesinin dosyasını import ediyor` });
  }
  return violations;
}

/**
 * Bilinen (bugünkü) ihlaller — scripts/isolation-baseline.json. Anahtar
 * kural + dosya + eşleşme; `count` o dosyada kaç kez geçtiğidir (satır
 * numarası tutulmaz: araya satır eklemek baseline'ı bozmasın).
 * Baseline YALNIZ KÜÇÜLEBİLİR; yeni madde kullanıcı onayı ister.
 */
export interface BaselineEntry {
  rule: IsolationRule;
  file: string;
  match: string;
  count: number;
  reason: string;
}

export interface BaselineComparison {
  /** Baseline'da olmayan ya da sayısı baseline'ı aşan ihlaller → HATA. */
  unexpected: Array<{ key: string; allowed: number; found: IsolationViolation[] }>;
  /** Baseline'da olup artık hiç olmayan ya da azalmış maddeler → UYARI (baseline küçültülmeli). */
  stale: Array<{ entry: BaselineEntry; found: number }>;
}

export function baselineKey(rule: IsolationRule, file: string, match: string): string {
  return `${rule}|${normalizeRepoPath(file)}|${match}`;
}

export function compareWithBaseline(violations: readonly IsolationViolation[], baseline: readonly BaselineEntry[]): BaselineComparison {
  const grouped = new Map<string, IsolationViolation[]>();
  for (const violation of violations) {
    const key = baselineKey(violation.rule, violation.file, violation.match);
    const list = grouped.get(key);
    if (list) list.push(violation);
    else grouped.set(key, [violation]);
  }
  const allowed = new Map<string, BaselineEntry>();
  for (const entry of baseline) allowed.set(baselineKey(entry.rule, entry.file, entry.match), entry);

  const unexpected: BaselineComparison["unexpected"] = [];
  for (const [key, found] of grouped) {
    const limit = allowed.get(key)?.count ?? 0;
    if (found.length > limit) unexpected.push({ key, allowed: limit, found });
  }
  const stale: BaselineComparison["stale"] = [];
  for (const [key, entry] of allowed) {
    const found = grouped.get(key)?.length ?? 0;
    if (found < entry.count) stale.push({ entry, found });
  }
  return { unexpected, stale };
}

/** Baseline dosyasının biçim denetimi (gerekçesiz madde kabul edilmez). */
export function validateBaseline(entries: unknown): string[] {
  if (!Array.isArray(entries)) return ["entries bir dizi olmalı"];
  const problems: string[] = [];
  const seen = new Set<string>();
  entries.forEach((entry, index) => {
    const item = entry as Partial<BaselineEntry>;
    const label = `entries[${index}]`;
    if (item.rule !== "token" && item.rule !== "import") problems.push(`${label}: rule "token" ya da "import" olmalı`);
    if (typeof item.file !== "string" || !item.file) problems.push(`${label}: file eksik`);
    if (typeof item.match !== "string" || !item.match) problems.push(`${label}: match eksik`);
    if (!Number.isInteger(item.count) || (item.count ?? 0) < 1) problems.push(`${label}: count pozitif tam sayı olmalı`);
    if (typeof item.reason !== "string" || item.reason.trim().length < 10) problems.push(`${label}: reason (gerekçe) eksik`);
    if (item.rule && item.file && item.match) {
      const key = baselineKey(item.rule, item.file, item.match);
      if (seen.has(key)) problems.push(`${label}: yinelenen madde (${key})`);
      seen.add(key);
    }
  });
  return problems;
}
