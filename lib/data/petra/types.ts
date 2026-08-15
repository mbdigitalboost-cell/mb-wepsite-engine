/**
 * Petra Mühendislik content types.
 *
 * Convention used across every file in `lib/data/petra/`: a field that
 * has not been confirmed by the customer is `null` (never a plausible-
 * looking placeholder value). Components must treat `null`/empty arrays
 * as "don't render this", not "render a made-up default".
 */

export interface PetraContactInfo {
  phone: string | null;
  phoneDisplay: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  /** Broad service area, confirmed via the customer's Instagram profile. */
  serviceArea: string | null;
  workingHours: string | null;
}

export interface PetraSocialLink {
  platform: "instagram" | "facebook" | "linkedin" | "youtube";
  url: string;
  label: string;
}

export interface PetraNavLink {
  href: string;
  label: string;
}

export interface PetraSolution {
  slug: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  /** Relative to /public, e.g. "/images/petra/solutions/split.webp". Null until a real asset exists. */
  image: string | null;
}

export interface PetraService {
  title: string;
  description: string;
}

export interface PetraProcessStep {
  index: string; // "01".."04"
  title: string;
  description: string;
}

export interface PetraProject {
  id: string;
  title: string;
  category: string;
  image: string | null;
}

export interface PetraCampaign {
  id: string;
  title: string;
  description: string;
  /** e.g. "50.900 TL'den başlayan fiyatlarla" — null until customer confirms real pricing. */
  priceLabel: string | null;
  ctaLabel: string;
  ctaHref: string;
  image: string | null;
}

export interface PetraTestimonial {
  id: string;
  author: string;
  quote: string;
  source: "google" | "direct";
}

export interface PetraFaq {
  question: string;
  answer: string;
}

export interface PetraStatistic {
  value: number;
  suffix: string;
  label: string;
}

export interface PetraTrustItem {
  title: string;
  description: string;
}
