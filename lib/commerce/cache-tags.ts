/**
 * PHASE 2 — public storefront cache tag adları. Sabit bir path listesi
 * (`revalidatePath`) YOK çünkü hangi mağaza/slug'ların var olacağı önceden
 * bilinmiyor (bkz. PHASE_2_FINAL_ARCHITECTURE_PLAN.md §H) — bunun yerine
 * her admin mutation'ı ilgili tag'i `revalidateTag(tag, 'max')` ile
 * geçersiz kılar (Next.js 16'da tek argümanlı `revalidateTag(tag)` artık
 * deprecated — Context7 üzerinden doğrulandı, bkz. vercel/next.js
 * "Update revalidateTag signature to include cacheLife profile").
 *
 * Bu dosya sadece tag ADLARINI standartlaştırıyor — storefront sayfaları
 * (henüz bu fazın kapsamında değil, bkz. final rapor) bu tag'lerle
 * `fetch`/`unstable_cache` üzerinden veri çekecek.
 */
export function storeProfileTag(storeId: string) {
  return `store:${storeId}:profile`;
}

export function storeSettingsTag(storeId: string) {
  return `store:${storeId}:settings`;
}

export function storeBrandingTag(storeId: string) {
  return `store:${storeId}:branding`;
}

export function storeNavigationTag(storeId: string) {
  return `store:${storeId}:navigation`;
}

export function storeHomepageTag(storeId: string) {
  return `store:${storeId}:homepage`;
}
