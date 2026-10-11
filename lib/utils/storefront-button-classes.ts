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
 *
 * Site geneli tasarım sistemi (Faz 12 devamı — hamburgerden ödemeye kadar) —
 * pill şekli (rounded-full) + Oswald (font-store-display) + uppercase/
 * letter-spacing, tasarım kanvasının `.pill`/`.pill-accent` class'larıyla
 * aynı yön. `text-[#1A0D00]` (koyu, neredeyse siyah metin) — kanvasın kendi
 * `--accent-ink` kararı: turuncu (#D95F00) zemin üzerinde BEYAZ metin WCAG
 * AA kontrastını geçemiyor (~2.7:1), bu koyu ton ~8:1 ile rahatça geçiyor —
 * estetik bir tercih değil, erişilebilirlik gerekçeli bir değişiklik.
 */
export const storefrontButtonClasses =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#D95F00] px-7 font-store-display text-sm font-semibold uppercase tracking-wide text-[#1A0D00] transition-colors hover:bg-[#F26A00] disabled:cursor-not-allowed disabled:opacity-50";

/** İkincil/outline aksiyon (ör. checkout'ta "Geri") — aynı boyut/şekil, ters renk. */
export const storefrontButtonOutlineClasses =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-[#3A3A3A] bg-transparent px-7 font-store-display text-sm font-semibold uppercase tracking-wide text-[#F5F5F5] transition-colors hover:border-[#D95F00] hover:text-[#D95F00] disabled:cursor-not-allowed disabled:opacity-50";
