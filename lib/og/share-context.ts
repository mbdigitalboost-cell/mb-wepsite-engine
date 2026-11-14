import "server-only";

import { getStoreBySlug, type PublicStoreSummary } from "@/lib/commerce/public/store";
import { getPublicStoreProfile } from "@/lib/commerce/public/profile";
import { resolveStoreLogoUrl } from "@/lib/commerce/public/store-brand-assets";
import { findStoreSiteBySlug } from "@/lib/sites/registry";
import { absoluteAsset, fetchImageAsDataUri } from "@/lib/og/share-image";

/**
 * Faz 29 Kısım C — paylaşım görseli rotalarının ortak bağlamı. Mağaza
 * slug'ı URL'den gelir ama proxy mağaza sitesinde yalnız KENDİ slug'ını
 * açar (route-policy); burada ayrıca yalnız yayında mağaza okunur (anon/RLS).
 */
export interface ShareContext {
  store: PublicStoreSummary;
  origin: string;
  domain: string;
  logo: string | null;
}

export async function loadShareContext(request: Request, storeSlug: string): Promise<ShareContext | null> {
  const store = await getStoreBySlug(storeSlug);
  if (!store) return null;
  const origin = new URL(request.url).origin;
  const site = findStoreSiteBySlug(storeSlug);
  const domain = (site ? new URL(site.canonicalOrigin).host : new URL(request.url).host).replace(/^www\./, "");
  const profile = await getPublicStoreProfile(store.id);
  const logo = await fetchImageAsDataUri(absoluteAsset(origin, resolveStoreLogoUrl(storeSlug, profile?.logoUrl)));
  return { store, origin, domain, logo };
}

export function shareNotFound(): Response {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
}
