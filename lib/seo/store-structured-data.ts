/**
 * Faz 37 Kısım C2 — schema.org JSON-LD (saf; tests/seo.test.ts). Google
 * Rich Results biçimi: Product + Offer, BreadcrumbList, OnlineStore.
 * Yalnız GERÇEK veri: puan/yorum (aggregateRating/review) YOK — sistemde
 * değerlendirme yok, eklemek uydurma olur. Boş alanlar hiç yazılmaz.
 * Render: components/seo/json-ld.tsx (tek, XSS'e karşı kaçışlı bileşen).
 * (Petra'nın lib/seo/structured-data.ts dosyasından ayrı; ona dokunulmadı.)
 */

type Json = Record<string, unknown>;

function compact<T extends Json>(object: T): T {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== null && value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0))) as T;
}

export function gtinField(barcode: string | null | undefined): Json {
  const digits = (barcode ?? "").trim();
  if (!/^\d+$/.test(digits)) return {};
  if (digits.length === 8) return { gtin8: digits };
  if (digits.length === 12) return { gtin12: digits };
  if (digits.length === 13) return { gtin13: digits };
  if (digits.length === 14) return { gtin14: digits };
  return {};
}

export interface ProductStructuredInput {
  name: string;
  description: string | null;
  url: string;
  image: string | null;
  sku: string | null;
  barcode: string | null;
  brandName: string | null;
  /** Vitrin (etkili) fiyatı — kart ve ürün sayfasıyla aynı (Faz 34 displayPriceFor). */
  price: number;
  /** Varyantların fiyatları farklıysa en yüksek etkili fiyat (AggregateOffer). */
  highPrice?: number | null;
  inStock: boolean;
  sellerName: string;
}

export function productJsonLd(input: ProductStructuredInput): Json {
  const availability = input.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  const offers =
    input.highPrice && input.highPrice > input.price
      ? compact({ "@type": "AggregateOffer", priceCurrency: "TRY", lowPrice: input.price.toFixed(2), highPrice: input.highPrice.toFixed(2), availability, url: input.url })
      : compact({
          "@type": "Offer",
          priceCurrency: "TRY",
          price: input.price.toFixed(2),
          availability,
          url: input.url,
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@type": "Organization", name: input.sellerName },
        });
  return compact({
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description?.trim() || null,
    image: input.image ? [input.image] : null,
    sku: input.sku?.trim() || null,
    ...gtinField(input.barcode),
    brand: input.brandName ? { "@type": "Brand", name: input.brandName } : null,
    url: input.url,
    offers,
  });
}

export function breadcrumbJsonLd(items: ReadonlyArray<{ name: string; url: string }>): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: item.url })),
  };
}

export interface StoreStructuredInput {
  name: string;
  legalName: string | null;
  url: string;
  logo: string | null;
  telephone: string | null;
  email: string | null;
  address: string | null;
  sameAs: string[];
}

export function onlineStoreJsonLd(input: StoreStructuredInput): Json {
  return compact({
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: input.name,
    legalName: input.legalName,
    url: input.url,
    logo: input.logo,
    telephone: input.telephone,
    email: input.email,
    address: input.address ? { "@type": "PostalAddress", streetAddress: input.address, addressCountry: "TR" } : null,
    sameAs: input.sameAs.filter((link) => /^https:\/\//.test(link)),
  });
}

/** Meta açıklama yedeği (kategori/yasal/liste sayfaları) — gerçek ad ve mağaza adıyla, içerik uydurmadan. */
export function fallbackDescription(pageName: string, storeName: string): string {
  return `${pageName} — ${storeName} ürünleri ve alışveriş bilgileri.`;
}
