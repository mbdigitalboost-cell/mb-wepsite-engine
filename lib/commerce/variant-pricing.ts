/**
 * Faz 34 — admin'de varyant fiyatı (saf; tests/variant-pricing.test.ts).
 *
 * Kural: varyant fiyatı NULL = ürün fiyatını izler. Yalnız gerçekten farklı
 * fiyatlı renk/seçenek dolu tutulur.
 *  - Varyant oluştururken fiyat KOPYALANMAZ (NULL).
 *  - Admin ürün fiyatına EŞİT bir değer girerse NULL kaydedilir (izlemeye devam).
 *  - Ürün fiyatı değişince, fiyatı ESKİ ürün fiyatına eşit olan varyantlar
 *    (kopyalanmış sayılanlar) NULL'a çekilir; farklı fiyatlılar korunur.
 */
const kurus = (value: number) => Math.round(value * 100);

export function samePrice(a: number | null | undefined, b: number | null | undefined): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return kurus(Number(a)) === kurus(Number(b));
}

/** Kaydedilecek varyant fiyatı: ürün fiyatına eşitse NULL (izler). */
export function normalizeVariantPrice(input: number | null, productPrice: number): number | null {
  if (input === null) return null;
  return samePrice(input, productPrice) ? null : input;
}

/** Varyant fiyatı NULL'sa (izliyorsa) kendi eski fiyatı da tutulmaz; ürününkini miras alır. */
export function normalizeVariantCompareAt(compareAt: number | null, normalizedPrice: number | null): number | null {
  return normalizedPrice === null ? null : compareAt;
}

export interface VariantPriceRow {
  id: string;
  price: number | null;
  compareAtPrice: number | null;
}

export interface FollowPlan {
  /** Fiyatı eski ürün fiyatına eşit → NULL'a çekilecek. */
  toFollow: string[];
  /** Zaten izleyenler (NULL). */
  alreadyFollowing: string[];
  /** Özel fiyatı korunanlar. */
  kept: Array<{ id: string; price: number }>;
}

export function planVariantsAfterProductPriceChange(oldProductPrice: number, variants: readonly VariantPriceRow[]): FollowPlan {
  const plan: FollowPlan = { toFollow: [], alreadyFollowing: [], kept: [] };
  for (const variant of variants) {
    if (variant.price === null) plan.alreadyFollowing.push(variant.id);
    else if (samePrice(variant.price, oldProductPrice)) plan.toFollow.push(variant.id);
    else plan.kept.push({ id: variant.id, price: variant.price });
  }
  return plan;
}

export function followPlanSummary(plan: FollowPlan, formatPrice: (value: number) => string): string | null {
  const following = plan.toFollow.length + plan.alreadyFollowing.length;
  if (following === 0 && plan.kept.length === 0) return null;
  const parts: string[] = [];
  if (following > 0) parts.push(`${following} seçeneğin fiyatı ürün fiyatını izliyor`);
  if (plan.kept.length > 0) parts.push(`${plan.kept.length} seçeneğin özel fiyatı korundu (${plan.kept.map((k) => formatPrice(k.price)).join(", ")})`);
  return `${parts.join("; ")}.`;
}
