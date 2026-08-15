import "server-only";

import type { NamedContentRow, TestimonialRow, FaqRow, HeroSectionRow, SiteSettingsRow } from "@/lib/cms/customer-types";
import type { PetraSolution, PetraTestimonial, PetraFaq, PetraService, PetraProject, PetraCampaign } from "@/lib/data/petra/types";

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

export function mapSolutionRows(rows: NamedContentRow[]): PetraSolution[] {
  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    shortDescription: row.description ?? "",
    longDescription: row.description ?? "",
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
 * `projects` (customer-template migration 0002) has NO `category`
 * column — only title/slug/description/image/sort_order/status. The
 * static `PetraProject.category` field genuinely has no CMS source
 * today, so this maps it to `null` (never an invented label) and
 * `components/sections/projects.tsx` renders no category badge when
 * `category` is null. A `category` column is proposed as a planned,
 * NOT-YET-APPLIED migration — see PHASE_9_2_RAPOR.md.
 */
export function mapProjectRows(rows: NamedContentRow[]): PetraProject[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    category: null,
    image: row.image,
  }));
}

/**
 * `campaigns` (customer-template migration 0002) has NO
 * `price_label`/`cta_label`/`cta_href` columns. `priceLabel` maps to
 * `null` (the component already renders nothing when it's null — same
 * "never invent pricing" rule as the static petraCampaigns data).
 * `ctaLabel`/`ctaHref` are NOT customer-specific facts — they're the
 * same generic "go talk to us" UI affordance used elsewhere on this site
 * (e.g. the solution detail page's "Keşif Talep Et" → /iletisim button),
 * so a fixed engine-level default is used rather than leaving the button
 * broken. Per-campaign CTA override is proposed as a planned,
 * NOT-YET-APPLIED migration — see PHASE_9_2_RAPOR.md.
 */
export function mapCampaignRows(rows: NamedContentRow[]): PetraCampaign[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    priceLabel: null,
    ctaLabel: "İletişime Geç",
    ctaHref: "/iletisim",
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
    trustInfo: fallbackTrustInfo,
  };
}

/** Only the whatsapp field is used today (homepage CTA) — the rest of site_settings isn't wired to any page yet this phase. */
export function mapSiteSettingsWhatsapp(row: SiteSettingsRow): string | null {
  return row.whatsapp;
}
