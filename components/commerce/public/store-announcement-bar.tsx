import { announcementBarItems } from "@/lib/commerce/storefront-texts";
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
 *
 * Faz 39 — mağazaya özel maddeler artık kodda sabit DEĞİL: mağazanın
 * `store_storefront_texts.announcement_items` alanından gelir (admin →
 * Ayarlar → Vitrin metinleri). Madde yoksa gösterilmez; şeritte hiç madde
 * kalmazsa şeridin kendisi de render edilmez.
 */
/** Faz 37 Kısım D — yalnız mağazada iade AÇIKKEN gösterilir (store_return_settings.returns_enabled). */
const RETURNS_CLAIM = "Kolay İade";

/**
 * Faz 31 — "… TL Üzeri Ücretsiz Kargo" artık sabit kod değil: mağazanın kargo
 * ücreti ayarından (lib/commerce/shipping-fee.ts freeShippingClaim). Sınır
 * yoksa ya da kargo ücreti alınmıyorsa bu iddia hiç gösterilmez.
 */
export function StoreAnnouncementBar({
  freeShippingClaim,
  returnsEnabled,
  storeItems,
}: {
  freeShippingClaim: string | null;
  returnsEnabled: boolean;
  storeItems: readonly string[];
}) {
  const ANNOUNCEMENT_ITEMS = announcementBarItems({ freeShippingClaim, returnsClaim: returnsEnabled ? RETURNS_CLAIM : null, storeItems });
  if (ANNOUNCEMENT_ITEMS.length === 0) return null;
  return (
    <div className="border-b border-[#292929] bg-black print:hidden">
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
