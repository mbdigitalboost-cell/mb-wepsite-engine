import Link from "next/link";
import type { PublicProduct } from "@/lib/commerce/public/products";

interface ProductGridProps {
  storeSlug: string;
  products: PublicProduct[];
}

function formatPrice(value: number) {
  return value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

/**
 * FAZ 2C-3 — shared, reusable product grid. Used by both the store
 * homepage (featured products) and the category page (STEP 22's own
 * "Grid sade ve reusable olsun" requirement) — one component, two
 * callers, no per-page duplication.
 *
 * Deliberately no thumbnail image here: each product image needs its own
 * signed-URL round trip (see lib/commerce/public/products.ts's own
 * comment on why signing can't be a raw public URL), and doing that for
 * every card on a list page is an N+1 cost this first foundation pass
 * doesn't take on. Name + price is enough to prove the read model end to
 * end; a thumbnail is a real, tracked follow-up, not a silent omission.
 *
 * No pagination/filter/sort/cart button — explicitly out of scope for
 * this phase.
 */
export function ProductGrid({ storeSlug, products }: ProductGridProps) {
  if (products.length === 0) {
    return <p className="text-sm text-foreground/60">Henüz ürün eklenmemiş.</p>;
  }

  return (
    <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <Link
            href={`/store/${storeSlug}/urun/${product.slug}`}
            className="block rounded-lg border border-black/10 p-3 text-sm transition-colors hover:border-black/20"
          >
            {/* STEP 33 display-only — product.brand already resolved by getPublicProducts/attachBrandsToProducts, no extra query here. No link/filter, plain label. */}
            {product.brand ? (
              <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{product.brand.name}</p>
            ) : null}
            <p className="font-medium text-foreground">{product.name}</p>
            <p className="mt-1 text-foreground/70">{formatPrice(product.price)}</p>
            {product.compareAtPrice ? (
              <p className="text-xs text-foreground/40 line-through">{formatPrice(product.compareAtPrice)}</p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
