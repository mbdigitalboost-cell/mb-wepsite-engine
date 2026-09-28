import { notFound } from "next/navigation";
import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getPublicBrandBySlug } from "@/lib/commerce/public/brands";
import { getPublicProducts } from "@/lib/commerce/public/products";
import { ProductGrid } from "@/components/commerce/public/product-grid";
import { Container } from "@/components/ui/container";
import { SilahiniSecBreadcrumb, SelectedBrandChip } from "@/components/commerce/public/silahini-sec-progress";
import { SilahiniSecCtaBand } from "@/components/commerce/public/silahini-sec-cta-band";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["700"] });

/**
 * FAZ 7.2 — "Silahını Seç" akışı, adım 3: sonuçlar. `?model=` yoksa bu
 * markanın TÜM ürünleri (model listesi boş markalar için kaçış yolu, o
 * markanın kendi page.tsx'inden gelinir) — `?model=` varsa brand+model
 * eşleşen ürünler. getPublicProducts (lib/commerce/public/products.ts)
 * zaten brandId/model filtrelerini destekliyordu (Faz 2C STEP 33) — yeni
 * bir filtre parametresi eklemeye gerek yoktu. Aynı ProductGrid
 * (kategori sayfasının da kullandığı) yeniden kullanılıyor, kopyalanmadı.
 *
 * Faz 12 devamı (A) — ProductGrid artık KENDİSİ koyu tema (bkz.
 * product-grid.tsx'in kendi doc comment'i, /kategori/[categorySlug] ile
 * paylaşılıyor, o sayfa da bu fazda koyulaştırıldı) — bu yüzden önceki
 * turda burada geçici olarak eklenen açık renkli "kart" sarmalayıcı
 * (bg-[#F5F5F5]) artık gereksiz ve kaldırıldı; ProductGrid doğrudan
 * sayfanın #0A0A0A zemini üzerinde kendi başına okunur.
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
    <div className="min-h-screen bg-[#0A0A0A]">
      <Container className="py-10">
        <SilahiniSecBreadcrumb activeStep={3} />
        <Link
          href={`/store/${storeSlug}/silahini-sec/${brandSlug}`}
          className="mt-3 inline-block text-xs text-[#A3A3A3] hover:text-[#F5F5F5] hover:underline"
        >
          ← {brand.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className={`${spaceGrotesk.className} text-2xl font-bold tracking-tight text-[#F5F5F5]`}>
            {brand.name}
            {model ? ` — ${model}` : ""}
          </h1>
          <SelectedBrandChip brandName={brand.name} />
        </div>

        <ProductGrid storeSlug={storeSlug} products={products} />
      </Container>

      <SilahiniSecCtaBand storeId={store.id} storeSlug={storeSlug} />
    </div>
  );
}
