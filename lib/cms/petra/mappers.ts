import "server-only";

import type { NamedContentRow, TestimonialRow, FaqRow, HeroSectionRow, SiteSettingsRow } from "@/lib/cms/customer-types";
import type { PetraSolution, PetraTestimonial, PetraFaq } from "@/lib/data/petra/types";

/**
 * Maps CUSTOMER CMS rows into the exact static Petra types the existing
 * section components already render (PetraSolution, PetraTestimonial,
 * PetraFaq, ...) — this is what lets Phase 6 §20 connect the data layer
 * to the CMS adapter WITHOUT rewriting any section component's
 * rendering logic. Every mapper here only runs when the adapter
 * genuinely returned CMS rows (not the static fallback) — see
 * `isCmsRow` below, used at each call site in app/(public)/page.tsx.
 *
 * Only wired for content types whose CMS schema shape actually matches
 * what the existing components need one-to-one: solutions, testimonials,
 * faqs, hero, and site_settings (whatsapp only, for the homepage's
 * WhatsApp CTA). Services/Projects/Campaigns are deliberately NOT mapped
 * here yet — see the Phase 6 report for why (schema/page-scope
 * mismatches), this is a controlled, documented scope cut, not an
 * oversight.
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
