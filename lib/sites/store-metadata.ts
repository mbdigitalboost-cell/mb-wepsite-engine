import type { Metadata } from "next";
import { findStoreSiteBySlug } from "@/lib/sites/registry";

/**
 * Faz 28 — mağaza sayfalarının canonical + Open Graph url'i. Adres, o
 * mağazanın registry'deki canonicalOrigin'i ile MUTLAK yazılır
 * (https://www.t46store.com/store/taktikalp46/...) — aynı mağaza panel
 * domaininden açılsa bile (panel artık 308'liyor) canonical tek adresi
 * gösterir. Registry'de olmayan bir mağaza için metadataBase'e göre göreli
 * yol kalır.
 *
 * OG görseli BİLEREK yok: ürün görselleri özel bucket'tan 1 saatlik imzalı
 * URL ile geliyor; paylaşım önizlemesine süresi dolan adres koymak yerine
 * ayrı bir fazda kalıcı bir OG görseli üretilmeli.
 */
export function buildStorePageMetadata(input: {
  storeSlug: string;
  /** "/store/<slug>" sonrası yol: "" (ana sayfa), "/kategoriler", "/urun/x" ... */
  path: string;
  storeName?: string;
  title?: string;
  description?: string | null;
}): Metadata {
  const site = findStoreSiteBySlug(input.storeSlug);
  const relative = `/store/${input.storeSlug}${input.path}`;
  const url = site ? `${site.canonicalOrigin}${relative}` : relative;
  const siteName = input.storeName ?? site?.displayName;
  // Admin'in SEO başlığı zaten mağaza adını içeriyorsa ("… | Taktikalp46") tekrar eklenmez.
  const fullTitle =
    input.title && siteName && !input.title.toLocaleLowerCase("tr").includes(siteName.toLocaleLowerCase("tr"))
      ? `${input.title} | ${siteName}`
      : input.title;
  const description = input.description?.trim() || undefined;

  return {
    ...(fullTitle ? { title: { absolute: fullTitle } } : {}),
    ...(description ? { description } : {}),
    alternates: { canonical: url },
    openGraph: {
      url,
      type: "website",
      locale: "tr_TR",
      ...(siteName ? { siteName } : {}),
      ...(fullTitle ? { title: fullTitle } : {}),
      ...(description ? { description } : {}),
    },
  };
}
