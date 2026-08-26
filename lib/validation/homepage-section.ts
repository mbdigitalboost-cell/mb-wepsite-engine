import { z } from "zod";
import { optionalSafeNavigationUrlSchema } from "@/lib/validation/safe-url";

/**
 * PHASE 2 — Homepage Builder (store_editor+ writes; permanent delete is
 * store_admin+ only — same split as navigation, see migration 0011).
 *
 * Common fields (internalLabel/title/description/imageUrl/linkUrl) are
 * REAL columns, not jsonb — 2026-08-25 karar madde 7's field list, taken
 * literally. `config` is per-section-type EXTRA data only, and — per the
 * same decision — never raw HTML/JS: each section type gets its own small,
 * named config schema below (most are empty today, since no
 * product/category module exists yet to reference), the same
 * one-schema-per-type shape as `buildContentFormSchema` in
 * lib/validation/content.ts, but keyed by `section_type_key` instead of a
 * content type.
 */
export const HOMEPAGE_SECTION_TYPE_KEYS = [
  "hero",
  "featured_categories",
  "featured_products",
  "campaign_banner",
  "trust_benefits",
  "brands",
  "testimonials",
  "custom_content",
  "cta",
  "footer",
] as const;

export type HomepageSectionTypeKey = (typeof HOMEPAGE_SECTION_TYPE_KEYS)[number];

export function isHomepageSectionTypeKey(value: string): value is HomepageSectionTypeKey {
  return (HOMEPAGE_SECTION_TYPE_KEYS as readonly string[]).includes(value);
}

const emptyConfigSchema = z.object({}).strict();

/** hero'nun ikincil CTA'sı — tek istisna, migration 0011'in dosya başı yorumunda örnek olarak geçiyor. */
const heroConfigSchema = z.object({
  secondaryCtaLabel: z.string().trim().max(100).optional().or(z.literal("")),
  // PHASE 2 CRITICAL REMEDIATION (CRITICAL 1, kısım C) — bkz.
  // lib/validation/safe-url.ts; navigation `url` ile AYNI allowlist.
  secondaryCtaHref: optionalSafeNavigationUrlSchema(500),
});

export const HOMEPAGE_SECTION_CONFIG_SCHEMAS: Record<HomepageSectionTypeKey, z.ZodTypeAny> = {
  hero: heroConfigSchema,
  featured_categories: emptyConfigSchema,
  featured_products: emptyConfigSchema,
  campaign_banner: emptyConfigSchema,
  trust_benefits: emptyConfigSchema,
  brands: emptyConfigSchema,
  testimonials: emptyConfigSchema,
  custom_content: emptyConfigSchema,
  cta: emptyConfigSchema,
  footer: emptyConfigSchema,
};

export const homepageSectionFormSchema = z.object({
  sectionTypeKey: z.enum(HOMEPAGE_SECTION_TYPE_KEYS, { message: "Geçerli bir bölüm tipi seçin." }),
  internalLabel: z.string().trim().max(150).optional().or(z.literal("")),
  title: z.string().trim().max(300).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  imageUrl: z.string().trim().max(500).url("Geçerli bir URL olmalı.").optional().or(z.literal("")),
  // PHASE 2 CRITICAL REMEDIATION (CRITICAL 1, kısım C) — bkz. lib/validation/safe-url.ts.
  linkUrl: optionalSafeNavigationUrlSchema(500),
  isActive: z.coerce.boolean().default(true),
});

/** Same server-side-recompute rule as navigation — see lib/validation/store-navigation.ts. */
export const homepageSectionReorderSchema = z.object({
  storeId: z.string().uuid(),
  orderedSectionIds: z.array(z.string().uuid()).min(1),
});
