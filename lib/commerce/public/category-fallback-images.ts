/**
 * FAZ 7.3 follow-up — pulled out of app/store/[storeSlug]/kategoriler/page.tsx
 * (where this map first shipped) since the homepage's own "Kydex Koleksiyonu"
 * section now needs the exact same slug → static file mapping for 4 of these
 * 8 illustrative/category-navigation images. A single shared constant means
 * both places can never drift apart. Real product photography — never used
 * on a product detail page, see the original comment where these files were
 * added. `category.imageUrl` (the DB field) still wins wherever a caller
 * checks it first; this is only ever a fallback.
 */
export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  "silah-kiliflari": "/images/categories/silah-kiliflari.jpg",
  "bicak-kiliflari": "/images/categories/bicak-kiliflari.jpg",
  "sarjor-kiliflari": "/images/categories/sarjor-kiliflari.jpg",
  giyim: "/images/categories/giyim.jpg",
  canta: "/images/categories/canta.jpg",
  "palaska-ve-kemer": "/images/categories/palaska-ve-kemer.jpg",
  "edc-ve-gunluk-tasima": "/images/categories/edc-ve-gunluk-tasima.jpg",
  "kampanyali-urunler": "/images/categories/kampanyali-urunler.jpg",
  // Faz 26 — tasarım setinden gerçek görsel (Faz 24'teki geçici koyu zemin değiştirildi).
  "bel-klipsleri-ve-tokalar": "/images/categories/bel-klipsleri-ve-tokalar.jpg",
};

/**
 * Faz 26 — /kategoriler sayfasının geniş banner seti (≈3:1). Kategori adı,
 * slogan, "Keşfet" ve logo GÖRSELİN İÇİNDE basılı; bu yüzden o sayfa kod
 * yazısı göstermez, erişilebilir ad alt/aria-label'dan gelir. Burada
 * olmayan bir kategori (ileride eklenen) 4:3 kart olarak gösterilir.
 */
export const CATEGORY_BANNER_IMAGES: Record<string, string> = {
  "silah-kiliflari": "/images/categories/banner/silah-kiliflari.jpg",
  "bicak-kiliflari": "/images/categories/banner/bicak-kiliflari.jpg",
  "sarjor-kiliflari": "/images/categories/banner/sarjor-kiliflari.jpg",
  giyim: "/images/categories/banner/giyim.jpg",
  canta: "/images/categories/banner/canta.jpg",
  "palaska-ve-kemer": "/images/categories/banner/palaska-ve-kemer.jpg",
  "edc-ve-gunluk-tasima": "/images/categories/banner/edc-ve-gunluk-tasima.jpg",
  "bel-klipsleri-ve-tokalar": "/images/categories/banner/bel-klipsleri-ve-tokalar.jpg",
  "kampanyali-urunler": "/images/categories/banner/kampanyali-urunler.jpg",
};
