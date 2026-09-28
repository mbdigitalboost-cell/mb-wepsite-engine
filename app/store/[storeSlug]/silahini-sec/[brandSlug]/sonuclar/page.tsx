import { notFound } from "next/navigation";
import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getPublicBrandBySlug } from "@/lib/commerce/public/brands";
import { getPublicProducts } from "@/lib/commerce/public/products";
import { ProductGrid } from "@/components/commerce/public/product-grid";
import { Container } from "@/components/ui/container";
import { SilahiniSecBreadcrumb, SelectedBrandChip } from "@/components/commerce/public/silahini-sec-progress";

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
 * Faz 12 devamı — v2 koyu tema, SADECE bu sayfaya özel çevre (breadcrumb/
 * rozet/başlık) için — ProductGrid'in KENDİSİ bilerek DEĞİŞTİRİLMEDİ,
 * çünkü /kategori/[categorySlug] sayfası da AYNI bileşeni kullanıyor ve o
 * sayfa bu fazın kapsamında değil (grep ile doğrulandı: ProductGrid sadece
 * bu 2 sayfada + product-grid.tsx'in kendisinde geçiyor). ProductGrid'in
 * kendi kart stili hâlâ açık temaya göre (border-black/10, text-foreground,
 * açık zemin varsayımıyla) — bu yüzden onu doğrudan #0A0A0A sayfa zemininin
 * üzerine koymak koyu-üstünde-koyu metin görünmez hale getirirdi (checkout
 * formlarında düzeltilen AYNI sınıftan bir hata). Çözüm: ProductGrid'i açık
 * renkli, kendi içinde tutarlı bir "kart" panelinin içine sarmalamak — bu
 * panel bu SAYFAYA özel (page-level çevre), product-grid.tsx'in kendisine
 * dokunulmuyor.
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

        <div className="mt-6 rounded-lg bg-[#F5F5F5] p-4">
          <ProductGrid storeSlug={storeSlug} products={products} />
        </div>
      </Container>
    </div>
  );
}
