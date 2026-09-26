import { notFound } from "next/navigation";
import Link from "next/link";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getPublicBrandBySlug } from "@/lib/commerce/public/brands";
import { getPublicProducts } from "@/lib/commerce/public/products";
import { ProductGrid } from "@/components/commerce/public/product-grid";
import { Container } from "@/components/ui/container";

/**
 * FAZ 7.2 — "Silahını Seç" akışı, adım 3: sonuçlar. `?model=` yoksa bu
 * markanın TÜM ürünleri (model listesi boş markalar için kaçış yolu, o
 * markanın kendi page.tsx'inden gelinir) — `?model=` varsa brand+model
 * eşleşen ürünler. getPublicProducts (lib/commerce/public/products.ts)
 * zaten brandId/model filtrelerini destekliyordu (Faz 2C STEP 33) — yeni
 * bir filtre parametresi eklemeye gerek yoktu. Aynı ProductGrid
 * (kategori sayfasının da kullandığı) yeniden kullanılıyor, kopyalanmadı.
 */
export default async function StoreChooseWeaponResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string; brandSlug: string }>;
  searchParams: Promise<{ model?: string }>;
}) {
  const { storeSlug, brandSlug } = await params;
  const { model } = await searchParams;

  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const brand = await getPublicBrandBySlug(store.id, brandSlug);
  if (!brand) notFound();

  const products = await getPublicProducts(store.id, { brandId: brand.id, model: model || undefined });

  return (
    <Container className="py-10">
      <Link
        href={`/store/${storeSlug}/silahini-sec/${brandSlug}`}
        className="text-xs text-foreground/50 hover:text-foreground hover:underline"
      >
        ← {brand.name}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">
        {brand.name}
        {model ? ` — ${model}` : ""}
      </h1>

      <ProductGrid storeSlug={storeSlug} products={products} />
    </Container>
  );
}
