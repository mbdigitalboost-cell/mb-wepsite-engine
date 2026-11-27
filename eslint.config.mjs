import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { OWNERSHIP_RULES } from "./lib/sites/ownership.ts";
import { SITES } from "./lib/sites/registry.ts";

// Fontlar self-hosted: next/font/google derleme anında Google Fonts'tan
// indirir; indirme düşünce üretim derlemesi düşüyordu. Yeni font
// lib/fonts/store-fonts.ts'e (next/font/local) eklenir.
const fontRestriction = {
  name: "next/font/google",
  message: "Fontlar self-hosted: lib/fonts/store-fonts.ts (next/font/local) kullanın. next/font/google derlemeyi Google Fonts'a bağlar.",
};

/**
 * Faz 38 — site izolasyonu (SITE_IZOLASYON.md §2.5): bir MÜŞTERİ sitesinin
 * dosyası başka bir sitenin dosyasını import edemez. Sahiplik haritasından
 * (lib/sites/ownership.ts) üretilir; yeni site klasörleri (app/sites/<key>,
 * lib/sites/<key>) registry'deki her anahtar için otomatik eklenir.
 *
 * Asıl denetim scripts/check-isolation.mjs'tir (ortak motor → site importlarını
 * ve bilinen istisnaları baseline ile o yönetir); bu kural aynı hatayı
 * editörde, yazarken gösterir. Panel burada kapsam dışı: panel müşteri
 * verisini yönettiği için mevcut importları baseline'da izlenir.
 *
 * ESLint'te `no-restricted-imports` ayarı dosya başına tek bir kuraldır
 * (birleşmez), bu yüzden font yasağı her blokta yeniden verilir.
 */
const customerSiteKeys = SITES.filter((site) => site.kind !== "panel").map((site) => site.key);

function ownedGlobs(siteKey) {
  const fromMap = OWNERSHIP_RULES.filter((rule) => rule.owner === siteKey).map((rule) => rule.pattern);
  return [...fromMap, `app/sites/${siteKey}/**`, `lib/sites/${siteKey}/**`];
}

/** Sahiplik kalıbı → import kalıbı ("@/…"); yalnız kod içeren kalıplar anlamlıdır. */
function importPatterns(siteKey) {
  return ownedGlobs(siteKey)
    .filter((pattern) => !/^(public|supabase|scripts|tests)\//.test(pattern))
    .map((pattern) => `@/${pattern.replace(/\.(tsx?|css)$/, "")}`);
}

/**
 * Sahiplik kalıbı → ESLint `files` kalıbı. Yalnız KOD dosyaları: ESLint,
 * `files` ile eşleşen her dosyayı (.sh, .md, .sql dahil) ayrıştırmaya çalışır.
 */
const CODE_EXTENSIONS = "{ts,tsx,js,jsx,mjs}";
function lintGlobs(siteKey) {
  return ownedGlobs(siteKey).flatMap((pattern) => {
    if (/^(public|supabase)\//.test(pattern)) return [];
    if (pattern.endsWith("/**")) return [`${pattern}/*.${CODE_EXTENSIONS}`];
    if (/\.(tsx?|jsx?|mjs)$/.test(pattern)) return [pattern];
    if (pattern.endsWith("*")) return [`${pattern}.${CODE_EXTENSIONS}`];
    return [];
  });
}

const siteIsolationConfigs = customerSiteKeys.map((siteKey) => {
  const others = SITES.filter((site) => site.key !== siteKey);
  return {
    files: lintGlobs(siteKey),
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [fontRestriction],
          patterns: others.map((other) => ({
            group: importPatterns(other.key),
            message: `Site izolasyonu: "${siteKey}" sitesinin dosyası "${other.key}" sitesinin dosyasını import edemez (SITE_IZOLASYON.md §2.5). Ortak olması gereken kodu ortak motora taşıyın.`,
          })),
        },
      ],
    },
  };
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-imports": ["error", { paths: [fontRestriction] }],
    },
  },
  ...siteIsolationConfigs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
