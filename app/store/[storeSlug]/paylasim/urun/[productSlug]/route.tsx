import { getPublicProductBySlug, getPublicProductImages } from "@/lib/commerce/public/products";
import { fetchImageAsDataUri, renderShareImage } from "@/lib/og/share-image";
import { loadShareContext, shareNotFound } from "@/lib/og/share-context";

/**
 * Faz 29 Kısım C — ürün paylaşım görseli. Temiz adres: /paylasim/urun/<slug>.
 * - Yalnız bu mağazanın, yalnız YAYINDAKİ ürünü (anon/RLS + isActive):
 *   taslak/pasif ürün → 404, görsel üretilmez.
 * - Kapak: birincil görsel (yoksa ilk görsel); private bucket'tan sunucuda
 *   imzalanıp okunur, görsele gömülür — imzalı adres dışarı çıkmaz.
 * - Fiyat gerçek: product.price; indirimli eski fiyat yalnız compareAtPrice
 *   gerçekten daha yüksekse.
 */
/** Poppins'te "₺" glifi yok (kutu çıkıyordu) → görselde "2.000,00 TL". */
function formatOgPrice(value: number): string {
  return `${value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

export async function GET(request: Request, { params }: { params: Promise<{ storeSlug: string; productSlug: string }> }) {
  const { storeSlug, productSlug } = await params;
  const context = await loadShareContext(request, storeSlug);
  if (!context) return shareNotFound();

  const product = await getPublicProductBySlug(context.store.id, productSlug);
  if (!product || !product.isActive) return shareNotFound();

  // İmzalama başarısız olursa (ör. anahtar yok) görsel yine üretilir, fotoğrafsız.
  const images = await getPublicProductImages(context.store.id, product.id).catch(() => []);
  const cover = images.find((image) => image.isPrimary && !image.variantId) ?? images.find((image) => image.isPrimary) ?? images[0];
  // Faz 34 — kart ve ürün sayfasıyla aynı vitrin fiyatı (varyantlardan).
  const price = product.display.price;
  const previous = product.display.compareAtPrice;

  return renderShareImage({
    origin: context.origin,
    domain: context.domain,
    logo: context.logo,
    storeName: context.store.name,
    title: product.name,
    photo: await fetchImageAsDataUri(cover?.url ?? null),
    photoLayout: "square",
    price: { current: formatOgPrice(price), previous: previous !== null ? formatOgPrice(previous) : null },
  });
}
