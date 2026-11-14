import { CATEGORY_FALLBACK_IMAGES } from "@/lib/commerce/public/category-fallback-images";
import { absoluteAsset, fetchImageAsDataUri, renderShareImage } from "@/lib/og/share-image";
import { loadShareContext, shareNotFound } from "@/lib/og/share-context";

/**
 * Faz 29 Kısım C — mağaza geneli paylaşım görseli (ana sayfa, /kategoriler,
 * /silahini-sec). Temiz adres: /paylasim. Solda repo'daki yazısız bir
 * kategori görseli (Faz 26 seti); sağda logo + mağaza adı + domain.
 */
export async function GET(request: Request, { params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const context = await loadShareContext(request, storeSlug);
  if (!context) return shareNotFound();

  const photo = CATEGORY_FALLBACK_IMAGES["silah-kiliflari"] ?? Object.values(CATEGORY_FALLBACK_IMAGES)[0] ?? null;
  return renderShareImage({
    origin: context.origin,
    domain: context.domain,
    logo: context.logo,
    storeName: context.store.name,
    title: context.store.name,
    photo: await fetchImageAsDataUri(absoluteAsset(context.origin, photo)),
    photoLayout: "square",
  });
}
