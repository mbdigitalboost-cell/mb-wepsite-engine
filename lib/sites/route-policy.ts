/**
 * Faz 28 — YOL POLİTİKASI: VARSAYILAN KAPALI.
 *
 * proxy.ts kararı burada verir, sadece uygular. Saf fonksiyon (import yalnız
 * registry; Next/Supabase yok) → tests/route-policy.test.ts ile matris
 * halinde sabitlenir. Bir sitenin domaininde yalnız O sitenin rotaları,
 * O sitenin sahip olduğu API'ler ve ortak statik dosyalar açıktır; geri
 * kalan her şey ya o sitenin markalı 404'üne düşer ya da (admin yolları,
 * başka sitenin mağazası) sahibi olan sitenin domainine 308 ile gider.
 *
 * Faz 11 notu (bkz. proxy.ts): bu kararlar next.config.ts redirects()'e
 * TAŞINMAMALI — o katman proxy'den ÖNCE ve site-kör çalışır.
 */
import { findStoreSiteBySlug, getPanelSite, storeBasePath, type SiteDefinition, type SiteKind } from "./registry.ts";
import { cleanToInternal, internalToClean, isCleanStorePath } from "./store-paths.ts";

export type RouteDecision =
  | { type: "next" }
  /** status 307: aynı site içi yönlendirme (bugünkü / davranışları); 308: kalıcı, siteler arası. */
  | { type: "redirect"; target: string; status: 307 | 308 }
  | { type: "rewrite"; target: string }
  /** HTTP 404. `rewriteTo`: o sitenin markalı 404'ünü üreten iç yol. */
  | { type: "notFound"; rewriteTo: string };

/** Her sitede açık: Next içi dosyalar, public/ statikleri, robots/sitemap, ikonlar. */
const SHARED_PREFIXES = ["/_next", "/_vercel", "/.well-known", "/images", "/fonts", "/videos"];
const SHARED_EXACT = new Set(["/robots.txt", "/sitemap.xml", "/favicon.ico", "/icon.png", "/apple-icon.png"]);

/** Yalnız panelde çalışan admin yolları; başka sitede panele 308. */
const ADMIN_PREFIXES = ["/dashboard", "/login", "/mfa-challenge", "/auth/set-password"];

/**
 * /api envanteri (app/api/**) — her route'un sahibi. Listede olmayan bir
 * /api yolu hiçbir sitede açılmaz (yeni bir API eklerken buraya satır ekle;
 * tests/route-policy.test.ts bunu app/api ile karşılaştırır).
 *
 *  - webhooks/basit-kargo, webhooks/iyzico: mağazayı imza/secret'tan çözer;
 *    admin "Kargo"/"Ödeme" ayarları webhook adresini panel domaininden
 *    gösterir (store-*-integration.ts → publicEnv.siteUrl) → panel + mağaza.
 *  - payments/iyzico/callback: ödeme, müşterinin alışveriş yaptığı host'a
 *    döner (resolveRequestBaseUrl) → yalnız mağaza.
 *  - health/supabase: iç teşhis → yalnız panel.
 *  - forms/discovery-request: Petra keşif formu → yalnız kurumsal (Petra).
 *  - revalidate: panelin kurumsal sitelere attığı imzalı POST'un alıcısı
 *    (lib/cms/dashboard/trigger-revalidation.ts) → yalnız kurumsal.
 */
export const API_ROUTE_OWNERS: Record<string, readonly SiteKind[]> = {
  "/api/webhooks/basit-kargo": ["panel", "store"],
  "/api/webhooks/iyzico": ["panel", "store"],
  "/api/payments/iyzico/callback": ["store"],
  "/api/health/supabase": ["panel"],
  "/api/forms/discovery-request": ["corporate"],
  "/api/revalidate": ["corporate"],
};

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isSharedPath(pathname: string): boolean {
  return SHARED_EXACT.has(pathname) || SHARED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

function apiOwners(pathname: string): readonly SiteKind[] | null {
  for (const [route, owners] of Object.entries(API_ROUTE_OWNERS)) {
    if (matchesPrefix(pathname, route)) return owners;
  }
  return null;
}

/** /store/<slug>/... → slug (yoksa null). */
function storeSlugOf(pathname: string): string | null {
  if (!matchesPrefix(pathname, "/store")) return null;
  const slug = pathname.split("/")[2];
  return slug ? slug : null;
}

/** Bir sitenin markalı 404'ünü üreten iç yol. Mağaza: kendi segmentindeki catch-all (app/store/[storeSlug]/[...unknownPath]). */
export function notFoundRewriteFor(site: SiteDefinition): string {
  const base = storeBasePath(site);
  return base ? `${base}/__404` : "/__404";
}

function notFound(site: SiteDefinition): RouteDecision {
  return { type: "notFound", rewriteTo: notFoundRewriteFor(site) };
}

function crossSite(origin: string, pathname: string): RouteDecision {
  return { type: "redirect", target: `${origin}${pathname}`, status: 308 };
}

export function decideRoute({ site, pathname }: { site: SiteDefinition; pathname: string }): RouteDecision {
  if (isSharedPath(pathname)) return { type: "next" };

  if (matchesPrefix(pathname, "/api")) {
    const owners = apiOwners(pathname);
    return owners?.includes(site.kind) ? { type: "next" } : notFound(site);
  }

  if (site.kind === "panel") {
    if (isAdminPath(pathname) || matchesPrefix(pathname, "/auth")) return { type: "next" };
    const slug = storeSlugOf(pathname);
    if (slug !== null || pathname === "/store") {
      const owner = slug ? findStoreSiteBySlug(slug) : undefined;
      // Faz 29 — doğrudan mağazanın TEMİZ adresine (tek 308, zincir yok).
      const clean = owner && slug ? internalToClean(slug, pathname) : null;
      return owner && clean ? crossSite(owner.canonicalOrigin, clean) : notFound(site);
    }
    // Bugünkü PANEL_ONLY_MODE davranışı: kök dahil her şey /login.
    return { type: "redirect", target: "/login", status: 307 };
  }

  if (isAdminPath(pathname)) return crossSite(getPanelSite().canonicalOrigin, pathname);

  if (site.kind === "store") {
    const base = storeBasePath(site);
    if (!base || !site.storeSlug) return notFound(site);
    // Faz 29 — TEMİZ ADRESLER: ziyaretçi /urun/x görür, içeride
    // /store/<slug>/urun/x render edilir (lib/sites/store-paths.ts).
    if (isCleanStorePath(pathname)) return { type: "rewrite", target: cleanToInternal(site.storeSlug, pathname) };
    // Eski /store/<kendi slug'ı>/... adresleri (yer imleri, Google, paylaşılmış linkler) → temiz adrese kalıcı.
    const clean = internalToClean(site.storeSlug, pathname);
    if (clean) return { type: "redirect", target: clean, status: 308 };
    // Müşteri şifre sıfırlama e-postası buraya döner
    // (app/store/[storeSlug]/hesap/sifremi-unuttum/actions.ts → /auth/callback?next=/hesap/sifre-guncelle).
    if (pathname === "/auth/callback") return { type: "next" };
    return notFound(site);
  }

  // corporate: kendi kök rotaları açık; başka sitelerin mağazaları kapalı.
  if (matchesPrefix(pathname, "/store")) return notFound(site);
  return { type: "next" };
}
