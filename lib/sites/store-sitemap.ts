/**
 * Faz 28 — mağaza sitemap'inin SAF üreticisi (tests/store-sitemap.test.ts).
 * Veri lib/commerce/public/sitemap-data.ts'ten gelir (anon/RLS okuması);
 * burada ikinci bir savunma olarak pasif kayıtlar da elenir.
 * Faz 29: adresler TEMİZ — `<canonicalOrigin>/urun/x`, `/kategori/y`
 * (mağaza kendi domaininde temiz adresle sunulur). localhost, başka bir
 * sitenin yolu ya da kişisel sayfalar (sepet, hesap, ödeme) asla yok.
 * `storeSlug` yalnız kayıt için tutulur; adrese girmez.
 */
export interface SitemapRecord {
  slug: string;
  isActive: boolean;
  updatedAt: string | null;
}

export interface StoreSitemapInput {
  canonicalOrigin: string;
  storeSlug: string;
  categories: SitemapRecord[];
  products: SitemapRecord[];
  /** Yalnız aktif ürünü olan markalar (çağıran filtreler). */
  brands: SitemapRecord[];
}

export interface StoreSitemapEntry {
  url: string;
  lastModified?: Date;
  changeFrequency: "daily" | "weekly" | "monthly";
  priority: number;
}

function toDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function latest(records: SitemapRecord[]): Date | undefined {
  let max: Date | undefined;
  for (const record of records) {
    const date = toDate(record.updatedAt);
    if (date && (!max || date > max)) max = date;
  }
  return max;
}

export function buildStoreSitemap(input: StoreSitemapInput): StoreSitemapEntry[] {
  const base = input.canonicalOrigin.replace(/\/+$/, "");
  const categories = input.categories.filter((c) => c.isActive && c.slug);
  const products = input.products.filter((p) => p.isActive && p.slug);
  const brands = input.brands.filter((b) => b.isActive && b.slug);
  const lastCatalogChange = latest([...categories, ...products]);

  const entries: StoreSitemapEntry[] = [
    { url: `${base}/`, lastModified: lastCatalogChange, changeFrequency: "daily", priority: 1 },
    { url: `${base}/kategoriler`, lastModified: latest(categories), changeFrequency: "weekly", priority: 0.8 },
    ...categories.map((c) => ({
      url: `${base}/kategori/${encodeURIComponent(c.slug)}`,
      lastModified: toDate(c.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: `${base}/urun/${encodeURIComponent(p.slug)}`,
      lastModified: toDate(p.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  ];

  if (brands.length > 0) {
    entries.push({ url: `${base}/silahini-sec`, lastModified: latest(brands), changeFrequency: "weekly", priority: 0.6 });
    for (const b of brands) {
      entries.push({
        url: `${base}/silahini-sec/${encodeURIComponent(b.slug)}`,
        lastModified: toDate(b.updatedAt),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
