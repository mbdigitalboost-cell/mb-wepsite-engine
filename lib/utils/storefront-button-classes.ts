/**
 * Faz 12 devamı — storefront'taki (checkout/hesap/ürün sayfaları) submit/CTA
 * butonları için v2 koyu tema class'ları. lib/utils/storefront-input-classes.ts
 * ile AYNI gerekçeyle AYRI bir dosya: paylaşımlı `components/ui/button.tsx`
 * `bg-brand-*` token'larıyla çalışıyor (ThemeProvider'ın set ettiği CSS
 * değişkenleri) — storefront'a henüz bir ThemeProvider bağlanmadığı için
 * (bkz. app/store/[storeSlug]/page.tsx'in kendi, hâlâ doğru notu) bu
 * token'lar hiçbir zaman set edilmiyor, yani o bileşen storefront'ta FİİLEN
 * STİLSİZ render oluyordu (arka plan rengi yok). Hero/CTA bantı/BrandFinderSection
 * gibi daha önce v2'ye taşınan her yer zaten bu yüzden generic Button'ı
 * KULLANMAMAYI tercih etmişti (hardcoded hex + düz <button>/<a>) — burada da
 * AYNI, zaten kurulu desen izleniyor.
 */
export const storefrontButtonClasses =
  "inline-flex h-12 items-center justify-center rounded-md bg-[#D95F00] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#F26A00] disabled:cursor-not-allowed disabled:opacity-50";

/** İkincil/outline aksiyon (ör. checkout'ta "Geri") — aynı boyut, ters renk. */
export const storefrontButtonOutlineClasses =
  "inline-flex h-12 items-center justify-center rounded-md border border-[#292929] bg-transparent px-6 text-sm font-semibold text-[#F5F5F5] transition-colors hover:border-[#D95F00] disabled:cursor-not-allowed disabled:opacity-50";
