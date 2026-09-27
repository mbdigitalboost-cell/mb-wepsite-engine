/**
 * FAZ 7.3 follow-up — sağdan sola sürekli akan, ince duyuru şeridi.
 * Site geneli: app/store/[storeSlug]/layout.tsx'ten, StoreHeader'ın
 * HEMEN ÜSTÜNDE render ediliyor (layout.tsx paylaşımlı olduğu için
 * /kategoriler, /silahini-sec, /hesap dahil her storefront sayfasında
 * görünür — bu istenen davranış). Sabit, onaylı metin; per-store veri
 * yok, bu yüzden props almıyor.
 *
 * Saf CSS animasyonu (`animate-storefront-marquee`, app/globals.css) —
 * JS state yok, Server Component olarak kalabiliyor. Metin, tek kopyanın
 * boşluksuz akması için aynı dizi 3 kez tekrarlanıyor, sonra o blok
 * seamless loop için bir kez daha (aria-hidden) kopyalanıyor — bkz.
 * globals.css'teki keyframe yorumu.
 */
const ANNOUNCEMENT_ITEMS = [
  "2.000 TL Üzeri Ücretsiz Kargo",
  "Kolay İade",
  "Güvenli Ödeme",
  "Kendi Ürettiğimiz Kydex Kalitesi",
];

function AnnouncementRun({ hidden = false }: { hidden?: boolean }) {
  const repeated = [...ANNOUNCEMENT_ITEMS, ...ANNOUNCEMENT_ITEMS, ...ANNOUNCEMENT_ITEMS];
  return (
    <span
      aria-hidden={hidden}
      className="flex shrink-0 items-center gap-3 px-3 text-[12px] font-medium tracking-wide text-[#F5F5F5]"
    >
      {repeated.map((item, index) => (
        <span key={index} className="flex items-center gap-3">
          {item}
          <span aria-hidden="true" className="text-[#D95F00]">
            •
          </span>
        </span>
      ))}
    </span>
  );
}

export function StoreAnnouncementBar() {
  return (
    <div className="h-8 overflow-hidden border-b border-[#292929] bg-[#111111]" role="marquee" aria-label="Duyurular">
      <div className="flex h-full w-max items-center animate-storefront-marquee">
        <AnnouncementRun />
        <AnnouncementRun hidden />
      </div>
    </div>
  );
}
