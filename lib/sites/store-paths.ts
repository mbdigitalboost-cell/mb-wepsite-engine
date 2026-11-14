/**
 * Faz 29 Kısım B — TEMİZ MAĞAZA ADRESLERİ (saf; tests/store-paths.test.ts).
 *
 * Mağaza sitesinde (ör. SITE_KEY=taktikalp46 → www.t46store.com) ziyaretçi
 * `/urun/x`, `/kategori/y`, `/sepet` görür; `/store/taktikalp46/...` yalnız
 * İÇ yoldur (gerçek Next route'u: app/store/[storeSlug]/**). proxy.ts temiz
 * yolu iç yola rewrite eder, eski `/store/<slug>/...` adreslerini temize 308'ler
 * (lib/sites/route-policy.ts).
 *
 * `cleanSlug`: bu deploy'un temiz adresle sunduğu mağaza (build'de
 * next.config.ts → NEXT_PUBLIC_CLEAN_STORE_SLUG). Başka bir mağaza (ya da
 * temiz adres olmayan bir deploy) için iç yol aynen döner.
 *
 * revalidatePath bu yardımcıları KULLANMAZ: önbellek gerçek route'a
 * (`/store/<slug>/...`) bağlıdır.
 */

/** Public adresin öneki: temiz mağazada "" , değilse "/store/<slug>". */
export function storeBaseFor(cleanSlug: string | undefined, storeSlug: string): string {
  return cleanSlug && cleanSlug === storeSlug ? "" : `/store/${storeSlug}`;
}

/** Mağaza içi bir sayfanın public adresi. `path` "/" ile başlar ya da boştur (ana sayfa). */
export function buildStoreHref(cleanSlug: string | undefined, storeSlug: string, path = ""): string {
  const base = storeBaseFor(cleanSlug, storeSlug);
  const normalized = path && !path.startsWith("/") && !path.startsWith("?") && !path.startsWith("#") ? `/${path}` : path;
  const href = `${base}${normalized}`;
  if (!href) return "/";
  if (href.startsWith("?") || href.startsWith("#")) return `/${href}`;
  return href;
}

/** Temiz adres olarak sunulan kök yollar (mağaza sitesinde iç yola rewrite edilir). */
export const CLEAN_STORE_PREFIXES = ["/urun", "/kategori", "/kategoriler", "/silahini-sec", "/sepet", "/odeme", "/hesap", "/siparislerim"] as const;

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** "/" ya da CLEAN_STORE_PREFIXES altında mı? */
export function isCleanStorePath(pathname: string): boolean {
  return pathname === "/" || CLEAN_STORE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

/** Temiz yol → iç yol: "/" → "/store/<slug>", "/urun/x" → "/store/<slug>/urun/x". */
export function cleanToInternal(storeSlug: string, pathname: string): string {
  return pathname === "/" ? `/store/${storeSlug}` : `/store/${storeSlug}${pathname}`;
}

/** İç yol → temiz yol: "/store/<slug>" → "/", "/store/<slug>/urun/x" → "/urun/x". Eşleşmezse null. */
export function internalToClean(storeSlug: string, pathname: string): string | null {
  const base = `/store/${storeSlug}`;
  if (pathname === base || pathname === `${base}/`) return "/";
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length);
  return null;
}
