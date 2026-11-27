import { findLeakTokens } from "./leak-tokens.ts";
import { SITES, normalizeOrigin, type SiteDefinition } from "./registry.ts";

/**
 * Faz 38 — CANLI SIZINTI TARAMASININ saf mantığı (ağ yok;
 * scripts/check-live-leaks.mjs sayfaları indirip buraya verir).
 * Kural: SITE_IZOLASYON.md §2.10.
 *
 * Bir sitenin canlı sayfasında:
 *  - başka sitelerin sızıntı ifadesi (ad, alan adı, telefon, e-posta) geçmemeli
 *    (panelde uygulanmaz: panel bütün müşterileri listeler);
 *  - canonical, og:url ve og:image mutlak adresleri kendi origin'ini göstermeli
 *    (og:image izinli depolama/CDN'de de olabilir);
 *  - <link href> ve <script src> mutlak adresleri kendi origin'ini ya da
 *    izinli bir servisi göstermeli;
 *  - robots.txt'teki Sitemap satırı kendi origin'ini göstermeli.
 */

export type LiveFindingKind = "ifade" | "adres" | "robots" | "sitemap" | "erişim";

export interface LiveFinding {
  kind: LiveFindingKind;
  /** Bulgunun görüldüğü sayfa. */
  url: string;
  detail: string;
}

/**
 * Bir sitenin sayfasında görülebilecek, başka bir müşteriye ait OLMAYAN dış
 * servisler: Supabase depolama (ürün/içerik görselleri), Vercel'in kendi
 * betikleri ve mağaza/site ayarından açılan takip araçları. Liste bilerek
 * dar; yeni bir servis eklenince buraya gerekçesiyle yazılır.
 */
export const ALLOWED_EXTERNAL_HOST_SUFFIXES: readonly string[] = [
  "supabase.co",
  "vercel-scripts.com",
  "vercel-insights.com",
  "vercel.live",
  "googletagmanager.com",
  "google-analytics.com",
  "connect.facebook.net",
];

function hostOf(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

function isAllowedExternalHost(host: string): boolean {
  return ALLOWED_EXTERNAL_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(tag);
  return match ? decodeEntities(match[2] ?? match[3] ?? "") : null;
}

function tags(html: string, name: string): string[] {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) ?? [];
}

/** sitemap.xml → <loc> adresleri. */
export function extractSitemapUrls(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) => decodeEntities(match[1]));
}

/** robots.txt → Sitemap: satırlarındaki adresler. */
export function extractRobotsSitemaps(robots: string): string[] {
  return [...robots.matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)].map((match) => match[1]);
}

export interface AbsoluteReference {
  /** Nerede görüldü: "canonical", "og:url", "og:image", "link", "script". */
  where: string;
  url: string;
}

/** Sayfadaki denetlenecek MUTLAK adresler (göreli adresler kendi origin'indedir, atlanır). */
export function extractAbsoluteReferences(html: string): AbsoluteReference[] {
  const references: AbsoluteReference[] = [];
  const push = (where: string, url: string | null) => {
    if (url && /^(https?:)?\/\//i.test(url)) references.push({ where, url: url.startsWith("//") ? `https:${url}` : url });
  };
  for (const tag of tags(html, "link")) {
    const rel = (attribute(tag, "rel") ?? "").toLowerCase();
    push(rel === "canonical" ? "canonical" : "link", attribute(tag, "href"));
  }
  for (const tag of tags(html, "meta")) {
    const property = (attribute(tag, "property") ?? "").toLowerCase();
    if (property === "og:url" || property === "og:image") push(property, attribute(tag, "content"));
  }
  for (const tag of tags(html, "script")) push("script", attribute(tag, "src"));
  return references;
}

export function analyzePage(input: { url: string; html: string; site: SiteDefinition; sites?: readonly SiteDefinition[] }): LiveFinding[] {
  const sites = input.sites ?? SITES;
  const { site, url, html } = input;
  const findings: LiveFinding[] = [];
  const ownHost = hostOf(site.canonicalOrigin);
  const others = sites.filter((candidate) => candidate.key !== site.key);

  if (site.kind !== "panel") {
    const counts = new Map<string, number>();
    for (const hit of findLeakTokens(html, others)) {
      const key = `${hit.siteKey}|${hit.token}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [key, count] of counts) {
      const [siteKey, token] = key.split("|");
      findings.push({ kind: "ifade", url, detail: `"${siteKey}" sitesinin ifadesi "${token}" ${count} kez geçiyor` });
    }
  }

  for (const reference of extractAbsoluteReferences(html)) {
    const host = hostOf(reference.url);
    if (!host || host === ownHost) continue;
    const otherSite = others.find((candidate) => hostOf(candidate.canonicalOrigin) === host);
    const mustBeOwn = reference.where === "canonical" || reference.where === "og:url";
    if (otherSite) {
      findings.push({ kind: "adres", url, detail: `${reference.where} "${otherSite.key}" sitesini gösteriyor: ${reference.url}` });
    } else if (mustBeOwn) {
      findings.push({ kind: "adres", url, detail: `${reference.where} kendi origin'ini (${site.canonicalOrigin}) göstermiyor: ${reference.url}` });
    } else if (!isAllowedExternalHost(host)) {
      findings.push({ kind: "adres", url, detail: `${reference.where} izinli olmayan bir adresi gösteriyor: ${reference.url}` });
    }
  }
  return findings;
}

export function analyzeRobots(input: { url: string; robots: string; site: SiteDefinition }): LiveFinding[] {
  const origin = normalizeOrigin(input.site.canonicalOrigin);
  return extractRobotsSitemaps(input.robots)
    .filter((sitemap) => !sitemap.startsWith(`${origin}/`))
    .map((sitemap) => ({ kind: "robots" as const, url: input.url, detail: `Sitemap satırı kendi origin'ini (${origin}) göstermiyor: ${sitemap}` }));
}

/** Sitemap'teki adresler kendi origin'inde olmalı; origin dışındakiler bulgu olur ve taranmaz. */
export function analyzeSitemap(input: { url: string; xml: string; site: SiteDefinition }): { pages: string[]; findings: LiveFinding[] } {
  const origin = normalizeOrigin(input.site.canonicalOrigin);
  const pages: string[] = [];
  const findings: LiveFinding[] = [];
  for (const loc of extractSitemapUrls(input.xml)) {
    if (loc === origin || loc.startsWith(`${origin}/`)) pages.push(loc);
    else findings.push({ kind: "sitemap", url: input.url, detail: `sitemap kendi origin'i (${origin}) dışında bir adres içeriyor: ${loc}` });
  }
  return { pages: [...new Set(pages)], findings };
}
