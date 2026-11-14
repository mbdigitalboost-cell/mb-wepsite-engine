/**
 * Faz 28 — SİTE KAYDI (tek doğruluk kaynağı).
 *
 * İlke (kullanıcı, 2026-11-14): "Yaptığımız yer bir ama yapılan işler hep
 * farklı; hiçbir site birbirine bağlı kalmayacak." Tek repo + tek platform
 * Supabase'i + HER SİTE İÇİN AYRI VERCEL PROJESİ. Her Vercel projesi
 * `SITE_KEY` env'i ile hangi siteyi sunduğunu söyler; proxy.ts'teki yol
 * politikası (lib/sites/route-policy.ts), 404 / sitemap / robots ve
 * metadataBase bu kayıttan okunur. Bir sitenin domaininde başka bir sitenin
 * sayfası, markası, 404'ü, sitemap kaydı ya da API'si GÖRÜNMEZ — varsayılan
 * kapalıdır (allowlist).
 *
 * Bu dosya BİLEREK saf TypeScript'tir (import yok, "server-only" yok,
 * enum yok): proxy, sunucu bileşenleri, `node --test` birim testleri ve
 * scripts/check-site-env.mjs (prebuild) aynı dosyayı okur.
 *
 * Yeni site eklemek: docs/YENI_SITE_EKLEME.md.
 */

export type SiteKind = "panel" | "store" | "corporate";

export interface SiteDefinition {
  /** Vercel projesindeki SITE_KEY değeri. Küçük harf, benzersiz. */
  key: string;
  kind: SiteKind;
  displayName: string;
  /** https://… — sonda "/" YOK. sitemap, robots, canonical, metadataBase ve siteler arası 308'ler bunu kullanır. */
  canonicalOrigin: string;
  /** Yalnız kind "store": stores.slug. Mağaza /store/<storeSlug>/** altında sunulur. */
  storeSlug?: string;
}

export const SITES: readonly SiteDefinition[] = [
  {
    key: "panel",
    kind: "panel",
    displayName: "MB Digital Boost",
    canonicalOrigin: "https://mb-digital-boost-web-panel.vercel.app",
  },
  {
    key: "taktikalp46",
    kind: "store",
    displayName: "Taktikalp46",
    canonicalOrigin: "https://www.t46store.com",
    storeSlug: "taktikalp46",
  },
  {
    // Petra'nın GERÇEK production'ı ayrı, dondurulmuş `petra-production`
    // dalından deploy edilir ve bu kodu İÇERMEZ. Bu kayıt yalnız Petra
    // ileride main'e taşındığında kullanılmak üzere; bugün hiçbir Vercel
    // projesinde SITE_KEY=petra yok, Petra production'ını etkilemez.
    key: "petra",
    kind: "corporate",
    displayName: "Petra Mühendislik",
    canonicalOrigin: "https://www.petramuhendislik.com",
  },
];

export const PANEL_SITE_KEY = "panel";

/**
 * GEÇİŞ DÖNEMİ: Faz 28 öncesi deploy'larda SITE_KEY yoktu; panel
 * PANEL_ONLY_MODE=true ile, mağaza ise "PANEL_ONLY_MODE değil" ile
 * anlaşılıyordu. SITE_KEY yoksa bu varsayılanlar kullanılır. Vercel'de
 * build zaten SITE_KEY'siz DURUR (scripts/check-site-env.mjs); bu yedek
 * yalnız yerel geliştirme içindir ve tüm projeler SITE_KEY aldıktan sonra
 * PANEL_ONLY_MODE ile birlikte kaldırılabilir.
 */
export const LEGACY_DEFAULT_SITE_KEY = "taktikalp46";

export function findSite(key: string | undefined | null): SiteDefinition | undefined {
  if (!key) return undefined;
  const normalized = key.trim().toLowerCase();
  return SITES.find((site) => site.key === normalized);
}

export function findStoreSiteBySlug(storeSlug: string): SiteDefinition | undefined {
  return SITES.find((site) => site.kind === "store" && site.storeSlug === storeSlug);
}

export function getPanelSite(): SiteDefinition {
  const panel = findSite(PANEL_SITE_KEY);
  if (!panel) throw new Error("[sites] registry has no panel site");
  return panel;
}

export interface SiteResolution {
  site: SiteDefinition;
  /** true: SITE_KEY ile açıkça seçildi. false: geçiş dönemi yedeği (PANEL_ONLY_MODE / varsayılan). */
  explicit: boolean;
}

/**
 * SITE_KEY → kayıt. Bilinmeyen bir SITE_KEY yedeğe DÜŞMEZ, hata fırlatır:
 * yanlış yazılmış bir anahtarın sessizce başka bir siteyi sunması, bu
 * fazın önlemek istediği hatanın ta kendisi.
 */
export function resolveSite(input: { siteKey?: string | null; panelOnlyMode?: boolean }): SiteResolution {
  const rawKey = input.siteKey?.trim();
  if (rawKey) {
    const site = findSite(rawKey);
    if (!site) {
      throw new Error(`[sites] SITE_KEY="${rawKey}" registry'de yok (lib/sites/registry.ts). Geçerli anahtarlar: ${SITES.map((s) => s.key).join(", ")}`);
    }
    return { site, explicit: true };
  }
  const fallbackKey = input.panelOnlyMode ? PANEL_SITE_KEY : LEGACY_DEFAULT_SITE_KEY;
  const site = findSite(fallbackKey);
  if (!site) throw new Error(`[sites] legacy fallback site "${fallbackKey}" missing from registry`);
  return { site, explicit: false };
}

/** "https://x.com/" → "https://x.com" (karşılaştırma ve birleştirme için). */
export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

/** Mağaza sitesinin kendi kök yolu: "/store/<slug>". Mağaza değilse null. */
export function storeBasePath(site: SiteDefinition): string | null {
  return site.kind === "store" && site.storeSlug ? `/store/${site.storeSlug}` : null;
}
