import type { Metadata } from "next";
import { getStoreBySlug } from "@/lib/commerce/public/store";

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

export default function StoreLayout({ children }: LayoutProps<"/store/[storeSlug]">) {
  return children;
}
