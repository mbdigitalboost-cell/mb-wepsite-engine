// Faz 28 — prebuild: yanlış yapılandırılmış bir Vercel projesi derlenmesin.
//
// Vercel'de (VERCEL=1):
//   - SITE_KEY yoksa ya da lib/sites/registry.ts'te yoksa → build HATA ile biter.
//   - NEXT_PUBLIC_SITE_URL verilmişse registry'deki canonicalOrigin ile aynı
//     olmalı (sondaki "/" yok sayılır), değilse → HATA.
// Yerelde aynı durumlar yalnız UYARI verir (geliştirme engellenmez).
//
// registry.ts saf TypeScript; Node 24 (Vercel projelerinin nodeVersion'ı
// 24.x, yerel de 24) tür bilgisini ayıklayıp doğrudan çalıştırır — npm test
// de aynı mekanizmayı kullanıyor.
import { SITES, findSite, normalizeOrigin } from "../lib/sites/registry.ts";

const onVercel = process.env.VERCEL === "1";
const siteKey = process.env.SITE_KEY?.trim();
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const problems = [];

if (!siteKey) {
  problems.push(
    `SITE_KEY tanımlı değil. Bu Vercel projesinin hangi siteyi sunduğunu söyleyin (geçerli: ${SITES.map((s) => s.key).join(", ")}). Bkz. docs/YENI_SITE_EKLEME.md`,
  );
} else {
  const site = findSite(siteKey);
  if (!site) {
    problems.push(`SITE_KEY="${siteKey}" lib/sites/registry.ts'te yok (geçerli: ${SITES.map((s) => s.key).join(", ")}).`);
  } else if (siteUrl && normalizeOrigin(siteUrl) !== site.canonicalOrigin) {
    problems.push(
      `NEXT_PUBLIC_SITE_URL ("${normalizeOrigin(siteUrl)}") registry'deki canonicalOrigin ("${site.canonicalOrigin}") ile aynı değil (SITE_KEY=${site.key}). Ya env'i düzeltin ya da registry'yi güncelleyin.`,
    );
  } else {
    console.log(`[check-site-env] SITE_KEY=${site.key} (${site.kind}) → ${site.canonicalOrigin}`);
  }
}

if (problems.length > 0) {
  const header = onVercel ? "[check-site-env] HATA — build durduruldu:" : "[check-site-env] UYARI (yerel, build devam ediyor):";
  console.error(header);
  for (const problem of problems) console.error(`  - ${problem}`);
  if (onVercel) process.exit(1);
}
