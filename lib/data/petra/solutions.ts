import type { PetraSolution } from "@/lib/data/petra/types";

/**
 * These 6 categories come from the customer's own material (confirmed in
 * the brief). `profesyonel-klimalar` stays `image: null` — no candidate
 * image has been supplied for it yet.
 *
 * Faz 12 revizyon: customer-provided high-resolution photo pack
 * (PETRA_Iklimlendirme_Gorselleri.zip, 2026-08-16) replaced the old
 * low-res v2 pack for split-klimalar/vrf-sistemleri/sicak-su-sistemleri
 * and filled in multi-split-klimalar (previously null — the earlier v2
 * pack's multi-split candidate showed a third-party equipment-brand logo
 * and was excluded; this new photo doesn't). `isi-pompalari` also stays
 * excluded from this note going forward since it now has a real image
 * too. Each source photo had its own baked-in title/caption text (meant
 * for a different composite layout) — removed via inpainting (same
 * approach as the hero banner's baked-in buttons) since this card
 * component (components/sections/solutions.tsx) already renders its own
 * real title/description on top of the image; titles/descriptions below
 * were updated to match the wording from each photo's original caption
 * per the customer's direction, not invented.
 *
 * Faz H-devam revizyon (2026-08-22, `petracozumlergorselleriv2.zip`):
 * kullanıcı, `PETRA_COZUM_GORSEL_URETIM_TALIMATI.md` (v2) spesifikasyonuna
 * göre 6 kategori için de yeni, gerçekten dikey (3:4, 2000×2667px) görsel
 * teslim etti — önceki `_v1`/`_v3` dosyaları (hepsi 1200×800, yatay/
 * kırpma-güvenli-olmayan) tamamen bu yeni `_v2`/`_v4` dosyalarla
 * değiştirildi. Teslim öncesi doğrulama: (1) piksel çözünürlüğü tek tek
 * `identify` ile kontrol edildi (6/6 tam olarak 2000×2667), (2) her
 * görsel tam boyutta VE cihazın gövdesine yakın kırpılmış halinde marka
 * logosu/okunur metin/filigran açısından incelendi — hiçbirinde okunur
 * bir marka adı veya metin bulunamadı (sadece gerçekçi, standart
 * kontrol panelleri/etiketler var, bunlar okunaksız ve marka iddiası
 * taşımıyor), (3) gerçek kart oranına (230×290px, object-cover) göre
 * Python/PIL ile kırpma simülasyonu yapıldı — 6 görselde de cihaz
 * kesilmiyor, alt kısımda (sitenin kendi gradient+başlık katmanının
 * kapatacağı bölge) önemli cihaz detayı yok. Dosya adları, projenin
 * mevcut `10_<slug>_vN.jpg` kuralına uydurulmak için kullanıcının teslim
 * ettiği düz isimlerden (`split-klimalar.jpg` vb.) yeniden adlandırıldı;
 * içerik birebir aynı, sadece dosya adı değişti.
 */
export const petraSolutions: PetraSolution[] = [
  {
    slug: "split-klimalar",
    title: "Split Klimalar",
    shortDescription: "Yüksek performans ve sessiz çalışma ile ideal konfor.",
    longDescription:
      "Split klima sistemleri, tek bir iç ve dış üniteden oluşan, konut ve küçük ölçekli ticari mekanlar için uygun iklimlendirme çözümüdür.",
    image: "/images/petra/solutions/10_split_klimalar_v4.jpg",
  },
  {
    slug: "multi-split-klimalar",
    title: "Multi-Split Sistemler",
    shortDescription: "Tek dış ünite ile birden fazla alanı iklimlendirin.",
    longDescription:
      "Multi-split sistemler, tek bir dış üniteye bağlı birden fazla iç ünite ile farklı odaların bağımsız şekilde iklimlendirilmesini sağlar.",
    image: "/images/petra/solutions/10_multi_split_sistemler_v2.jpg",
  },
  {
    slug: "profesyonel-klimalar",
    title: "Profesyonel Klimalar",
    shortDescription: "Ticari ve endüstriyel alanlar için yüksek kapasiteli çözümler.",
    longDescription:
      "Ofis, mağaza ve endüstriyel alanlar gibi daha büyük mekanlar için tasarlanmış, yüksek kapasiteli profesyonel klima sistemleri.",
    // Faz 12 revizyon 2 (2026-08-17): 1200x800 ilk gerçek görsel eklendi.
    // Faz H-devam revizyonu (2026-08-22): bkz. dosya başındaki not — bu
    // dosya da yeni dikey (2000x2667) `_v2` görseliyle değiştirildi.
    image: "/images/petra/solutions/10_profesyonel_klimalar_v2.jpg",
  },
  {
    slug: "vrf-sistemleri",
    title: "VRF Sistemleri",
    shortDescription: "Büyük yapılara akıllı, esnek ve verimli çözümler.",
    longDescription:
      "VRF (Variable Refrigerant Flow) sistemleri, büyük binalarda farklı bölgelerin bağımsız ve verimli şekilde iklimlendirilmesini sağlayan gelişmiş bir teknolojidir.",
    image: "/images/petra/solutions/10_vrf_sistemleri_v4.jpg",
  },
  {
    slug: "isi-pompalari",
    title: "Isı Pompaları",
    shortDescription: "Doğadan enerji alarak yüksek verimlilik sağlayın.",
    longDescription:
      "Isı pompaları, çevredeki havadan ısı enerjisi transfer ederek hem ısıtma hem soğutma yapabilen, enerji verimliliği yüksek sistemlerdir.",
    image: "/images/petra/solutions/10_isi_pompalari_v2.jpg",
  },
  {
    slug: "sicak-su-sistemleri",
    title: "Sıcak Su Sistemleri",
    shortDescription: "Güvenilir ve kesintisiz sıcak su çözümleri.",
    longDescription:
      "Konut ve ticari yapılar için verimli ve sürdürülebilir sıcak su üretim çözümleri.",
    image: "/images/petra/solutions/10_sicak_su_sistemleri_v4.jpg",
  },
];

export function getPetraSolutionBySlug(slug: string): PetraSolution | undefined {
  return petraSolutions.find((solution) => solution.slug === slug);
}
