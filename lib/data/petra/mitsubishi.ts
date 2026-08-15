/**
 * Petra's materials reference Mitsubishi Heavy, but "yetkili bayi/servis"
 * status is not confirmed to a standard we're willing to publish as a
 * factual/legal claim. `dealerStatusVerified` gates that stronger wording
 * everywhere it's used — flip it only once the customer confirms.
 */
export const petraMitsubishi = {
  brandName: "Mitsubishi Heavy",
  dealerStatusVerified: false,
  heading: "Güvenilir iklimlendirme. Profesyonel çözüm.",
  /** Used only while dealerStatusVerified is false. */
  neutralDescription: "Petra Mühendislik, Mitsubishi Heavy ürünlerini müşterilerine sunar.",
  /** Used only once dealerStatusVerified is true — do not use otherwise. */
  verifiedDealerDescription: "Petra Mühendislik, Mitsubishi Heavy'nin yetkili bayi ve servisidir.",
  ctaLabel: "Ürünleri İncele",
  ctaHref: "/cozumler",
  /** Only used if a real, license-cleared brand asset is provided, e.g. "/images/petra/services/mitsubishi-heavy.webp". */
  image: null as string | null,
};
