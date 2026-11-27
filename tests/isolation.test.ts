import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  compareWithBaseline,
  extractImportSpecifiers,
  importViolations,
  resolveImport,
  tokenViolations,
  validateBaseline,
  type BaselineEntry,
} from "../lib/sites/isolation.ts";
import { findLeakTokens, foldForLeakScan } from "../lib/sites/leak-tokens.ts";
import { ALWAYS_ALLOWED_DOC_FILES, ownerOf } from "../lib/sites/ownership.ts";
import { ALLOWED_EVERYWHERE, SITES } from "../lib/sites/registry.ts";

/** Faz 38 — site izolasyonu: sahiplik haritası, sızıntı ifadeleri, statik denetim ve baseline. */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkScript = path.join(repoRoot, "scripts", "check-isolation.mjs");

function runCheck(args: string[]) {
  return spawnSync(process.execPath, ["--no-warnings", checkScript, ...args], { encoding: "utf8" });
}

test("registry: her sitenin deployBranch'i ve sızıntı ifadeleri var; ifadeler küçük harf ve siteler arası çakışmıyor", () => {
  for (const site of SITES) {
    assert.ok(site.deployBranch, site.key);
    assert.ok(site.leakTokens.length > 0, `${site.key}: leakTokens boş`);
    for (const token of site.leakTokens) {
      assert.equal(token, foldForLeakScan(token), `${site.key}: "${token}" küçük harf olmalı`);
      assert.ok(token.trim().length >= 5, `${site.key}: "${token}" çok kısa (yanlış alarm üretir)`);
    }
  }
  const all = SITES.flatMap((site) => site.leakTokens);
  assert.equal(new Set(all).size, all.length, "aynı ifade iki sitede");
  assert.equal(SITES.find((site) => site.key === "petra")?.deployBranch, "petra-production");
  assert.equal(SITES.find((site) => site.key === "taktikalp46")?.deployBranch, "main");
  assert.ok(ALLOWED_EVERYWHERE.includes("mb digital boost"));
});

test("sızıntı ifadesi eşleştirme: büyük/küçük harf, Türkçe İ, satıra bölünmüş ad, telefon biçimleri", () => {
  const petra = SITES.filter((site) => site.key === "petra");
  const taktikalp = SITES.filter((site) => site.key === "taktikalp46");
  const tokens = (text: string, sites: typeof petra) => findLeakTokens(text, sites).map((hit) => hit.token);

  assert.deepEqual(tokens("PETRA MÜHENDİSLİK", petra), ["petra mühendislik"]);
  assert.deepEqual(tokens("Petra\n   Mühendislik'in", petra), ["petra mühendislik"]);
  assert.deepEqual(tokens("https://www.petramuhendislik.com/x", petra), ["petramuhendislik"]);
  assert.deepEqual(tokens("instagram.com/petraamuhendislik", petra), ["petraamuhendislik"]);
  for (const phone of ["0535 791 11 96", "05357911196", "+90 535 791 11 96", "+90 (535) 791-11-96"]) {
    assert.deepEqual(tokens(`tel: ${phone}`, petra), ["0535 791 11 96"], phone);
  }
  assert.deepEqual(tokens("TAKTIKALP46 Kydex kılıf", taktikalp), ["taktikalp", "kydex"]);
  assert.equal(findLeakTokens("satır 1\nsatır 2 t46store.com", taktikalp)[0].line, 2);
  // Ajans imzası ve ilgisiz metin sızıntı değildir; "petra" tek başına ifade değil (petraTheme gibi adlar serbest).
  assert.deepEqual(findLeakTokens("Web sitesi MB Digital Boost tarafından geliştirilmiştir. petraTheme", SITES), []);
});

test("sahiplik haritası: bilinen dosyalar doğru sahipte; eşleşmeyen her şey shared; yeni site klasörleri otomatik", () => {
  const expected: Record<string, string> = {
    "app/(public)/page.tsx": "petra",
    "app/(public)/cozumler/[slug]/page.tsx": "petra",
    "lib/data/petra/site-config.ts": "petra",
    "lib/cms/petra/mappers.ts": "petra",
    "lib/theme/petra-theme.ts": "petra",
    "lib/sites/petra-sitemap.ts": "petra",
    "components/sites/petra/petra-not-found.tsx": "petra",
    "components/sections/hero.tsx": "petra",
    "components/btu/btu-calculator.tsx": "petra",
    "lib/seo/build-metadata.ts": "petra",
    "public/images/petra/hero/x.jpg": "petra",
    "scripts/vercel-ignore-build-petra.sh": "petra",
    "tests/petra/seo-unit.test.mjs": "petra",
    "components/commerce/public/taktikalp46-homepage-sections.tsx": "taktikalp46",
    "public/images/taktikalp46/icon.png": "taktikalp46",
    "public/images/hero/kydex-sarjor-kilifi-hero.jpg": "taktikalp46",
    "lib/fonts/store/oswald-latin.woff2": "taktikalp46",
    "supabase/platform/migrations/0025_taktikalp46_catalog_categories.sql": "taktikalp46",
    "app/dashboard/customers/[customerId]/page.tsx": "panel",
    "app/(auth)/login/page.tsx": "panel",
    "components/dashboard/orders-tabs.tsx": "panel",
    // ortak motor
    "app/store/[storeSlug]/page.tsx": "shared",
    "lib/commerce/pricing.ts": "shared",
    "lib/sites/registry.ts": "shared",
    "lib/seo/store-structured-data.ts": "shared",
    "components/ui/reveal.tsx": "shared",
    "lib/cms/adapters/seo.ts": "shared",
    "package.json": "shared",
    "tests/seo.test.ts": "shared",
    // yeni site kalıbı
    "app/sites/belmonta/page.tsx": "belmonta",
    "lib/sites/belmonta/data.ts": "belmonta",
    "public/sites/belmonta/logo.png": "belmonta",
  };
  for (const [file, owner] of Object.entries(expected)) assert.equal(ownerOf(file), owner, file);
  assert.equal(ownerOf("lib\\data\\petra\\site-config.ts"), "petra", "Windows yol ayracı");
  assert.deepEqual([...ALWAYS_ALLOWED_DOC_FILES], ["CLAUDE.md", "SITE_IZOLASYON.md"]);
});

test("(a) site dosyasında başka sitenin ifadesi → ihlal; kendi ifadesi ve panel dosyası → ihlal değil", () => {
  const petraFile = tokenViolations("app/(public)/hakkimizda/page.tsx", 'const x = "https://www.t46store.com";');
  assert.equal(petraFile.length, 1);
  assert.equal(petraFile[0].rule, "token");
  assert.equal(petraFile[0].match, "t46store");
  assert.equal(petraFile[0].line, 1);

  assert.deepEqual(tokenViolations("app/(public)/hakkimizda/page.tsx", "Petra Mühendislik 0535 791 11 96"), []);
  assert.equal(tokenViolations("components/commerce/public/taktikalp46-homepage-sections.tsx", "tel: 0535 791 11 96").length, 1);
  assert.deepEqual(tokenViolations("components/commerce/public/taktikalp46-homepage-sections.tsx", "Kydex taktikalp46"), []);
  // Panel bütün müşterileri listeler: panelin kendi dosyalarında marka taraması yok.
  assert.deepEqual(tokenViolations("app/dashboard/customers/page.tsx", "Petra Mühendislik, Taktikalp46"), []);
  // Yeni site (registry'ye henüz yazılmamış olsa bile): bütün mevcut sitelerin ifadeleri yasak.
  assert.equal(tokenViolations("app/sites/belmonta/page.tsx", "Kydex ve Petra Mühendislik").length, 2);
  // Panelin alan adı müşteri sitesinde görünmemeli.
  assert.equal(tokenViolations("app/(public)/page.tsx", "https://mb-digital-boost-web-panel.vercel.app/login").length, 1);
});

test("(c) ortak dosyada herhangi bir sitenin ifadesi → ihlal; dosya yolu da taranır; testler ve registry muaf", () => {
  const shared = tokenViolations("lib/commerce/pricing.ts", 'const a = "petramuhendislik.com";\nconst b = "Kydex";');
  assert.deepEqual(shared.map((violation) => `${violation.match}@${violation.line}`), ["petramuhendislik@1", "kydex@2"]);
  assert.equal(tokenViolations("lib/commerce/t46store-helper.ts", "")[0].line, 0);
  assert.deepEqual(tokenViolations("lib/commerce/pricing.ts", "MB Digital Boost"), []);
  assert.deepEqual(tokenViolations("tests/seo.test.ts", "t46store petramuhendislik"), []);
  assert.deepEqual(tokenViolations("lib/sites/registry.ts", "t46store petramuhendislik"), []);
});

test("(b) import: site → başka site ve ortak → site ihlal; site → ortak ve kendi içi serbest", () => {
  const files = new Set([
    "app/sites/belmonta/page.tsx",
    "lib/sites/belmonta/data.ts",
    "lib/sites/acme/data.ts",
    "lib/commerce/pricing.ts",
    "lib/data/petra/site-config.ts",
    "components/commerce/public/taktikalp46-homepage-sections.tsx",
    "app/store/[storeSlug]/page.tsx",
  ]);
  const source = [
    'import { a } from "@/lib/sites/belmonta/data";',
    'import { b } from "@/lib/sites/acme/data";',
    'import { c } from "@/lib/commerce/pricing";',
    'import type { d } from "../../../lib/data/petra/site-config";',
    'import react from "react";',
    'const lazy = import("@/lib/sites/acme/data");',
  ].join("\n");
  const imports = extractImportSpecifiers(source)
    .map(({ specifier, line }) => ({ target: resolveImport("app/sites/belmonta/page.tsx", specifier, files), line }))
    .filter((item): item is { target: string; line: number } => item.target !== null);
  assert.deepEqual(imports.map((item) => item.target), [
    "lib/sites/belmonta/data.ts",
    "lib/sites/acme/data.ts",
    "lib/commerce/pricing.ts",
    "lib/data/petra/site-config.ts",
    "lib/sites/acme/data.ts",
  ]);
  const violations = importViolations("app/sites/belmonta/page.tsx", imports);
  assert.deepEqual(violations.map((violation) => `${violation.match}@${violation.line}`), [
    "lib/sites/acme/data.ts@2",
    "lib/data/petra/site-config.ts@4",
    "lib/sites/acme/data.ts@6",
  ]);
  // Ortak motor bir sitenin dosyasını import edemez.
  const sharedImports = importViolations("app/store/[storeSlug]/page.tsx", [
    { target: "components/commerce/public/taktikalp46-homepage-sections.tsx", line: 3 },
    { target: "lib/commerce/pricing.ts", line: 4 },
  ]);
  assert.equal(sharedImports.length, 1);
  assert.equal(sharedImports[0].rule, "import");
});

test("baseline: bilinen madde geçer; sayı aşılırsa ya da yeni madde gelirse hata; düzeltilen madde uyarı verir", () => {
  const baseline: BaselineEntry[] = [
    { rule: "token", file: "lib/commerce/a.ts", match: "kydex", count: 2, reason: "Faz 38 öncesinden kalan sabit metin." },
    { rule: "import", file: "app/not-found.tsx", match: "components/sites/petra/petra-not-found.tsx", count: 1, reason: "Kök 404 sayfası siteye göre seçiyor." },
  ];
  const hit = (line: number) => ({ rule: "token" as const, file: "lib/commerce/a.ts", match: "kydex", line, detail: "" });
  const importHit = { rule: "import" as const, file: "app/not-found.tsx", match: "components/sites/petra/petra-not-found.tsx", line: 4, detail: "" };

  assert.deepEqual(compareWithBaseline([hit(1), hit(9), importHit], baseline), { unexpected: [], stale: [] });

  const over = compareWithBaseline([hit(1), hit(9), hit(12), importHit], baseline);
  assert.equal(over.unexpected.length, 1);
  assert.equal(over.unexpected[0].allowed, 2);
  assert.equal(over.unexpected[0].found.length, 3);

  const fresh = compareWithBaseline([{ ...hit(1), file: "lib/commerce/b.ts" }], []);
  assert.equal(fresh.unexpected.length, 1);
  assert.equal(fresh.unexpected[0].allowed, 0);

  const fixed = compareWithBaseline([hit(1)], baseline);
  assert.deepEqual(fixed.unexpected, []);
  assert.deepEqual(fixed.stale.map((item) => `${item.entry.match}:${item.found}`).sort(), ["components/sites/petra/petra-not-found.tsx:0", "kydex:1"]);

  assert.deepEqual(validateBaseline(baseline), []);
  assert.ok(validateBaseline([{ rule: "token", file: "x.ts", match: "kydex", count: 1, reason: "" }]).some((problem) => problem.includes("gerekçe")));
  assert.ok(validateBaseline([...baseline, baseline[0]]).some((problem) => problem.includes("yinelenen")));
});

test("repodaki baseline dosyası: biçimi geçerli, her maddenin gerekçesi var, sahiplik haritasıyla tutarlı", () => {
  const baseline = JSON.parse(readFileSync(path.join(repoRoot, "scripts", "isolation-baseline.json"), "utf8"));
  assert.deepEqual(validateBaseline(baseline.entries), []);
  for (const entry of baseline.entries as BaselineEntry[]) {
    assert.ok(entry.reason.length >= 40, `${entry.file}: gerekçe çok kısa`);
  }
});

test("npm run check:isolation — repo bugünkü hâliyle temiz (baseline ile); uyarı yok", () => {
  const result = runCheck([]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /\[check-isolation\] temiz/);
  assert.doesNotMatch(result.stderr, /UYARI/, "baseline'da artık ihlal olmayan madde var; silin");
});

test("betik sahte dosyalarla kırılıyor: Petra dosyasında t46store, ortak dosyada petramuhendislik, siteler arası import", () => {
  const root = mkdtempSync(path.join(tmpdir(), "isolation-"));
  const write = (file: string, content: string) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  };
  try {
    // Temiz başlangıç: yalnız yorumda geçen ad ihlal değildir.
    write("lib/commerce/pricing.ts", "// Taktikalp46 için yazıldı; Petra Mühendislik de kullanabilir\nexport const tax = 20;\n");
    write("app/(public)/page.tsx", 'import { tax } from "@/lib/commerce/pricing";\nexport default function Page() {\n  return <p>{/* t46store */}Petra Mühendislik {tax}</p>;\n}\n');
    write("app/sites/belmonta/page.tsx", "export const title = \"Belmonta\";\n");
    assert.equal(runCheck(["--root", root]).status, 0, "temiz sahte repo geçmeli");

    write("app/(public)/sizinti.tsx", 'export const url = "https://www.t46store.com";\n');
    const petraLeak = runCheck(["--root", root]);
    assert.equal(petraLeak.status, 1);
    assert.match(petraLeak.stderr, /app\/\(public\)\/sizinti\.tsx/);
    assert.match(petraLeak.stderr, /t46store/);
    rmSync(path.join(root, "app/(public)/sizinti.tsx"));

    write("lib/commerce/sizinti.ts", 'export const site = "petramuhendislik.com";\n');
    const sharedLeak = runCheck(["--root", root]);
    assert.equal(sharedLeak.status, 1);
    assert.match(sharedLeak.stderr, /lib\/commerce\/sizinti\.ts/);
    rmSync(path.join(root, "lib/commerce/sizinti.ts"));

    write("lib/sites/acme/data.ts", "export const acme = 1;\n");
    write("app/sites/belmonta/capraz.tsx", 'import { acme } from "@/lib/sites/acme/data";\nexport const value = acme;\n');
    const crossImport = runCheck(["--root", root]);
    assert.equal(crossImport.status, 1);
    assert.match(crossImport.stderr, /import/);
    assert.match(crossImport.stderr, /lib\/sites\/acme\/data\.ts/);
    rmSync(path.join(root, "app/sites/belmonta/capraz.tsx"));

    // Gerekçeli baseline maddesi ihlali geçirir; gerekçesiz madde betiği durdurur.
    write("lib/commerce/eski.ts", 'export const eski = "Kydex";\n');
    assert.equal(runCheck(["--root", root]).status, 1);
    const entry = { rule: "token", file: "lib/commerce/eski.ts", match: "kydex", count: 1, reason: "Faz 38 öncesinden kalan sabit metin (test)." };
    write("scripts/isolation-baseline.json", JSON.stringify({ entries: [entry] }));
    assert.equal(runCheck(["--root", root]).status, 0);
    write("scripts/isolation-baseline.json", JSON.stringify({ entries: [{ ...entry, reason: "" }] }));
    assert.equal(runCheck(["--root", root]).status, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
