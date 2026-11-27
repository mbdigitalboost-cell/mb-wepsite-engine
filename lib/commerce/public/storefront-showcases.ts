import type { StorefrontShowcase } from "@/lib/commerce/public/storefront-showcase-types";
import { showcase as firstStoreShowcase } from "@/lib/sites/taktikalp46/showcase";

/**
 * Faz 39 Adım 2.4–2.5 — MAĞAZA VİTRİNİ KAYDI.
 *
 * Ortak mağaza motorunun bir mağazanın özel dosyalarına dokunduğu TEK yer
 * burasıdır (bilinçli, baseline'da gerekçesiyle kayıtlı tek istisna). Motorun
 * geri kalanı mağaza adı, mağazaya özel metin ya da bileşen içermez; yalnız
 * getStorefrontShowcase() sonucunu kullanır.
 *
 * YENİ MAĞAZA: özel bir ana sayfa tasarımı ya da repo'da yedek logosu varsa
 * lib/sites/<siteKey>/showcase.tsx yazar ve aşağıdaki listeye eklenir. Yoksa
 * hiçbir şey eklenmez: mağaza genel ana sayfayı (admin'deki bölümler + ürün
 * listesi) gösterir, logosu admin → Profil'den gelir.
 */
const SHOWCASES: readonly StorefrontShowcase[] = [firstStoreShowcase];

export function getStorefrontShowcase(storeSlug: string): StorefrontShowcase | null {
  return SHOWCASES.find((showcase) => showcase.storeSlug === storeSlug) ?? null;
}
