import type { ReactNode } from "react";
import type { PublicBrandWithCount } from "@/lib/commerce/public/brands";
import type { PublicCategory } from "@/lib/commerce/public/categories";
import type { PublicProduct } from "@/lib/commerce/public/products";

/**
 * Faz 39 Adım 2.4–2.5 — MAĞAZA VİTRİNİ sözleşmesi (yalnız tipler).
 *
 * Ortak mağaza motoru bir mağazanın özel ana sayfa tasarımını ve repo'daki
 * yedek marka dosyalarını BİLMEZ; mağaza bunları kendi klasöründe
 * (lib/sites/<siteKey>/showcase.tsx) bu sözleşmeye uyan bir nesne olarak
 * tanımlar, motor da onu storefront-showcases.ts kaydından okur.
 */

/** Repo'daki yedek marka dosyaları (admin Profil'den logo/favicon yüklenmediyse kullanılır). */
export interface StoreBrandFallback {
  favicon: string;
  icon: string;
  icon192: string;
  appleIcon: string;
  /** Koyu zemin için logo; genişlik/yükseklik 1x ölçüsüdür. */
  logo: string;
  logoWidth: number;
  logoHeight: number;
}

/** Ortak ana sayfanın vitrine verdiği veriler (hepsi mağazanın kendi veritabanı kayıtları). */
export interface StorefrontHomeProps {
  storeSlug: string;
  /** Tüm aktif markalar, gerçek ürün sayılarıyla. */
  brands: PublicBrandWithCount[];
  /** Üst düzey kategoriler. */
  topLevelCategories: PublicCategory[];
  /** İlk ürünler (en fazla 4), birincil görselleriyle. */
  featuredProducts: (PublicProduct & { imageUrl: string | null })[];
  /** Profildeki Instagram adresi; yoksa null. */
  instagramUrl: string | null;
  /** Kargo ayarından türeyen ücretsiz kargo iddiası; yoksa null. */
  freeShippingClaim: string | null;
  returnsEnabled: boolean;
}

export interface StorefrontShowcase {
  /** Bu vitrinin ait olduğu mağazanın slug'ı. */
  storeSlug: string;
  /** Mağazanın özel ana sayfa gövdesi (genel bölümlerin altında gösterilir). */
  Home: (props: StorefrontHomeProps) => ReactNode;
  brandFallback: StoreBrandFallback | null;
}
