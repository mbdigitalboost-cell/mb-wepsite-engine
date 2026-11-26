import type { Metadata } from "next";
import { findStoreSiteBySlug } from "@/lib/sites/registry";
import { buildStoreHref } from "@/lib/sites/store-paths";

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
/** Faz 37 — mağaza sayfasının mutlak (kanonik) adresi; JSON-LD breadcrumb ve ürün url'i için. */
export function storePageUrl(storeSlug: string, path: string): string {
  const site = findStoreSiteBySlug(storeSlug);
  return site ? `${site.canonicalOrigin}${buildStoreHref(storeSlug, storeSlug, path)}` : buildStoreHref(undefined, storeSlug, path);
}

export function buildStorePageMetadata(input: {
  storeSlug: string;
  /** "/store/<slug>" sonrası yol: "" (ana sayfa), "/kategoriler", "/urun/x" ... */
  path: string;
  storeName?: string;
  title?: string;
  description?: string | null;
  /**
   * Faz 29 Kısım C — paylaşım görselinin mağaza içi yolu (ör.
   * "/paylasim/urun/x?v=…"). Mutlak, temiz adrese çevrilir; og:image +
   * twitter:card=summary_large_image eklenir.
   */
  imagePath?: string;
  /** Faz 37 — aktif ürünü olmayan kategori gibi sayfalar: noindex (bağlantılar izlenir). */
  noindex?: boolean;
}): Metadata {
  const site = findStoreSiteBySlug(input.storeSlug);
  // Faz 29 — kanonik adres her zaman mağazanın kendi domaininde TEMİZ yol
  // (https://www.t46store.com/urun/x); registry'de sitesi olmayan mağazada
  // iç yol (metadataBase'e göre göreli).
  const url = site
    ? `${site.canonicalOrigin}${buildStoreHref(input.storeSlug, input.storeSlug, input.path)}`
    : buildStoreHref(undefined, input.storeSlug, input.path);
  const siteName = input.storeName ?? site?.displayName;
  // Admin'in SEO başlığı zaten mağaza adını içeriyorsa ("… | Taktikalp46") tekrar eklenmez.
  const fullTitle =
    input.title && siteName && !input.title.toLocaleLowerCase("tr").includes(siteName.toLocaleLowerCase("tr"))
      ? `${input.title} | ${siteName}`
      : input.title;
  const description = input.description?.trim() || undefined;
  const imageUrl = input.imagePath
    ? site
      ? `${site.canonicalOrigin}${buildStoreHref(input.storeSlug, input.storeSlug, input.imagePath)}`
      : buildStoreHref(undefined, input.storeSlug, input.imagePath)
    : null;
  const images = imageUrl ? [{ url: imageUrl, width: 1200, height: 630, type: "image/jpeg", alt: fullTitle ?? siteName ?? "" }] : undefined;

  return {
    ...(input.noindex ? { robots: { index: false, follow: true } } : {}),
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
      ...(images ? { images } : {}),
    },
    ...(images
      ? {
          twitter: {
            card: "summary_large_image" as const,
            ...(fullTitle ? { title: fullTitle } : {}),
            ...(description ? { description } : {}),
            images: [images[0].url],
          },
        }
      : {}),
  };
}

/**
 * Paylaşım görseli adresindeki ?v= değeri: ad/fiyat değişince adres de
 * değişir, böylece WhatsApp/Facebook önbelleği ve CDN eski fiyatı göstermez.
 */
/** Görsel tasarımı değişince artırın: tüm paylaşım adresleri yenilenir (CDN/WhatsApp önbelleği). */
const SHARE_IMAGE_LAYOUT_VERSION = 2;

export function shareImageVersion(...parts: Array<string | number | null | undefined>): string {
  let hash = 5381;
  for (const char of [SHARE_IMAGE_LAYOUT_VERSION, ...parts].map((part) => String(part ?? "")).join("|")) {
    hash = ((hash << 5) + hash + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}
