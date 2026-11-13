/**
 * Faz 24 — mağazaya özel marka varlıkları (favicon + logo) için TEK kaynak.
 *
 * Çözüm sırası (çok kiracılı doğru yol önce):
 *   1. store_profiles.logo_url / favicon_url — admin Mağaza → Profil
 *      sayfasındaki dosya yükleme (store-branding bucket, Faz 10). Biri
 *      yüklendiği an bu dosyadaki repo yedeği devreden çıkar.
 *   2. Repo yedeği (public/images/<slug>/…) — bucket bugün boş ve iki kolon
 *      NULL olduğu için Taktikalp46'nın favicon/logo'su buradan geliyor.
 *      Başka bir mağaza burada yoksa null → kök app/favicon.ico (panelin
 *      kendi ikonu) devralınır, eski davranış aynen.
 *
 * KÖK app/favicon.ico / icon.png / apple-icon.png BİLEREK DEĞİŞMEDİ: aynı
 * repo panel (mb-digital-boost-web-panel) ve Petra olarak da deploy oluyor;
 * mağaza ikonu yalnızca app/store/[storeSlug]/layout.tsx'in generateMetadata
 * `icons` alanıyla, yalnızca /store/** altında veriliyor.
 */

export interface StoreBrandFallback {
  favicon: string;
  icon: string;
  icon192: string;
  appleIcon: string;
  /** Şeffaf, beyaz/bordo — koyu zemin için. 219×160 (1x), 439×320 (2x). */
  logo: string;
  logoWidth: number;
  logoHeight: number;
}

const STORE_BRAND_FALLBACKS: Record<string, StoreBrandFallback> = {
  taktikalp46: {
    favicon: "/images/taktikalp46/favicon.ico",
    icon: "/images/taktikalp46/icon.png",
    icon192: "/images/taktikalp46/icon-192.png",
    appleIcon: "/images/taktikalp46/apple-icon.png",
    logo: "/images/taktikalp46/taktikalp46-logo@2x.png",
    logoWidth: 219,
    logoHeight: 160,
  },
};

export function getStoreBrandFallback(storeSlug: string): StoreBrandFallback | null {
  return STORE_BRAND_FALLBACKS[storeSlug] ?? null;
}

/** Header/footer logosu: önce DB (admin yüklemesi), yoksa repo yedeği, yoksa null (metin gösterilir). */
export function resolveStoreLogoUrl(storeSlug: string, profileLogoUrl: string | null | undefined): string | null {
  return profileLogoUrl || getStoreBrandFallback(storeSlug)?.logo || null;
}
