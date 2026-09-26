import { notFound } from "next/navigation";
import Link from "next/link";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getPublicBrandsWithProducts } from "@/lib/commerce/public/brands";
import { Container } from "@/components/ui/container";

/**
 * FAZ 7.2 — "Silahını Seç" akışı, adım 1: marka seçimi.
 * getPublicBrandsWithProducts (lib/commerce/public/brands.ts) only
 * returns brands with at least one product ("aktif markaları (en az bir
 * ürünü olan)" per spec) — not simply every brand row this store has.
 */
export default async function StoreChooseWeaponPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;

  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const brands = await getPublicBrandsWithProducts(store.id);

  return (
    <Container className="py-10">
      <h1 className="text-2xl font-semibold text-foreground">Silahını Seç</h1>
      <p className="mt-1 text-sm text-foreground/60">Önce bir marka seçin.</p>

      {brands.length === 0 ? (
        <p className="mt-6 text-sm text-foreground/60">Henüz ürün eklenmiş bir marka yok.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {brands.map((brand) => (
            <li key={brand.id}>
              <Link
                href={`/store/${storeSlug}/silahini-sec/${brand.slug}`}
                className="flex h-24 items-center justify-center rounded-lg border border-black/10 p-4 text-center text-sm font-medium text-foreground transition-colors hover:border-black/20 hover:bg-brand-accent/5"
              >
                {brand.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
