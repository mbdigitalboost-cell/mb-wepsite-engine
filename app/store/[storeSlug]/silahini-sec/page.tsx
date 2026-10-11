import { notFound } from "next/navigation";
import Link from "next/link";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getPublicBrandsWithProducts } from "@/lib/commerce/public/brands";
import { Container } from "@/components/ui/container";
import { SilahiniSecBreadcrumb } from "@/components/commerce/public/silahini-sec-progress";
import { StorefrontCtaBand } from "@/components/commerce/public/storefront-cta-band";
import { storefrontDisplayClasses } from "@/lib/utils/storefront-typography";

/**
 * FAZ 7.2 — "Silahını Seç" akışı, adım 1: marka seçimi.
 * getPublicBrandsWithProducts (lib/commerce/public/brands.ts) only
 * returns brands with at least one product ("aktif markaları (en az bir
 * ürünü olan)" per spec) — not simply every brand row this store has.
 *
 * Faz 12 devamı — v2 koyu tema. Bu sayfa (ve akışın diğer 2 sayfası)
 * tenant-bağımsız/genel — bkz. silahini-sec-progress.tsx'in kendi doc
 * comment'i.
 */
export default async function StoreChooseWeaponPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;

  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const brands = await getPublicBrandsWithProducts(store.id);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Container className="py-10">
        <SilahiniSecBreadcrumb storeSlug={storeSlug} activeStep={1} />
        <h1 className={`${storefrontDisplayClasses} mt-3 text-2xl font-bold tracking-tight text-[#F5F5F5]`}>Silahını Seç</h1>
        <p className="mt-1 text-sm text-[#A3A3A3]">Önce bir marka seçin.</p>

        {brands.length === 0 ? (
          <p className="mt-6 text-sm text-[#A3A3A3]">Henüz ürün eklenmiş bir marka yok.</p>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {brands.map((brand) => (
              <li key={brand.id}>
                <Link
                  href={`/store/${storeSlug}/silahini-sec/${brand.slug}`}
                  className={`${storefrontDisplayClasses} flex h-24 items-center justify-center rounded-[14px] border border-[#292929] bg-[#171717] p-4 text-center text-sm font-semibold text-[#F5F5F5] transition-colors hover:border-[#D95F00]`}
                >
                  {brand.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>

      {/* Faz 12 devamı — bandın kendi py-14'üne dokunmadan, üstündeki grid'le arasına nefes payı. */}
      <div className="mt-16">
        <StorefrontCtaBand storeId={store.id} storeSlug={storeSlug} />
      </div>
    </div>
  );
}
