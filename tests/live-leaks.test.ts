import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzePage, analyzeRobots, analyzeSitemap, extractAbsoluteReferences } from "../lib/sites/live-leaks.ts";
import { SITES } from "../lib/sites/registry.ts";

/** Faz 38 — canlı sızıntı taraması (sayfa HTML'i, robots.txt, sitemap.xml). */

const site = (key: string) => {
  const found = SITES.find((candidate) => candidate.key === key);
  assert.ok(found, key);
  return found;
};

const page = (head: string, body = "") => `<!DOCTYPE html><html><head>${head}</head><body>${body}</body></html>`;

test("temiz sayfa: kendi adı, kendi origin'i, göreli adresler, ajans imzası ve izinli servisler bulgu üretmez", () => {
  const html = page(
    [
      '<link rel="canonical" href="https://www.t46store.com/urun/x"/>',
      '<meta property="og:url" content="https://www.t46store.com/urun/x"/>',
      '<meta property="og:image" content="https://www.t46store.com/paylasim/urun/x?v=1"/>',
      '<link rel="stylesheet" href="/_next/static/a.css"/>',
      '<script src="/_next/static/a.js" async=""></script>',
      '<script src="https://www.googletagmanager.com/gtag/js?id=G-1"></script>',
      '<link rel="preconnect" href="https://abc.supabase.co"/>',
    ].join(""),
    '<p>Taktikalp46 Kydex kılıf</p><a href="https://www.instagram.com/mbdigitalboost">Web sitesi MB Digital Boost tarafından geliştirilmiştir.</a>',
  );
  assert.deepEqual(analyzePage({ url: "https://www.t46store.com/urun/x", html, site: site("taktikalp46") }), []);
});

test("başka sitenin ifadesi: ad, alan adı, telefon ve panel alan adı yakalanır", () => {
  const html = page("", "<p>Petra Mühendislik — 0535 791 11 96</p><a href=\"https://mb-digital-boost-web-panel.vercel.app/login\">panel</a>");
  const findings = analyzePage({ url: "https://www.t46store.com/", html, site: site("taktikalp46") });
  assert.deepEqual(findings.map((finding) => finding.kind), ["ifade", "ifade", "ifade"]);
  assert.ok(findings.some((finding) => finding.detail.includes('"petra"') && finding.detail.includes("petra mühendislik")));
  assert.ok(findings.some((finding) => finding.detail.includes("0535 791 11 96")));
  assert.ok(findings.some((finding) => finding.detail.includes('"panel"')));

  const petra = analyzePage({ url: "https://www.petramuhendislik.com/", html: page("", "<p>Kydex kılıf t46store.com</p>"), site: site("petra") });
  assert.equal(petra.length, 2);
});

test("panelde marka taraması yapılmaz; adres denetimi yapılır", () => {
  const html = page('<link rel="canonical" href="https://www.t46store.com/login"/>', "<p>Müşteriler: Petra Mühendislik, Taktikalp46</p>");
  const findings = analyzePage({ url: "https://mb-digital-boost-web-panel.vercel.app/login", html, site: site("panel") });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, "adres");
  assert.match(findings[0].detail, /taktikalp46/);
});

test("canonical / og:url / og:image / link / script: başka site, yabancı origin ve izinsiz adres", () => {
  const html = page(
    [
      '<link rel="canonical" href="https://t46store.com/urun/x"/>',
      '<meta property="og:url" content="https://www.petramuhendislik.com/x"/>',
      '<meta property="og:image" content="https://cdn.ornek-olmayan.example/a.png"/>',
      '<script src="//kotu.example/x.js"></script>',
      '<meta property="og:image" content="https://abc.supabase.co/storage/v1/object/public/media/a.jpg"/>',
    ].join(""),
  );
  const details = analyzePage({ url: "https://www.t46store.com/urun/x", html, site: site("taktikalp46") })
    .filter((finding) => finding.kind === "adres")
    .map((finding) => finding.detail);
  assert.equal(details.length, 4);
  assert.ok(details.some((detail) => detail.startsWith("canonical kendi origin'ini")), "www'siz canonical kendi origin'i değildir");
  assert.ok(details.some((detail) => detail.startsWith('og:url "petra" sitesini gösteriyor')));
  assert.ok(details.some((detail) => detail.startsWith("og:image izinli olmayan")));
  assert.ok(details.some((detail) => detail.startsWith("script izinli olmayan") && detail.includes("https://kotu.example/x.js")));

  assert.deepEqual(extractAbsoluteReferences('<link rel="icon" href="/favicon.ico"/><script src="/a.js"></script>'), []);
});

test("robots.txt ve sitemap.xml kendi origin'ini göstermeli", () => {
  const taktikalp = site("taktikalp46");
  assert.deepEqual(analyzeRobots({ url: "r", robots: "User-agent: *\nAllow: /\nSitemap: https://www.t46store.com/sitemap.xml\n", site: taktikalp }), []);
  assert.equal(analyzeRobots({ url: "r", robots: "sitemap: https://www.petramuhendislik.com/sitemap.xml", site: taktikalp }).length, 1);

  const xml = "<urlset><url><loc>https://www.t46store.com/</loc></url><url><loc>https://www.t46store.com/urun/a&amp;b</loc></url><url><loc>https://www.petramuhendislik.com/hizmetler</loc></url></urlset>";
  const { pages, findings } = analyzeSitemap({ url: "s", xml, site: taktikalp });
  assert.deepEqual(pages, ["https://www.t46store.com/", "https://www.t46store.com/urun/a&b"]);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, "sitemap");
});
