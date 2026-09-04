import "server-only";

import type { NamedContentRow, SolutionRow, ProjectRow, CampaignRow, TestimonialRow, FaqRow, HeroSectionRow, SiteSettingsRow } from "@/lib/cms/customer-types";
import type { PetraSolution, PetraTestimonial, PetraFaq, PetraService, PetraProject, PetraCampaign, PetraContactInfo } from "@/lib/data/petra/types";

/**
 * Maps CUSTOMER CMS rows into the exact static Petra types the existing
 * section components already render (PetraSolution, PetraTestimonial,
 * PetraFaq, ...) — this is what lets Phase 6 §20 connect the data layer
 * to the CMS adapter WITHOUT rewriting any section component's
 * rendering logic. Every mapper here only runs when the adapter
 * genuinely returned CMS rows (not the static fallback) — see
 * `isCmsRow` below, used at each call site.
 *
 * Phase 6 wired solutions, testimonials, faqs, hero, and site_settings
 * (whatsapp only). Phase 9.2 adds services/projects/campaigns for the
 * `/hizmetler`, `/projeler`, `/kampanyalar` and `/cozumler/[slug]`
 * routes — see mapServiceRows/mapProjectRows/mapCampaignRows below for
 * the schema-gap notes on projects (`category`) and campaigns
 * (`priceLabel`/`ctaLabel`/`ctaHref`), and PHASE_9_2_RAPOR.md for the
 * full audit + planned migration.
 */

/** True only for a real CMS row (has `status`) — the adapter's fallback value never has this shape. */
export function isCmsRow(value: unknown): value is { status: string } {
  return typeof value === "object" && value !== null && "status" in value;
}

/**
 * Phase 9.6 (migration 0007) added `solutions.short_description`.
 * `shortDescription` now prefers it, falling back to `description` when
 * null (a CMS solution that hasn't had its short text filled in yet
 * shows the same text in both places — the pre-9.6 behavior — rather
 * than an empty card). `longDescription` is unchanged: `description`
 * remains the detail-page text.
 */
export function mapSolutionRows(rows: SolutionRow[]): PetraSolution[] {
  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    shortDescription: row.short_description ?? row.description ?? "",
    longDescription: row.description ?? row.short_description ?? "",
    image: row.image,
  }));
}

/**
 * `services` has the same shared shape as `solutions` (NamedContentRow),
 * but `PetraService` only ever rendered `title`/`description` on
 * `/hizmetler` — `slug`/`image`/`sort_order` exist on the CMS row but
 * have no static-type equivalent to map into, so they're simply unused
 * here (not a gap, `/hizmetler` never needed them).
 */
export function mapServiceRows(rows: NamedContentRow[]): PetraService[] {
  return rows.map((row) => ({
    title: row.title,
    description: row.description ?? "",
  }));
}

/**
 * Phase 9.6 (migration 0007) added `projects.category` — this now maps
 * straight through (still `null` when the customer hasn't set one;
 * `components/sections/projects.tsx` renders no badge in that case,
 * same as before, just no longer unconditionally null).
 */
export function mapProjectRows(rows: ProjectRow[]): PetraProject[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    image: row.image,
  }));
}

/**
 * Phase 9.6 (migration 0007) added `campaigns.price_label`/`cta_label`/
 * `cta_href`. `priceLabel` maps straight through (still `null` = no
 * price shown, same "never invent pricing" rule as before). `ctaLabel`/
 * `ctaHref` now prefer the per-campaign column but fall back to the
 * same engine-wide generic default used before this migration
 * ("İletişime Geç" → /iletisim) when the customer hasn't set an
 * override — so an existing/unedited campaign renders identically to
 * before.
 */
export function mapCampaignRows(rows: CampaignRow[]): PetraCampaign[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    priceLabel: row.price_label,
    ctaLabel: row.cta_label ?? "İletişime Geç",
    ctaHref: row.cta_href ?? "/iletisim",
    image: row.image,
  }));
}

export function mapTestimonialRows(rows: TestimonialRow[]): PetraTestimonial[] {
  return rows.map((row) => ({
    id: row.id,
    author: row.name,
    quote: row.quote,
    source: "direct",
  }));
}

export function mapFaqRows(rows: FaqRow[]): PetraFaq[] {
  return rows.map((row) => ({ question: row.question, answer: row.answer }));
}

export interface MappedHero {
  headingLines: string[];
  accentLineIndex: number;
  subtext: string;
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  ctaSecondaryLabel: string;
  backgroundImage: string | null;
  /**
   * Faz 9.9: CMS-uploaded hero images (via the Media/Storage system) are
   * expected to be clean photography, never pre-composed marketing
   * banners with baked-in text — so this is always `false` here. See
   * lib/data/petra/hero.ts for the one case (a customer-provided,
   * already-textified static fallback image) where it's `true`.
   */
  backgroundHasEmbeddedHeadline: boolean;
  /**
   * CMS-uploaded hero photos are plain, centered photography (see the
   * `backgroundHasEmbeddedHeadline` doc above) — always "center" here.
   * Only the static fallback image in lib/data/petra/hero.ts needs an
   * off-center crop (its baked-in content sits left-of-center).
   */
  backgroundObjectPosition: string;
  /**
   * Same reasoning as `backgroundObjectPosition` above — CMS hero photos
   * are plain centered photography with nothing that needs a distinct
   * mobile crop, so always `undefined` here (HeroBackground falls back
   * to `objectPosition`, i.e. "center", when this is omitted).
   */
  backgroundObjectPositionMobile: string | undefined;
  /**
   * CMS-uploaded hero images never have a separate mobile-specific crop
   * (see `backgroundImageMobile` on the static fallback for the one case
   * that does) — always `null` here, so `<HeroBackground>` falls back to
   * `backgroundImage` at every width.
   */
  backgroundImageMobile: string | null;
  /** Same reasoning as `backgroundHasEmbeddedHeadline` above — always `false` here. */
  backgroundHasEmbeddedHeadlineMobile: boolean;
  /**
   * CMS-uploaded hero photos never have a baked-in icon-caption row to
   * collide with (see `backgroundHasEmbeddedHeadline` doc above) — always
   * `undefined` here. Only the static fallback image in
   * lib/data/petra/hero.ts needs this.
   */
  trustInfoOffset: string | undefined;
  /** Same reasoning as `trustInfoOffset` above — CMS hero photos never need this. */
  ctaTopOffset: string | undefined;
  /** Same reasoning as `ctaTopOffset` above — CMS hero photos never need this. */
  ctaTopOffsetMobile: string | undefined;
  trustInfo: string[];
}

/**
 * Hero's static shape splits `heading` into multiple styled lines
 * (headingLines + accentLineIndex) and has a `trustInfo` list that
 * doesn't exist in the CMS row at all. A single CMS `heading` string is
 * rendered as one plain line (accentLineIndex -1 = no accent line) and
 * `trustInfo` always falls back to the static value — CMS has no
 * equivalent field for it, so nothing here invents one.
 */
export function mapHeroRow(row: HeroSectionRow, fallbackTrustInfo: string[]): MappedHero {
  return {
    headingLines: [row.heading],
    accentLineIndex: -1,
    subtext: row.subtext ?? "",
    ctaPrimaryLabel: row.cta_primary_label ?? "",
    ctaPrimaryHref: row.cta_primary_href ?? "/iletisim",
    ctaSecondaryLabel: row.cta_secondary_label ?? "",
    backgroundImage: row.background_image,
    backgroundHasEmbeddedHeadline: false,
    backgroundObjectPosition: "center",
    backgroundObjectPositionMobile: undefined,
    backgroundImageMobile: null,
    backgroundHasEmbeddedHeadlineMobile: false,
    trustInfoOffset: undefined,
    ctaTopOffset: undefined,
    ctaTopOffsetMobile: undefined,
    trustInfo: fallbackTrustInfo,
  };
}

/** Only the whatsapp field is used today (homepage CTA) — the rest of site_settings isn't wired to any page yet this phase. */
export function mapSiteSettingsWhatsapp(row: SiteSettingsRow): string | null {
  return row.whatsapp;
}

/**
 * Faz 4B — public layout'un header/footer/floating WhatsApp/mobile CTA
 * zincirinin ortak kaynağı. Her alan BAĞIMSIZ olarak kendi statik
 * karşılığına düşer (satırın tamamı değil, tek tek alanlar) — bir
 * müşteri sadece `whatsapp`'ı doldurup `email`'i boş bırakabilir, bu
 * durumda `email` hâlâ statik `fallback.email`'i gösterir. `phoneDisplay`
 * ayrı bir DB kolonu değil — statik veride olduğu gibi `phone` ile aynı
 * değeri taşır. `mapUrl`'nin site_settings'te hiç karşılığı yok (adres
 * metni var ama Google Maps koordinat linki yok), bu yüzden her zaman
 * statik kalır.
 */
export function mapSiteSettingsContactInfo(row: SiteSettingsRow, fallback: PetraContactInfo): PetraContactInfo {
  return {
    phone: row.phone ?? fallback.phone,
    phoneDisplay: row.phone ?? fallback.phoneDisplay,
    whatsapp: row.whatsapp ?? fallback.whatsapp,
    email: row.email ?? fallback.email,
    address: row.address ?? fallback.address,
    serviceArea: row.service_area ?? fallback.serviceArea,
    workingHours: row.working_hours ?? fallback.workingHours,
    mapUrl: fallback.mapUrl,
  };
}
