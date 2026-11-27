// Faz 38 — CANLI SIZINTI TARAMASI:  npm run check:live -- <siteKey>
//
// Sitenin canlı adresinden robots.txt, sitemap.xml, sitemap'teki BÜTÜN sayfaları
// ve bir 404 sayfasını indirir (yalnız GET; hiçbir şeye yazmaz) ve her birinde
// başka sitelerin izini arar. Mantık: lib/sites/live-leaks.ts. Kural:
// SITE_IZOLASYON.md §2.10 — her yayından sonra çalıştırılır.
//
// Canlıya bakar, dala değil: Petra için de main'den çalıştırılır
// (`npm run check:live -- petra`); Petra dalına kod eklemek gerekmez.
//
// Seçenekler:
//   --origin <url>   kayıttaki canonicalOrigin yerine başka bir adres (önizleme)
//   --json           bulguları JSON olarak yaz
// Çıkış: bulgu yoksa 0, varsa 1, kullanım/erişim hatasında 2.
import { analyzePage, analyzeRobots, analyzeSitemap } from "../lib/sites/live-leaks.ts";
import { SITES, findSite, normalizeOrigin } from "../lib/sites/registry.ts";

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const siteKey = args.find((arg, index) => !arg.startsWith("--") && args[index - 1] !== "--origin");
const site = findSite(siteKey);

if (!site) {
  console.error(`Kullanım: npm run check:live -- <siteKey>   (geçerli: ${SITES.map((candidate) => candidate.key).join(", ")})`);
  process.exit(2);
}

const origin = normalizeOrigin(option("--origin") ?? site.canonicalOrigin);
const NOT_FOUND_PATH = "/__sizinti-taramasi-olmayan-sayfa__";
const CONCURRENCY = 4;

async function get(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, { redirect: "follow", signal: controller.signal, headers: { "user-agent": "site-isolation-check/1.0", accept: "text/html,application/xml,text/plain,*/*" } });
    return { status: response.status, finalUrl: response.url, text: await response.text() };
  } catch (error) {
    return { status: 0, finalUrl: url, text: "", error: error?.message ?? String(error) };
  } finally {
    clearTimeout(timer);
  }
}

/** --origin verildiyse kayıttaki origin'e yazılmış adresi taranan origin'e çevirir. */
const toFetchUrl = (url) => (origin === site.canonicalOrigin ? url : url.replace(site.canonicalOrigin, origin));

const findings = [];
const rows = [];

// robots.txt
const robotsUrl = `${origin}/robots.txt`;
const robots = await get(robotsUrl);
if (robots.status === 200) findings.push(...analyzeRobots({ url: robotsUrl, robots: robots.text, site }));
rows.push({ url: robotsUrl, status: robots.status, findings: findings.length });

// sitemap.xml → sayfa listesi
const sitemapUrl = `${origin}/sitemap.xml`;
const sitemap = await get(sitemapUrl);
let pages = [];
if (sitemap.status === 200) {
  const analyzed = analyzeSitemap({ url: sitemapUrl, xml: sitemap.text, site });
  pages = analyzed.pages;
  findings.push(...analyzed.findings);
}
rows.push({ url: sitemapUrl, status: sitemap.status, findings: findings.length - rows.reduce((sum, row) => sum + row.findings, 0) });

// Sitemap'i olmayan site (panel): kök sayfa taranır.
if (pages.length === 0) pages = [`${site.canonicalOrigin}/`];
pages.push(`${site.canonicalOrigin}${NOT_FOUND_PATH}`);

const queue = [...pages];
async function worker() {
  for (;;) {
    const page = queue.shift();
    if (!page) return;
    const fetchUrl = toFetchUrl(page);
    const result = await get(fetchUrl);
    const pageFindings = [];
    if (result.status === 0) {
      pageFindings.push({ kind: "erişim", url: page, detail: `indirilemedi: ${result.error}` });
    } else {
      const finalHost = new URL(result.finalUrl).host;
      if (finalHost !== new URL(origin).host) {
        pageFindings.push({ kind: "adres", url: page, detail: `başka bir adrese yönleniyor: ${result.finalUrl}` });
      } else {
        pageFindings.push(...analyzePage({ url: page, html: result.text, site }));
      }
    }
    findings.push(...pageFindings);
    rows.push({ url: page, status: result.status, findings: pageFindings.length });
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

if (args.includes("--json")) {
  console.log(JSON.stringify({ site: site.key, origin, pages: rows, findings }, null, 2));
  process.exit(findings.length > 0 ? 1 : 0);
}

console.log(`[check-live] ${site.key} — ${origin} — ${rows.length} adres tarandı${site.kind === "panel" ? " (panel: marka taraması uygulanmaz, yalnız adres denetimi)" : ""}`);
console.log("  durum  bulgu  adres");
for (const row of rows.sort((a, b) => a.url.localeCompare(b.url))) {
  console.log(`  ${String(row.status).padEnd(5)}  ${String(row.findings).padEnd(5)}  ${row.url.replace(site.canonicalOrigin, "") || "/"}`);
}
if (findings.length > 0) {
  console.error(`[check-live] ${findings.length} BULGU:`);
  for (const finding of findings) console.error(`  [${finding.kind}] ${finding.url.replace(site.canonicalOrigin, "") || "/"} — ${finding.detail}`);
  process.exit(1);
}
console.log("[check-live] temiz — başka siteye ait iz yok; canonical/og/link/script adresleri kendi origin'inde.");
