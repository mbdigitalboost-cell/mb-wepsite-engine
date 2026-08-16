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
 */
export const petraSolutions: PetraSolution[] = [
  {
    slug: "split-klimalar",
    title: "Split Klimalar",
    shortDescription: "Yüksek performans ve sessiz çalışma ile ideal konfor.",
    longDescription:
      "Split klima sistemleri, tek bir iç ve dış üniteden oluşan, konut ve küçük ölçekli ticari mekanlar için uygun iklimlendirme çözümüdür.",
    image: "/images/petra/solutions/10_split_klimalar_v3.jpg",
  },
  {
    slug: "multi-split-klimalar",
    title: "Multi-Split Sistemler",
    shortDescription: "Tek dış ünite ile birden fazla alanı iklimlendirin.",
    longDescription:
      "Multi-split sistemler, tek bir dış üniteye bağlı birden fazla iç ünite ile farklı odaların bağımsız şekilde iklimlendirilmesini sağlar.",
    image: "/images/petra/solutions/10_multi_split_sistemler_v1.jpg",
  },
  {
    slug: "profesyonel-klimalar",
    title: "Profesyonel Klimalar",
    shortDescription: "Ticari ve endüstriyel alanlar için yüksek kapasiteli çözümler.",
    longDescription:
      "Ofis, mağaza ve endüstriyel alanlar gibi daha büyük mekanlar için tasarlanmış, yüksek kapasiteli profesyonel klima sistemleri.",
    // No candidate image supplied yet.
    image: null,
  },
  {
    slug: "vrf-sistemleri",
    title: "VRF Sistemleri",
    shortDescription: "Büyük yapılara akıllı, esnek ve verimli çözümler.",
    longDescription:
      "VRF (Variable Refrigerant Flow) sistemleri, büyük binalarda farklı bölgelerin bağımsız ve verimli şekilde iklimlendirilmesini sağlayan gelişmiş bir teknolojidir.",
    image: "/images/petra/solutions/10_vrf_sistemleri_v3.jpg",
  },
  {
    slug: "isi-pompalari",
    title: "Isı Pompaları",
    shortDescription: "Doğadan enerji alarak yüksek verimlilik sağlayın.",
    longDescription:
      "Isı pompaları, çevredeki havadan ısı enerjisi transfer ederek hem ısıtma hem soğutma yapabilen, enerji verimliliği yüksek sistemlerdir.",
    image: "/images/petra/solutions/10_isi_pompalari_v1.jpg",
  },
  {
    slug: "sicak-su-sistemleri",
    title: "Sıcak Su Sistemleri",
    shortDescription: "Güvenilir ve kesintisiz sıcak su çözümleri.",
    longDescription:
      "Konut ve ticari yapılar için verimli ve sürdürülebilir sıcak su üretim çözümleri.",
    image: "/images/petra/solutions/10_sicak_su_sistemleri_v3.jpg",
  },
];

export function getPetraSolutionBySlug(slug: string): PetraSolution | undefined {
  return petraSolutions.find((solution) => solution.slug === slug);
}
