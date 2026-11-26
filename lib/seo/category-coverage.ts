/**
 * Faz 37 Kısım C4 — aktif ürünü olan kategoriler (saf; tests/seo.test.ts).
 * Bir kategori, kendisine ya da herhangi bir alt kategorisine bağlı en az
 * bir AKTİF ürün varsa "dolu" sayılır (üst kategori SİLAH KILIFLARI'nın
 * ürünleri çoğu zaman alt kategorilerdedir). Boş kategori sitemap'ten çıkar
 * ve noindex olur; ürün eklenince kendiliğinden geri gelir.
 */
export function categoriesWithActiveProducts(
  categories: ReadonlyArray<{ id: string; parentId: string | null }>,
  links: ReadonlyArray<{ categoryId: string; productId: string }>,
  activeProductIds: ReadonlySet<string>,
): Set<string> {
  const parentOf = new Map(categories.map((category) => [category.id, category.parentId]));
  const filled = new Set<string>();
  for (const link of links) {
    if (!activeProductIds.has(link.productId)) continue;
    let current: string | null | undefined = link.categoryId;
    const seen = new Set<string>();
    while (current && parentOf.has(current) && !seen.has(current)) {
      seen.add(current);
      filled.add(current);
      current = parentOf.get(current);
    }
  }
  return filled;
}
