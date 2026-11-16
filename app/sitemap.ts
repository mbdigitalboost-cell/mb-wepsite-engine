import type { MetadataRoute } from "next";
import { getCurrentSite } from "@/lib/sites/current";
import { buildPetraSitemap } from "@/lib/sites/petra-sitemap";
import { buildStoreSitemap } from "@/lib/sites/store-sitemap";
import { getStoreSitemapRecords } from "@/lib/commerce/public/sitemap-data";

/**
 * Faz 28 — sitemap SİTEYE GÖRE (önceden her deploy'da Petra rotaları,
 * mağaza projesinde hepsi http://localhost:3000/...).
 *  - store: DB'den mağaza ana sayfası, /kategoriler, aktif kategoriler,
 *    aktif ürünler, ürünü olan markalar (lib/sites/store-sitemap.ts).
 *  - corporate (petra): bugünkü üretici aynen, canonicalOrigin ile.
 *  - panel: boş (indekslenecek sayfası yok; robots her şeyi kapatır).
 * Saatlik yenilenir: yeni ürün sitemap'e redeploy beklemeden girer.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getCurrentSite();

  if (site.kind === "store" && site.storeSlug) {
    // Veri okunamazsa (ör. env'siz yerel build) sitemap yine üretilir —
    // ana sayfa + /kategoriler — ve saatlik yenilemede tamamlanır.
    const records = await getStoreSitemapRecords(site.storeSlug).catch((error: unknown) => {
      console.error("[sitemap] store records unavailable:", error instanceof Error ? error.message : error);
      return null;
    });
    return buildStoreSitemap({
      canonicalOrigin: site.canonicalOrigin,
      storeSlug: site.storeSlug,
      categories: records?.categories ?? [],
      products: records?.products ?? [],
      brands: records?.brands ?? [],
      legalPaths: records?.legalPaths ?? [],
    });
  }

  if (site.kind === "corporate" && site.key === "petra") return buildPetraSitemap(site.canonicalOrigin);

  return [];
}
