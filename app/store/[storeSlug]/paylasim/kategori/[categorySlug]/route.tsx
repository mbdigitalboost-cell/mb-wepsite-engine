import { getPublicCategoryBySlug } from "@/lib/commerce/public/categories";
import { CATEGORY_FALLBACK_IMAGES } from "@/lib/commerce/public/category-fallback-images";
import { absoluteAsset, fetchImageAsDataUri, renderShareImage } from "@/lib/og/share-image";
import { loadShareContext, shareNotFound } from "@/lib/og/share-context";

/**
 * Faz 29 Kısım C — kategori paylaşım görseli. Temiz adres:
 * /paylasim/kategori/<slug>. Yalnız aktif kategori (anon/RLS); pasif → 404.
 * Görsel: kategorinin YAZISIZ 4:3 görseli (Faz 26 seti), yoksa admin'in
 * yüklediği görsel. Geniş banner'lar kullanılmadı: üzerlerinde basılı yazı var.
 */
export async function GET(request: Request, { params }: { params: Promise<{ storeSlug: string; categorySlug: string }> }) {
  const { storeSlug, categorySlug } = await params;
  const context = await loadShareContext(request, storeSlug);
  if (!context) return shareNotFound();

  const category = await getPublicCategoryBySlug(context.store.id, categorySlug);
  if (!category) return shareNotFound();

  const photoPath = CATEGORY_FALLBACK_IMAGES[category.slug] ?? category.imageUrl;
  return renderShareImage({
    origin: context.origin,
    domain: context.domain,
    logo: context.logo,
    storeName: context.store.name,
    title: category.name,
    photo: await fetchImageAsDataUri(absoluteAsset(context.origin, photoPath)),
    photoLayout: "square",
  });
}
