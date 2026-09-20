import { notFound } from "next/navigation";
import Image from "next/image";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getPublicProductBySlug, getPublicProductImages } from "@/lib/commerce/public/products";
import { Container } from "@/components/ui/container";

function formatPrice(value: number) {
  return value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

/**
 * FAZ 2C-3 STEP 22 — product detail. No cart action, no variant/
 * configurator selection UI yet (see the marked boundary below) — this
 * phase only proves store → product → images resolves correctly and
 * renders real data.
 *
 * `stock` is never rendered — see lib/commerce/public/products.ts's own
 * field-contract comment for why (raw inventory counts aren't exposed to
 * the storefront in this first version).
 */
export default async function StoreProductPage({
  params,
}: {
  params: Promise<{ storeSlug: string; productSlug: string }>;
}) {
  const { storeSlug, productSlug } = await params;

  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const product = await getPublicProductBySlug(store.id, productSlug);
  if (!product) notFound();

  const images = await getPublicProductImages(store.id, product.id);
  const primaryImage = images.find((image) => image.isPrimary) ?? images[0] ?? null;

  return (
    <Container className="py-10">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          {primaryImage?.url ? (
            <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-black/10 bg-black/5">
              {/* unoptimized — signed URL, short-lived and not on next.config.ts's remotePatterns allowlist (which only covers the public object path shape), same reasoning as the admin ImagePreview in images/page.tsx. */}
              <Image
                src={primaryImage.url}
                alt={primaryImage.altText ?? product.name}
                fill
                unoptimized
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-black/10 text-sm text-foreground/40">
              Görsel yok
            </div>
          )}

          {images.length > 1 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {images.map((image) => (
                <li
                  key={image.id}
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-black/10 bg-black/5"
                >
                  {image.url ? (
                    <Image
                      src={image.url}
                      alt={image.altText ?? product.name}
                      fill
                      unoptimized
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div>
          {/* STEP 33 display-only — product.brand already resolved by getPublicProductBySlug/attachBrandsToProducts, no extra query here. No link/filter, plain label. */}
          {product.brand ? (
            <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{product.brand.name}</p>
          ) : null}
          <h1 className="text-2xl font-semibold text-foreground">{product.name}</h1>

          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-xl font-semibold text-foreground">{formatPrice(product.price)}</span>
            {product.compareAtPrice ? (
              <span className="text-sm text-foreground/40 line-through">{formatPrice(product.compareAtPrice)}</span>
            ) : null}
          </div>

          {product.shortDescription ? (
            <p className="mt-4 text-sm text-foreground/70">{product.shortDescription}</p>
          ) : null}
          {product.description ? (
            <p className="mt-4 whitespace-pre-line text-sm text-foreground/70">{product.description}</p>
          ) : null}

          {/*
            FAZ 2C-3 STEP 22 — configurator/variant selection boundary.
            Variant + option-group tables are now anon-readable (migration
            0024, draft), but no selection UI or server-authoritative
            pricing engine exists yet ("henüz configurator UI'ını tam
            uygulama" — explicit scope limit). This comment marks the
            intended mount point for that future work; nothing renders
            here today.
          */}
        </div>
      </div>
    </Container>
  );
}
