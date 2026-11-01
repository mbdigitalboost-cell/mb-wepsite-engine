"use client";

/**
 * Siparişler: Toplu Durum Değiştirme devir metni — "tümünü seç" checkbox'ı.
 * Tek iş: tıklanınca aynı sayfadaki (name="orderIds") TÜM checkbox'ları
 * kendi işaretli durumuna eşitler. Sayfa başına tek böyle checkbox/form
 * olduğu için document.querySelectorAll ile global sorgu güvenli/yeterli
 * — ekstra bir ref/context mekanizması gerekmiyor (products/page.tsx'in
 * bulk formunun AKSİNE, orada "tümünü seç" yoktu, burada devir metni
 * özellikle istedi).
 */
export function SelectAllCheckbox() {
  return (
    <input
      type="checkbox"
      aria-label="Tümünü seç"
      className="h-4 w-4 shrink-0 rounded border-black/20"
      onChange={(event) => {
        document.querySelectorAll<HTMLInputElement>('input[name="orderIds"]').forEach((checkbox) => {
          checkbox.checked = event.target.checked;
        });
      }}
    />
  );
}
