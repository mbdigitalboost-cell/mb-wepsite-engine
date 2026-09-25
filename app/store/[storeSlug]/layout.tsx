import type { Metadata } from "next";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { CartProvider } from "@/components/commerce/public/cart/cart-context";
import { StoreHeader } from "@/components/commerce/public/cart/store-header";

/**
 * Per-store tab title. Without this, every /store/[storeSlug]/** page
 * inherited the root layout's generic "MB Digital Boost" title (and,
 * separately, the root's favicon — fixed in the same pass, see
 * app/icon.png / app/favicon.ico / app/apple-icon.png) — a leftover from
 * before the public storefront existed. Each store's browser tab should
 * read as its own site, not as the internal panel.
 *
 * Cheap: getStoreBySlug already runs again in each page's own render (it
 * needs the resolved store id for its own queries) — Next dedupes fetch
 * calls per request when the underlying client uses fetch, but this
 * Supabase client may not, so this is a second small query, not a free
 * one. Acceptable here: it's a single anon-role SELECT against a narrow
 * view (store_public_stores), same cost class as one of this route
 * tree's existing queries.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}): Promise<Metadata> {
  const { storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);

  return {
    title: {
      absolute: store?.name ?? "Mağaza",
    },
  };
}

/**
 * FAZ 1 (mağaza sepeti/configurator) — now also resolves the store a
 * second time (see generateMetadata's own comment above for why a second
 * small query here is an accepted cost, not an oversight) to mount
 * CartProvider (keyed by storeSlug, see cart-context.tsx) and StoreHeader
 * around every page in this route tree. A store that fails to resolve
 * here (deleted/renamed between requests, or slug simply doesn't exist)
 * falls through to `children` rendering the page's OWN notFound() —
 * every page under this tree already re-resolves the store itself and
 * calls notFound(), so this layout doesn't duplicate that 404 logic, it
 * just renders bare `children` (no header) rather than guessing a name.
 */
export default async function StoreLayout({
  children,
  params,
}: {
  children: LayoutProps<"/store/[storeSlug]">["children"];
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);

  if (!store) return children;

  return (
    <CartProvider storeSlug={storeSlug}>
      <StoreHeader storeSlug={storeSlug} storeName={store.name} />
      {children}
    </CartProvider>
  );
}
