import type { Metadata } from "next";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getPublicCategories } from "@/lib/commerce/public/categories";
import { getPublicStoreProfile } from "@/lib/commerce/public/profile";
import { createSupabaseStorefrontServerClient } from "@/lib/supabase/storefront-server";
import { CartProvider } from "@/components/commerce/public/cart/cart-context";
import { StoreHeader } from "@/components/commerce/public/cart/store-header";
import { StoreAnnouncementBar } from "@/components/commerce/public/store-announcement-bar";

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
  const profile = store ? await getPublicStoreProfile(store.id) : null;

  return {
    title: {
      absolute: store?.name ?? "Mağaza",
    },
    // FAZ 10 — only set when a store has actually uploaded a favicon;
    // `icons: undefined` here means "not specified at this level", which
    // Next's metadata merging treats as "inherit the root layout's own
    // file-based icons" (app/icon.png/favicon.ico/apple-icon.png) — this
    // is exactly the required fallback, not an accidental omission, and
    // it's what keeps every OTHER store (and Petra, a completely separate
    // route tree) rendering its existing favicon unchanged.
    icons: profile?.faviconUrl ? { icon: profile.faviconUrl, apple: profile.faviconUrl } : undefined,
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

  // FAZ 5.1 — the ONLY reason this layout now reads the auth session
  // (previously every app/store/** read went through the cookie-less
  // public client only). Storefront pages already render dynamically
  // per-request today (no page in this tree opts into `revalidate`/static
  // generation — Next 15+'s fetch caching defaults to off, and none of the
  // Supabase reads here are native `fetch()` calls the old cache model
  // could even apply to), so this doesn't newly make anything dynamic that
  // wasn't already.
  const supabase = await createSupabaseStorefrontServerClient();
  const [
    {
      data: { user },
    },
    allCategories,
    profile,
  ] = await Promise.all([supabase.auth.getUser(), getPublicCategories(store.id), getPublicStoreProfile(store.id)]);

  // FAZ 6.1 — hamburger menu shows top-level categories only (a flat,
  // simple list per that phase's own "basit bir panel" spec); getPublicCategories
  // returns every category (top-level AND children — see its own comment),
  // same query kategori/[categorySlug]/page.tsx already uses, just filtered
  // here rather than reinventing a new "top-level only" query.
  const topLevelCategories = allCategories.filter((category) => category.parentId === null);

  return (
    <CartProvider storeSlug={storeSlug}>
      {/* FAZ 7.3 follow-up — site geneli, sabit içerikli duyuru şeridi; bkz. kendi dosyasının doc comment'i. */}
      <StoreAnnouncementBar />
      <StoreHeader
        storeSlug={storeSlug}
        storeName={store.name}
        logoUrl={profile?.logoUrl ?? null}
        isLoggedIn={Boolean(user)}
        categories={topLevelCategories}
      />
      {children}
    </CartProvider>
  );
}
