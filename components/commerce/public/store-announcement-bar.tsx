import { storefrontMonoClasses } from "@/lib/utils/storefront-typography";

/**
 * Devir metni v2 — kanvasta (Main.dc.html) bu şerit KAYMIYOR: tek satır,
 * ortalanmış, mono/uppercase, `#000` zemin üzerinde ("utility bar").
 * Canlı sitede ÖNCEDEN sağdan sola sürekli akan bir marquee'ydi
 * (kullanıcının "bu kanvasta yok" diye işaretlediği fark) — animasyon
 * kaldırıldı, SADECE yerleşim/stil kanvasa göre sadeleştirildi; İÇERİK
 * (4 gerçek/onaylı ifade) DEĞİŞMEDİ, aynı metinler korundu (taktikalp46-
 * homepage-sections.tsx'teki TrustBadgesSection ile BİREBİR aynı 4 ifade
 * — iki yerde de aynı metin, birbirinden sapmasın).
 *
 * Site geneli: app/store/[storeSlug]/layout.tsx'ten, StoreHeader'ın
 * HEMEN ÜSTÜNDE render ediliyor — her storefront sayfasında görünür.
 * Sabit, onaylı metin; per-store veri yok, bu yüzden props almıyor.
 */
const ANNOUNCEMENT_ITEMS = [
  "2.000 TL Üzeri Ücretsiz Kargo",
  "Kolay İade",
  "Güvenli Ödeme",
  "Kendi Ürettiğimiz Kydex Kalitesi",
];

export function StoreAnnouncementBar() {
  return (
    <div className="border-b border-[#292929] bg-black">
      <div className="mx-auto flex h-[34px] max-w-6xl flex-wrap items-center justify-center gap-x-3 px-4 text-center">
        {ANNOUNCEMENT_ITEMS.map((item, index) => (
          <span key={item} className={`${storefrontMonoClasses} flex items-center gap-3 text-[10.5px] uppercase text-[#A3A3A3]`}>
            {index > 0 ? <span aria-hidden="true" className="text-[#D95F00]">·</span> : null}
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
