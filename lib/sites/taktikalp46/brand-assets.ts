import type { StoreBrandFallback } from "@/lib/commerce/public/storefront-showcase-types";

/**
 * Taktikalp46'nın repo'daki yedek marka dosyaları (Faz 24; Faz 39 Adım 2.5'te
 * ortak motordaki slug haritasından buraya taşındı — değerler aynı).
 * Admin → Profil'den logo/favicon yüklendiği an bu yedek devreden çıkar.
 * Logo şeffaf, beyaz/bordo — koyu zemin için. 219×160 (1x), 439×320 (2x).
 */
export const brandFallback: StoreBrandFallback = {
  favicon: "/images/taktikalp46/favicon.ico",
  icon: "/images/taktikalp46/icon.png",
  icon192: "/images/taktikalp46/icon-192.png",
  appleIcon: "/images/taktikalp46/apple-icon.png",
  logo: "/images/taktikalp46/taktikalp46-logo@2x.png",
  logoWidth: 219,
  logoHeight: 160,
};
