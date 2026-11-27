import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { evaluateCommit, hasScopeTag, isolatedSiteForBranch, ownershipSummary } from "../lib/sites/branch-scope.ts";

/** Faz 38 — push koruması: bir commit iki siteye dokunamaz; Petra dalı ve main soyu birbirine karışmaz. */

const commit = (subject: string, files: string[], extra: { onSharedLineage?: boolean; message?: string } = {}) => ({
  sha: "abcdef1234567890",
  subject,
  files,
  ...extra,
});

test("dal → ayrı soy sitesi: petra-production ve petra-* Petra'nın; main, faz-*, taktikalp46-* değil", () => {
  assert.equal(isolatedSiteForBranch("petra-production")?.key, "petra");
  assert.equal(isolatedSiteForBranch("petra-seo")?.key, "petra");
  for (const branch of ["main", "faz-38-izolasyon", "taktikalp46-kampanya", "petrasiz", "shared-x"]) {
    assert.equal(isolatedSiteForBranch(branch), null, branch);
  }
  assert.ok(hasScopeTag("[petra] BTU açıklaması"));
  assert.ok(hasScopeTag("[shared] Faz 38"));
  assert.ok(!hasScopeTag("feat: bir şey"));
});

test("kural 1 — iki sitenin dosyası aynı commit'te reddedilir; ortak + tek site serbest", () => {
  const twoSites = evaluateCommit("main", commit("[shared] karışık", ["components/commerce/public/taktikalp46-homepage-sections.tsx", "app/dashboard/page.tsx", "lib/commerce/pricing.ts"]));
  assert.equal(twoSites.errors.length, 1);
  assert.match(twoSites.errors[0], /iki sitenin dosyasına dokunamaz/);

  const sharedPlusOne = evaluateCommit("main", commit("[taktikalp46] ana sayfa", ["components/commerce/public/taktikalp46-homepage-sections.tsx", "lib/commerce/pricing.ts", "app/store/[storeSlug]/page.tsx"]));
  assert.deepEqual(sharedPlusOne, { errors: [], warnings: [] });

  const panelPlusShared = evaluateCommit("faz-39", commit("[panel] sipariş listesi", ["app/dashboard/orders/page.tsx", "lib/commerce/orders.ts"]));
  assert.deepEqual(panelPlusShared, { errors: [], warnings: [] });
});

test("kural 2 — Petra dalı: yalnız Petra dosyaları ve iki doküman; ortak dosya, başka site ve main commit'i reddedilir", () => {
  const clean = evaluateCommit("petra-seo", commit("[petra] SEO", ["app/(public)/page.tsx", "lib/data/petra/seo-descriptions.ts", "components/btu/btu-guide.tsx", "lib/seo/build-metadata.ts", "tests/petra/seo-unit.test.mjs", "scripts/vercel-ignore-build-petra.sh"]));
  assert.deepEqual(clean, { errors: [], warnings: [] });
  assert.deepEqual(evaluateCommit("petra-production", commit("[petra] kurallar", ["CLAUDE.md", "SITE_IZOLASYON.md"])), { errors: [], warnings: [] });

  const sharedFile = evaluateCommit("petra-seo", commit("[petra] x", ["app/(public)/page.tsx", "package.json"]));
  assert.equal(sharedFile.errors.length, 1);
  assert.match(sharedFile.errors[0], /package\.json/);

  const otherSite = evaluateCommit("petra-production", commit("[petra] x", ["components/commerce/public/taktikalp46-homepage-sections.tsx"]));
  assert.equal(otherSite.errors.length, 1);

  const fromMain = evaluateCommit("petra-seo", commit("[petra] x", ["app/(public)/page.tsx"], { onSharedLineage: true }));
  assert.equal(fromMain.errors.length, 1);
  assert.match(fromMain.errors[0], /main/);
});

test("kural 3 — main soyundaki dallarda Petra dosyası reddedilir; [petra-main] etiketiyle uyarıya döner", () => {
  for (const branch of ["main", "faz-38-izolasyon", "taktikalp46-x"]) {
    const result = evaluateCommit(branch, commit("[shared] x", ["app/(public)/page.tsx", "lib/commerce/pricing.ts"]));
    assert.equal(result.errors.length, 1, branch);
    assert.match(result.errors[0], /petra-production/);
  }
  const tagged = evaluateCommit("main", commit("[petra-main] kopyayı eşitle", ["app/(public)/page.tsx"]));
  assert.deepEqual(tagged.errors, []);
  assert.equal(tagged.warnings.length, 1);
  assert.match(tagged.warnings[0], /canlıya GİTMEZ/);

  const tagInBody = evaluateCommit("main", commit("[shared] x", ["lib/data/petra/site-config.ts"], { message: "[shared] x\n\n[petra-main] bilinçli" }));
  assert.deepEqual(tagInBody.errors, []);
});

test("kural 4 — etiketsiz commit yalnız uyarı verir; sahiplik özeti dosyaları sahibine göre gruplar", () => {
  const untagged = evaluateCommit("main", commit("fiyat düzeltmesi", ["lib/commerce/pricing.ts"]));
  assert.deepEqual(untagged.errors, []);
  assert.equal(untagged.warnings.length, 1);

  const summary = ownershipSummary(["lib/commerce/pricing.ts", "app\\(public)\\page.tsx", "app/dashboard/x.tsx", "app/sites/belmonta/page.tsx"]);
  assert.deepEqual([...summary.keys()].sort(), ["belmonta", "panel", "petra", "shared"]);
});

test("betik gerçek bir git deposunda: iki site, main'de Petra, Petra dalında Taktikalp reddedilir; temiz commit geçer", () => {
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts", "check-branch-scope.mjs");
  const repo = mkdtempSync(path.join(tmpdir(), "branch-scope-"));
  const git = (...args: string[]) => {
    const result = spawnSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", ...args], { cwd: repo, encoding: "utf8" });
    assert.equal(result.status, 0, `git ${args.join(" ")}: ${result.stderr}`);
    return result.stdout.trim();
  };
  const commitFiles = (subject: string, files: string[]) => {
    for (const file of files) {
      mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
      writeFileSync(path.join(repo, file), `${subject}\n`);
    }
    git("add", "-A");
    git("commit", "-q", "-m", subject);
    return git("rev-parse", "HEAD");
  };
  const check = (branch: string, range: string) => spawnSync(process.execPath, ["--no-warnings", script, "--branch", branch, "--range", range], { cwd: repo, encoding: "utf8" });

  try {
    git("init", "-q", "-b", "main");
    const base = commitFiles("[shared] başlangıç", ["README.md"]);

    const clean = commitFiles("[taktikalp46] ana sayfa", ["lib/commerce/pricing.ts", "components/commerce/public/taktikalp46-x.tsx"]);
    const cleanRun = check("main", `${base}..${clean}`);
    assert.equal(cleanRun.status, 0, cleanRun.stderr);
    assert.match(cleanRun.stdout, /taktikalp46: 1 dosya/);

    const twoSites = commitFiles("[shared] karışık", ["app/dashboard/a.tsx", "components/commerce/public/taktikalp46-y.tsx"]);
    const twoSitesRun = check("main", `${clean}..${twoSites}`);
    assert.equal(twoSitesRun.status, 1);
    assert.match(twoSitesRun.stderr, /iki sitenin dosyasına dokunamaz/);

    const petraOnMain = commitFiles("[shared] yanlışlıkla", ["app/(public)/b.tsx"]);
    const petraOnMainRun = check("main", `${twoSites}..${petraOnMain}`);
    assert.equal(petraOnMainRun.status, 1);
    assert.match(petraOnMainRun.stderr, /petra dosyası değişemez/);

    // Petra dalı: main'in soyundaki commit (petraOnMain) push aralığına girerse reddedilir.
    git("switch", "-q", "-c", "petra-deneme", base);
    const petraClean = commitFiles("[petra] sayfa", ["app/(public)/c.tsx", "lib/data/petra/d.ts"]);
    assert.equal(check("petra-deneme", `${base}..${petraClean}`).status, 0);

    const taktikalpOnPetra = commitFiles("[petra] yanlış dosya", ["components/commerce/public/taktikalp46-z.tsx"]);
    const taktikalpOnPetraRun = check("petra-deneme", `${petraClean}..${taktikalpOnPetra}`);
    assert.equal(taktikalpOnPetraRun.status, 1);
    assert.match(taktikalpOnPetraRun.stderr, /yalnız petra dosyaları/);

    const mainLineageRun = check("petra-deneme", `${base}..${clean}`);
    assert.equal(mainLineageRun.status, 1);
    assert.match(mainLineageRun.stderr, /soyundan/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
