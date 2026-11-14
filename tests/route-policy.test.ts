import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { findSite, type SiteDefinition } from "../lib/sites/registry.ts";
import { API_ROUTE_OWNERS, decideRoute, type RouteDecision } from "../lib/sites/route-policy.ts";

/**
 * Faz 28 — "her Vercel projesi = tek site" kuralının matrisi. Bir site
 * eklendiğinde ya da bir yol politikası değiştiğinde buraya satır ekleyin;
 * kural bir sonraki sitede kendiliğinden bozulmasın.
 */
function site(key: string): SiteDefinition {
  const found = findSite(key);
  assert.ok(found, key);
  return found;
}

const PANEL = "https://mb-digital-boost-web-panel.vercel.app";
const T46 = "https://www.t46store.com";

const next: RouteDecision = { type: "next" };
const redirect = (target: string, status: 307 | 308): RouteDecision => ({ type: "redirect", target, status });
const t46NotFound: RouteDecision = { type: "notFound", rewriteTo: "/store/taktikalp46/__404" };
const rootNotFound: RouteDecision = { type: "notFound", rewriteTo: "/__404" };
const rewrite = (target: string): RouteDecision => ({ type: "rewrite", target });

const MATRIX: Array<[string, string, RouteDecision]> = [
  // panel
  ["panel", "/", redirect("/login", 307)],
  ["panel", "/dashboard", next],
  ["panel", "/dashboard/customers/x", next],
  ["panel", "/login", next],
  ["panel", "/mfa-challenge", next],
  ["panel", "/auth/callback", next],
  ["panel", "/auth/set-password", next],
  ["panel", "/iletisim", redirect("/login", 307)],
  // Faz 29 — panelden mağazanın TEMİZ adresine tek 308.
  ["panel", "/store/taktikalp46", redirect(`${T46}/`, 308)],
  ["panel", "/store/taktikalp46/urun/x", redirect(`${T46}/urun/x`, 308)],
  ["panel", "/store/baska-magaza", rootNotFound],
  ["panel", "/api/webhooks/basit-kargo", next],
  ["panel", "/api/webhooks/iyzico", next],
  ["panel", "/api/health/supabase", next],
  ["panel", "/api/forms/discovery-request", rootNotFound],
  ["panel", "/api/payments/iyzico/callback", rootNotFound],
  ["panel", "/robots.txt", next],
  ["panel", "/sitemap.xml", next],
  // taktikalp46 (store)
  // Faz 29 — temiz adresler içeride /store/taktikalp46/...'e rewrite.
  ["taktikalp46", "/", rewrite("/store/taktikalp46")],
  ["taktikalp46", "/urun/canik", rewrite("/store/taktikalp46/urun/canik")],
  ["taktikalp46", "/kategoriler", rewrite("/store/taktikalp46/kategoriler")],
  ["taktikalp46", "/kategori/kampanyali-urunler", rewrite("/store/taktikalp46/kategori/kampanyali-urunler")],
  ["taktikalp46", "/silahini-sec/canik", rewrite("/store/taktikalp46/silahini-sec/canik")],
  ["taktikalp46", "/sepet", rewrite("/store/taktikalp46/sepet")],
  ["taktikalp46", "/odeme/abc", rewrite("/store/taktikalp46/odeme/abc")],
  ["taktikalp46", "/hesap/giris", rewrite("/store/taktikalp46/hesap/giris")],
  ["taktikalp46", "/siparislerim", rewrite("/store/taktikalp46/siparislerim")],
  // Faz 29 Kısım C — paylaşım görselleri de temiz adreste.
  ["taktikalp46", "/paylasim/urun/canik", rewrite("/store/taktikalp46/paylasim/urun/canik")],
  // Eski /store/<kendi slug'ı> adresleri → temiz adrese kalıcı.
  ["taktikalp46", "/store/taktikalp46", redirect("/", 308)],
  ["taktikalp46", "/store/taktikalp46/kategoriler", redirect("/kategoriler", 308)],
  ["taktikalp46", "/store/taktikalp46/urun/canik", redirect("/urun/canik", 308)],
  ["taktikalp46", "/store/taktikalp46/sepet", redirect("/sepet", 308)],
  ["taktikalp46", "/iletisim", t46NotFound],
  ["taktikalp46", "/hakkimizda", t46NotFound],
  ["taktikalp46", "/cozumler/split-klimalar", t46NotFound],
  ["taktikalp46", "/btu-hesaplama", t46NotFound],
  ["taktikalp46", "/kvkk-aydinlatma-metni", t46NotFound],
  ["taktikalp46", "/urunler", t46NotFound],
  ["taktikalp46", "/kategorilerx", t46NotFound],
  ["taktikalp46", "/store", t46NotFound],
  ["taktikalp46", "/store/baska-magaza", t46NotFound],
  ["taktikalp46", "/store/taktikalp46x", t46NotFound],
  ["taktikalp46", "/dashboard", redirect(`${PANEL}/dashboard`, 308)],
  ["taktikalp46", "/dashboard/customers/a/stores/b", redirect(`${PANEL}/dashboard/customers/a/stores/b`, 308)],
  ["taktikalp46", "/login", redirect(`${PANEL}/login`, 308)],
  ["taktikalp46", "/mfa-challenge", redirect(`${PANEL}/mfa-challenge`, 308)],
  ["taktikalp46", "/auth/set-password", redirect(`${PANEL}/auth/set-password`, 308)],
  ["taktikalp46", "/auth/callback", next],
  ["taktikalp46", "/api/webhooks/basit-kargo", next],
  ["taktikalp46", "/api/webhooks/iyzico", next],
  ["taktikalp46", "/api/payments/iyzico/callback", next],
  ["taktikalp46", "/api/forms/discovery-request", t46NotFound],
  ["taktikalp46", "/api/revalidate", t46NotFound],
  ["taktikalp46", "/api/health/supabase", t46NotFound],
  ["taktikalp46", "/api/bilinmeyen", t46NotFound],
  ["taktikalp46", "/robots.txt", next],
  ["taktikalp46", "/sitemap.xml", next],
  ["taktikalp46", "/favicon.ico", next],
  ["taktikalp46", "/_next/static/chunks/a.js", next],
  ["taktikalp46", "/images/taktikalp46/logo.png", next],
  ["taktikalp46", "/fonts/x.woff2", next],
  // petra (corporate) — ileride main'e taşınırsa
  ["petra", "/", next],
  ["petra", "/iletisim", next],
  ["petra", "/cozumler/split-klimalar", next],
  ["petra", "/store/taktikalp46", rootNotFound],
  ["petra", "/dashboard", redirect(`${PANEL}/dashboard`, 308)],
  ["petra", "/api/forms/discovery-request", next],
  ["petra", "/api/revalidate", next],
  ["petra", "/api/webhooks/basit-kargo", rootNotFound],
];

for (const [key, pathname, expected] of MATRIX) {
  test(`${key} ${pathname}`, () => {
    assert.deepEqual(decideRoute({ site: site(key), pathname }), expected);
  });
}

test("every app/api route has an owner in API_ROUTE_OWNERS (and vice versa)", () => {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry === "route.ts") found.push("/" + dir.split("\\").join("/").replace(/^app\//, ""));
    }
  };
  walk("app/api");
  assert.deepEqual(found.sort(), Object.keys(API_ROUTE_OWNERS).sort());
});
