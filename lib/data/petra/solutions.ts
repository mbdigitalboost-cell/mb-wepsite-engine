import type { PetraSolution } from "@/lib/data/petra/types";

/**
 * These 6 categories come from the customer's own material (confirmed in
 * the brief). Images are `null` — real photography/renders needed before
 * these can ship; see public/images/petra/README.md. Expected filenames
 * (authoritative per the Final Asset Implementation Brief), all under
 * /images/petra/solutions/: split-klima.webp, multi-split-klima.webp,
 * profesyonel-klima.webp, vrf-sistemleri.webp, isi-pompasi.webp,
 * sicak-su-sistemleri.webp.
 */
export const petraSolutions: PetraSolution[] = [
  {
    slug: "split-klimalar",
    title: "Split Klimalar",
    shortDescription: "Konut ve küçük ticari alanlar için verimli iklimlendirme.",
    longDescription:
      "Split klima sistemleri, tek bir iç ve dış üniteden oluşan, konut ve küçük ölçekli ticari mekanlar için uygun iklimlendirme çözümüdür.",
    // Expected: /images/petra/solutions/split-klima.webp
    image: null,
  },
  {
    slug: "multi-split-klimalar",
    title: "Multi-Split Klimalar",
    shortDescription: "Tek dış üniteyle birden fazla odayı iklimlendirin.",
    longDescription:
      "Multi-split sistemler, tek bir dış üniteye bağlı birden fazla iç ünite ile farklı odaların bağımsız şekilde iklimlendirilmesini sağlar.",
    // Expected: /images/petra/solutions/multi-split-klima.webp
    image: null,
  },
  {
    slug: "profesyonel-klimalar",
    title: "Profesyonel Klimalar",
    shortDescription: "Ticari ve endüstriyel alanlar için yüksek kapasiteli çözümler.",
    longDescription:
      "Ofis, mağaza ve endüstriyel alanlar gibi daha büyük mekanlar için tasarlanmış, yüksek kapasiteli profesyonel klima sistemleri.",
    // Expected: /images/petra/solutions/profesyonel-klima.webp
    image: null,
  },
  {
    slug: "vrf-sistemleri",
    title: "VRF Sistemleri",
    shortDescription: "Büyük yapılar için değişken soğutucu akışkan debili sistemler.",
    longDescription:
      "VRF (Variable Refrigerant Flow) sistemleri, büyük binalarda farklı bölgelerin bağımsız ve verimli şekilde iklimlendirilmesini sağlayan gelişmiş bir teknolojidir.",
    // Expected: /images/petra/solutions/vrf-sistemleri.webp
    image: null,
  },
  {
    slug: "isi-pompalari",
    title: "Isı Pompaları",
    shortDescription: "Enerji verimli ısıtma ve soğutma çözümü.",
    longDescription:
      "Isı pompaları, çevredeki havadan ısı enerjisi transfer ederek hem ısıtma hem soğutma yapabilen, enerji verimliliği yüksek sistemlerdir.",
    // Expected: /images/petra/solutions/isi-pompasi.webp
    image: null,
  },
  {
    slug: "sicak-su-sistemleri",
    title: "Sıcak Su Sistemleri",
    shortDescription: "Konut ve ticari kullanım için sıcak su üretim sistemleri.",
    longDescription:
      "Konut ve ticari yapılar için verimli ve sürdürülebilir sıcak su üretim çözümleri.",
    // Expected: /images/petra/solutions/sicak-su-sistemleri.webp
    image: null,
  },
];

export function getPetraSolutionBySlug(slug: string): PetraSolution | undefined {
  return petraSolutions.find((solution) => solution.slug === slug);
}
