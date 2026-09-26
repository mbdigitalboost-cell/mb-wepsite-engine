import { notFound } from "next/navigation";
import Link from "next/link";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getPublicBrandBySlug, getPublicBrandModels } from "@/lib/commerce/public/brands";
import { Container } from "@/components/ui/container";

/**
 * FAZ 7.2 — "Silahını Seç" akışı, adım 2: model seçimi. Model listesi
 * BOŞSA (bu markada henüz hiçbir üründe model girilmemişse — Faz 7.1'in
 * admin "Model" alanı boş bırakılmış olabilir) akışı tıkamıyor: bir boş
 * durum mesajı + o markanın TÜM ürünlerini gösteren bir link sunuyor
 * (aynı /sonuclar sayfası, sadece ?model= olmadan).
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
    <Container className="py-10">
      <Link
        href={`/store/${storeSlug}/silahini-sec`}
        className="text-xs text-foreground/50 hover:text-foreground hover:underline"
      >
        ← Markalar
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">{brand.name}</h1>

      {models.length === 0 ? (
        <div className="mt-6">
          <p className="text-sm text-foreground/60">Bu markada henüz model girilmemiş.</p>
          <Link
            href={`/store/${storeSlug}/silahini-sec/${brandSlug}/sonuclar`}
            className="mt-3 inline-block text-sm font-medium text-brand-accent underline-offset-2 hover:underline"
          >
            Tüm {brand.name} Ürünlerini Gör →
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-foreground/60">Bir model seçin.</p>
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {models.map((model) => (
              <li key={model}>
                <Link
                  href={`/store/${storeSlug}/silahini-sec/${brandSlug}/sonuclar?model=${encodeURIComponent(model)}`}
                  className="flex h-20 items-center justify-center rounded-lg border border-black/10 p-4 text-center text-sm font-medium text-foreground transition-colors hover:border-black/20 hover:bg-brand-accent/5"
                >
                  {model}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Container>
  );
}
