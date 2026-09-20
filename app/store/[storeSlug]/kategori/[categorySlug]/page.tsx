import { notFound } from "next/navigation";
import Link from "next/link";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getPublicCategoryBySlug, getPublicSubcategories } from "@/lib/commerce/public/categories";
import { getPublicBrandBySlug } from "@/lib/commerce/public/brands";
import { getPublicProducts } from "@/lib/commerce/public/products";
import { ProductGrid } from "@/components/commerce/public/product-grid";
import { Container } from "@/components/ui/container";

/**
 * FAZ 2C-3 STEP 22 / FAZ 2C-4 STEP 23 / FAZ 2C STEP 33 — category listing.
 * Resolution order per spec: store by slug → notFound() if missing →
 * category by (storeId, slug) → notFound() if missing/inactive (RLS's own
 * `categories_select_public_active`, migration 0016, is the real
 * "inactive is invisible" gate — this route adds no extra filter) →
 * subcategories (if any) + active products directly in this category.
 *
 * STEP 23's own spec: "ana kategori + alt kategoriler + ürünler
 * gösterilebilir bir veri modeli hazır olsun" — a parent category like
 * SİLAH KILIFLARI typically has no products of its own (real holsters are
 * assigned to one of its 4 children), so the subcategory list is shown
 * plainly above the grid, not just fetched-and-unused.
 *
 * STEP 33 — brand/model query-param filtering (infrastructure only, no
 * filter UI rendered — "henüz UI'ı gereksiz büyütme" per that turn's own
 * spec): `?brand=canik` resolves a brand SLUG to an id via the SAME
 * store-scoped `getPublicBrandBySlug` lookup the category itself already
 * goes through — a slug never reaches getPublicProducts directly. If
 * `?brand=` is given but doesn't resolve to a real brand in THIS store,
 * the result is an empty product list (not "ignore the filter and show
 * everything" — an unresolvable filter should never silently widen the
 * results). `?model=` matches `products.model` by exact value (no
 * slugifying — see products.ts's own comment on that decision).
 */
export default async function StoreCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string; categorySlug: string }>;
  searchParams: Promise<{ brand?: string; model?: string }>;
}) {
  const { storeSlug, categorySlug } = await params;
  const { brand: brandSlug, model } = await searchParams;

  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const category = await getPublicCategoryBySlug(store.id, categorySlug);
  if (!category) notFound();

  const resolvedBrand = brandSlug ? await getPublicBrandBySlug(store.id, brandSlug) : null;
  const brandFilterUnresolved = Boolean(brandSlug) && !resolvedBrand;

  const [subcategories, products] = await Promise.all([
    getPublicSubcategories(store.id, category.id),
    brandFilterUnresolved
      ? Promise.resolve([])
      : getPublicProducts(store.id, {
          categoryId: category.id,
          brandId: resolvedBrand?.id,
          model: model || undefined,
        }),
  ]);

  return (
    <Container className="py-10">
      <h1 className="text-2xl font-semibold text-foreground">{category.name}</h1>
      {category.description ? <p className="mt-2 text-sm text-foreground/70">{category.description}</p> : null}

      {subcategories.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {subcategories.map((subcategory) => (
            <li key={subcategory.id}>
              <Link
                href={`/store/${storeSlug}/kategori/${subcategory.slug}`}
                className="block rounded-full border border-black/10 px-3 py-1.5 text-sm text-foreground/70 transition-colors hover:border-black/20 hover:text-foreground"
              >
                {subcategory.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <ProductGrid storeSlug={storeSlug} products={products} />
    </Container>
  );
}
