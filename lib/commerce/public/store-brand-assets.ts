/**
 * Faz 24 — mağazaya özel marka varlıkları (favicon + logo) için TEK kaynak.
 *
 * Çözüm sırası (çok kiracılı doğru yol önce):
 *   1. store_profiles.logo_url / favicon_url — admin Mağaza → Profil
 *      sayfasındaki dosya yükleme (store-branding bucket, Faz 10). Biri
 *      yüklendiği an bu dosyadaki repo yedeği devreden çıkar.
 *   2. Repo yedeği — mağazanın vitrininde (lib/commerce/public/
 *      storefront-showcases.ts → lib/sites/<siteKey>/) tanımlıysa oradan.
 *      Faz 39 Adım 2.5: buradaki slug haritası kaldırıldı; bu dosya artık
 *      hiçbir mağazanın dosya yolunu içermez. Vitrini ya da yedeği olmayan
 *      mağazada null → kök app/favicon.ico (panelin ikonu) devralınır.
 *
 * KÖK app/favicon.ico / icon.png / apple-icon.png BİLEREK DEĞİŞMEDİ: aynı
 * repo panel ve kurumsal site olarak da deploy oluyor; mağaza ikonu yalnızca
 * app/store/[storeSlug]/layout.tsx'in generateMetadata `icons` alanıyla,
 * yalnızca /store/** altında veriliyor.
 */
import { getStorefrontShowcase } from "@/lib/commerce/public/storefront-showcases";
import type { StoreBrandFallback } from "@/lib/commerce/public/storefront-showcase-types";

export type { StoreBrandFallback };

export function getStoreBrandFallback(storeSlug: string): StoreBrandFallback | null {
  return getStorefrontShowcase(storeSlug)?.brandFallback ?? null;
}

/** Header/footer logosu: önce DB (admin yüklemesi), yoksa repo yedeği, yoksa null (metin gösterilir). */
export function resolveStoreLogoUrl(storeSlug: string, profileLogoUrl: string | null | undefined): string | null {
  return profileLogoUrl || getStoreBrandFallback(storeSlug)?.logo || null;
}
