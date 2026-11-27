import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { shouldBuild } from "../lib/sites/build-scope.ts";
import { SITES } from "../lib/sites/registry.ts";

/** Faz 38 — Vercel Ignored Build Step: her proje yalnız kendi sitesinin dallarını derler. */

const MATRIX: Array<[siteKey: string, ref: string, build: boolean]> = [
  // main'den yayınlanan projeler
  ["taktikalp46", "main", true],
  ["panel", "main", true],
  ["taktikalp46", "faz-38-izolasyon", true],
  ["panel", "faz-38-izolasyon", true],
  ["taktikalp46", "shared-fiyat", true],
  ["taktikalp46", "taktikalp46-kampanya", true],
  ["panel", "taktikalp46-kampanya", false],
  ["taktikalp46", "panel-rapor", false],
  ["panel", "panel-rapor", true],
  // Petra dalları mağaza ve panelde ASLA derlenmez
  ["taktikalp46", "petra-production", false],
  ["taktikalp46", "petra-seo", false],
  ["panel", "petra-production", false],
  ["panel", "petra-seo", false],
  // Petra projesi yalnız kendi soyunu derler
  ["petra", "petra-production", true],
  ["petra", "petra-seo", true],
  ["petra", "main", false],
  ["petra", "faz-38-izolasyon", false],
  ["petra", "taktikalp46-kampanya", false],
  // adı kurala uymayan dal: hiçbir projede derlenmez
  ["taktikalp46", "font-local", false],
  ["panel", "deneme", false],
  ["petra", "deneme", false],
];

test("dal × proje matrisi", () => {
  for (const [siteKey, ref, build] of MATRIX) {
    assert.equal(shouldBuild({ siteKey, ref }).build, build, `${siteKey} @ ${ref}: ${shouldBuild({ siteKey, ref }).reason}`);
  }
});

test("her sitenin production dalı kendi projesinde derlenir; bir dal en az bir projede atlanıyorsa nedeni yazılıdır", () => {
  for (const site of SITES) {
    assert.equal(shouldBuild({ siteKey: site.key, ref: site.deployBranch }).build, true, site.key);
    assert.ok(shouldBuild({ siteKey: site.key, ref: "rastgele" }).reason.length > 10);
  }
});

test("SITE_KEY yok/bilinmiyor ya da dal bilgisi yok → derle (check-site-env açıklayıcı hatayla durdurur)", () => {
  assert.equal(shouldBuild({ siteKey: undefined, ref: "main" }).build, true);
  assert.equal(shouldBuild({ siteKey: "yok", ref: "main" }).build, true);
  assert.equal(shouldBuild({ siteKey: "taktikalp46", ref: undefined }).build, true);
  assert.equal(shouldBuild({ siteKey: " Taktikalp46 ", ref: " main " }).build, true);
});

test("betik: Vercel sözleşmesi — çıkış 1 derle, çıkış 0 atla", () => {
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts", "vercel-should-build.mjs");
  const run = (siteKey: string, ref: string) =>
    spawnSync(process.execPath, ["--no-warnings", script], { encoding: "utf8", env: { ...process.env, SITE_KEY: siteKey, VERCEL_GIT_COMMIT_REF: ref } });
  const build = run("taktikalp46", "main");
  assert.equal(build.status, 1);
  assert.match(build.stdout, /DERLE/);
  const skip = run("taktikalp46", "petra-seo");
  assert.equal(skip.status, 0);
  assert.match(skip.stdout, /ATLA/);
  assert.equal(run("panel", "petra-production").status, 0);
  assert.equal(run("petra", "petra-production").status, 1);
});
