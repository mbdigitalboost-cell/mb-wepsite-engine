// Faz 38 — STATİK İZOLASYON DENETİMİ (prebuild + npm test + `npm run check:isolation`).
//
// Repodaki dosyaları tarar ve şu durumlarda HATA ile biter (çıkış 1):
//   (a) bir siteye ait dosyada başka bir sitenin adı/alan adı/telefonu/e-postası,
//   (b) bir dosyanın, sahibi olmadığı bir sitenin dosyasını import etmesi,
//   (c) ortak (shared) dosyada herhangi bir sitenin ifadesi.
// Kurallar ve gerekçe: SITE_IZOLASYON.md; mantık: lib/sites/isolation.ts;
// kim kimin: lib/sites/ownership.ts; ifadeler: lib/sites/registry.ts (leakTokens).
//
// Bugünkü (Faz 38 öncesinden kalan) ihlaller scripts/isolation-baseline.json'da
// gerekçesiyle yazılıdır ve geçer. Baseline YALNIZ KÜÇÜLEBİLİR: bir madde
// düzeltildiyse betik uyarır (maddeyi silin); yeni madde eklemek kullanıcı
// onayı ister. Bu betik baseline'ı ASLA kendisi yazmaz.
//
// Kullanım:
//   node scripts/check-isolation.mjs              denetle
//   node scripts/check-isolation.mjs --all        baseline'dakiler dahil bütün ihlalleri listele
//   node scripts/check-isolation.mjs --json       bütün ihlalleri JSON olarak yaz (rapor için)
//   node scripts/check-isolation.mjs --root <dir> başka bir klasörü denetle (testler kullanır)
//
// Yorum satırları taranmaz (yorum hiçbir sitenin çıktısına girmez); TS/JS
// yorumları TypeScript'in ayrıştırıcısıyla bulunur (typescript zaten
// devDependency — yeni bağımlılık yok).
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import {
  compareWithBaseline,
  extractImportSpecifiers,
  importViolations,
  isCodeFileForImports,
  isTextFileForScan,
  resolveImport,
  tokenViolations,
  validateBaseline,
} from "../lib/sites/isolation.ts";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(option("--root") ?? repoRoot);
const baselinePath = option("--baseline") ?? path.join(root, "scripts", "isolation-baseline.json");

// Taranan kökler: çalışan kod, statik dosyalar, betikler, veritabanı dosyaları
// ve kökteki yapılandırma. Dokümanlar (docs/, claude/, *.md) ve tests/ dışarıda.
const SCAN_ROOTS = ["app", "components", "lib", "public", "scripts", "supabase", ".githooks", "proxy.ts", "next.config.ts", "eslint.config.mjs", "package.json", ".env.local.example"];
const SKIP_DIRECTORIES = new Set(["node_modules", ".next", ".git", ".vercel"]);
const MAX_TEXT_BYTES = 2 * 1024 * 1024;

function walk(relative, out) {
  const absolute = path.join(root, relative);
  if (!existsSync(absolute)) return;
  const stats = statSync(absolute);
  if (stats.isFile()) {
    out.push(relative.replace(/\\/g, "/"));
    return;
  }
  for (const name of readdirSync(absolute)) {
    if (SKIP_DIRECTORIES.has(name)) continue;
    walk(path.join(relative, name), out);
  }
}

/** [başlangıç, bitiş) aralıklarını boşlukla değiştirir; satır sonları korunur (satır numaraları kaymaz). */
function blank(text, ranges) {
  if (ranges.length === 0) return text;
  const chars = text.split("");
  for (const [start, end] of ranges) {
    for (let i = start; i < end && i < chars.length; i += 1) if (chars[i] !== "\n" && chars[i] !== "\r") chars[i] = " ";
  }
  return chars.join("");
}

function scriptKindFor(file) {
  if (file.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (file.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (file.endsWith(".ts")) return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}

function stripScriptComments(text, file) {
  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, scriptKindFor(file));
  const ranges = new Map();
  const visit = (node) => {
    // JSX metni yorum içermez ("//" orada düz metindir).
    if (node.kind !== ts.SyntaxKind.JsxText) {
      for (const range of ts.getLeadingCommentRanges(text, node.getFullStart()) ?? []) ranges.set(range.pos, range.end);
      for (const range of ts.getTrailingCommentRanges(text, node.getEnd()) ?? []) ranges.set(range.pos, range.end);
    }
    for (const child of node.getChildren(sourceFile)) visit(child);
  };
  visit(sourceFile);
  return blank(text, [...ranges.entries()]);
}

function stripBlockComments(text) {
  const ranges = [];
  for (const match of text.matchAll(/\/\*[\s\S]*?\*\//g)) ranges.push([match.index, match.index + match[0].length]);
  return blank(text, ranges);
}

function stripSqlComments(text) {
  const ranges = [];
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    const next = text[i + 1];
    if (char === "'") {
      i += 1;
      while (i < text.length) {
        if (text[i] === "'" && text[i + 1] === "'") i += 2;
        else if (text[i] === "'") break;
        else i += 1;
      }
      i += 1;
    } else if (char === "-" && next === "-") {
      const end = text.indexOf("\n", i);
      const stop = end === -1 ? text.length : end;
      ranges.push([i, stop]);
      i = stop;
    } else if (char === "/" && next === "*") {
      const end = text.indexOf("*/", i + 2);
      const stop = end === -1 ? text.length : end + 2;
      ranges.push([i, stop]);
      i = stop;
    } else {
      i += 1;
    }
  }
  return blank(text, ranges);
}

function stripHashComments(text) {
  const ranges = [];
  for (const match of text.matchAll(/^[ \t]*#.*$/gm)) ranges.push([match.index, match.index + match[0].length]);
  return blank(text, ranges);
}

function scanTextOf(file, text) {
  if (/\.(tsx?|jsx?|mjs|cjs)$/.test(file)) return stripScriptComments(text, file);
  if (file.endsWith(".css")) return stripBlockComments(text);
  if (file.endsWith(".sql")) return stripSqlComments(text);
  if (/\.(sh|ya?ml|example)$/.test(file) || file.startsWith(".githooks/")) return stripHashComments(text);
  return text;
}

// ---- tarama ----
const files = [];
for (const scanRoot of SCAN_ROOTS) walk(scanRoot, files);
// Import çözümü tests/ altındaki hedefleri de görebilsin (taranmazlar, yalnız çözülürler).
const resolvable = [...files];
walk("tests", resolvable);
const fileSet = new Set(resolvable);

const violations = [];
for (const file of files) {
  let scanText = "";
  if (isTextFileForScan(file) || file.startsWith(".githooks/")) {
    const absolute = path.join(root, file);
    if (statSync(absolute).size <= MAX_TEXT_BYTES) {
      const raw = readFileSync(absolute, "utf8");
      try {
        scanText = scanTextOf(file, raw);
      } catch (error) {
        console.error(`[check-isolation] ${file} ayrıştırılamadı, yorumlar temizlenmeden tarandı: ${error.message}`);
        scanText = raw;
      }
    }
  }
  violations.push(...tokenViolations(file, scanText));
  if (isCodeFileForImports(file) && scanText) {
    const imports = [];
    for (const { specifier, line } of extractImportSpecifiers(scanText)) {
      const target = resolveImport(file, specifier, fileSet);
      if (target) imports.push({ target, line });
    }
    violations.push(...importViolations(file, imports));
  }
}

if (flag("--json")) {
  console.log(JSON.stringify(violations, null, 2));
  process.exit(0);
}

// ---- baseline ----
let baseline = [];
if (existsSync(baselinePath)) {
  const parsed = JSON.parse(readFileSync(baselinePath, "utf8"));
  const problems = validateBaseline(parsed.entries);
  if (problems.length > 0) {
    console.error(`[check-isolation] HATA — ${path.relative(root, baselinePath)} biçimi bozuk:`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  baseline = parsed.entries;
}

const { unexpected, stale } = compareWithBaseline(violations, baseline);

if (flag("--all")) {
  console.log(`[check-isolation] bütün ihlaller (${violations.length}, baseline dahil):`);
  for (const violation of violations) console.log(`  ${violation.rule.padEnd(6)} ${violation.file}:${violation.line}  ${violation.detail}`);
}

for (const { entry, found } of stale) {
  console.warn(
    `[check-isolation] UYARI — baseline maddesi artık ${found === 0 ? "ihlal değil" : `yalnız ${found} kez geçiyor (baseline: ${entry.count})`}: ${entry.rule} ${entry.file} → "${entry.match}". scripts/isolation-baseline.json'dan silin/azaltın (baseline yalnız küçülebilir).`,
  );
}

if (unexpected.length > 0) {
  console.error("[check-isolation] HATA — site izolasyonu ihlali (SITE_IZOLASYON.md):");
  for (const { allowed, found } of unexpected) {
    const first = found[0];
    console.error(`  ${first.rule === "import" ? "import" : "ifade "}  ${first.file}  →  "${first.match}"  (${found.length} kez${allowed > 0 ? `, baseline ${allowed}` : ""})`);
    console.error(`          ${first.detail}`);
    console.error(`          satır: ${found.map((violation) => (violation.line === 0 ? "dosya yolu" : violation.line)).join(", ")}`);
  }
  console.error("  Çözüm: site-özel içeriği o sitenin dosyasına/veritabanına taşıyın ya da (ortak motor ise) registry'den/DB'den okuyun.");
  console.error("  Koruma gevşetilmez. Kaçınılmaz bir istisna, gerekçesiyle ve KULLANICI ONAYIYLA scripts/isolation-baseline.json'a yazılır.");
  process.exit(1);
}

console.log(
  `[check-isolation] temiz — ${files.length} dosya tarandı; ${violations.length} bilinen ihlal baseline'da (${baseline.length} madde)${stale.length > 0 ? `, ${stale.length} baseline uyarısı` : ""}.`,
);
