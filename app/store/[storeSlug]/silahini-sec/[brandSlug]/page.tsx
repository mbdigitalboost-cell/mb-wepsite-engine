import { notFound } from "next/navigation";
import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getPublicBrandBySlug, getPublicBrandModels } from "@/lib/commerce/public/brands";
import { Container } from "@/components/ui/container";
import { SilahiniSecBreadcrumb, SelectedBrandChip } from "@/components/commerce/public/silahini-sec-progress";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["700"] });

/**
 * FAZ 7.2 — "Silahını Seç" akışı, adım 2: model seçimi. Model listesi
 * BOŞSA (bu markada henüz hiçbir üründe model girilmemişse — Faz 7.1'in
 * admin "Model" alanı boş bırakılmış olabilir) akışı tıkamıyor: bir boş
 * durum mesajı + o markanın TÜM ürünlerini gösteren bir link sunuyor
 * (aynı /sonuclar sayfası, sadece ?model= olmadan).
 *
 * Faz 12 devamı — v2 koyu tema (bkz. silahini-sec-progress.tsx'in doc
 * comment'i: bu akış tenant-bağımsız/genel).
 */
export default async function StoreChooseWeaponBrandPage({
  params,
}: {
  params: Promise<{ storeSlug: string; brandSlug: string }>;
}) {
  const { storeSlug, brandSlug } = await params;

  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const brand = await getPublicBrandBySlug(store.id, brandSlug);
  if (!brand) notFound();

  const models = await getPublicBrandModels(store.id, brand.id);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Container className="py-10">
        <SilahiniSecBreadcrumb activeStep={2} />
        <Link
          href={`/store/${storeSlug}/silahini-sec`}
          className="mt-3 inline-block text-xs text-[#A3A3A3] hover:text-[#F5F5F5] hover:underline"
        >
          ← Markalar
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className={`${spaceGrotesk.className} text-2xl font-bold tracking-tight text-[#F5F5F5]`}>{brand.name}</h1>
          <SelectedBrandChip brandName={brand.name} />
        </div>

        {models.length === 0 ? (
          <div className="mt-6">
            <p className="text-sm text-[#A3A3A3]">Bu markada henüz model girilmemiş.</p>
            <Link
              href={`/store/${storeSlug}/silahini-sec/${brandSlug}/sonuclar`}
              className="mt-3 inline-block text-sm font-medium text-[#D95F00] underline-offset-2 hover:text-[#F26A00] hover:underline"
            >
              Tüm {brand.name} Ürünlerini Gör →
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-[#A3A3A3]">Bir model seçin.</p>
            <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {models.map((model) => (
                <li key={model}>
                  <Link
                    href={`/store/${storeSlug}/silahini-sec/${brandSlug}/sonuclar?model=${encodeURIComponent(model)}`}
                    className={`${spaceGrotesk.className} flex h-20 items-center justify-center rounded-lg border border-[#292929] bg-[#171717] p-4 text-center text-sm font-semibold text-[#F5F5F5] transition-colors hover:border-[#D95F00]`}
                  >
                    {model}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Container>
    </div>
  );
}
