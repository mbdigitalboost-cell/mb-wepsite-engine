/**
 * Config-driven definition of the 6 "list of items, each with a
 * draft/published/archived status and a sort_order" content types:
 * services, solutions, projects, campaigns, testimonials, faqs. One
 * generic list/create/edit engine
 * (app/dashboard/customers/[customerId]/content/[type]/...) serves all
 * six off this config instead of duplicating near-identical CRUD 6
 * times — same "generic, no per-customer/per-type branching" philosophy
 * as lib/cms/adapters/.
 *
 * `hero`, `site_settings`, `seo_settings`, `tracking_settings` are
 * singleton-shaped (not a list) and `leads` is read+status-only — those
 * get their own dedicated routes, not this generic engine.
 */

import type { MediaFolder } from "@/lib/media/constants";

export type ContentTypeKey =
  | "services"
  | "solutions"
  | "projects"
  | "campaigns"
  | "testimonials"
  | "faqs"
  | "product_showcase_items"
  | "brands"
  | "client_references";

export interface ContentFieldConfig {
  key: string;
  label: string;
  /**
   * Faz 14: "image" renders as a direct-upload widget
   * (components/dashboard/image-upload-field.tsx) instead of a plain
   * text input — the customer picks a file, it uploads immediately, no
   * more "copy the URL from Medya Kütüphanesi and paste it here" round
   * trip. Still validated and stored as a URL string underneath (see
   * lib/validation/content.ts), so this is a rendering change only.
   *
   * Faz 6 (client_references): "boolean" renders as a real `<input
   * type="checkbox">` (see content-form.tsx) instead of a text input —
   * added for `client_references.is_real_logo`/`featured`, the first
   * fields in this engine that are genuinely true/false rather than
   * free text. Stored as a real `boolean` column underneath (Zod's
   * `z.coerce.boolean()` on a checkbox's FormData value — `"on"` or
   * absent — coerces exactly the same way `Boolean(...)` would).
   */
  kind: "text" | "textarea" | "slug" | "url" | "image" | "boolean";
  required: boolean;
}

export interface ContentTypeConfig {
  key: ContentTypeKey;
  label: string;
  /** Which field's value to show as the row's title in the list view. */
  titleField: string;
  fields: ContentFieldConfig[];
  /** Prefix used to build audit_logs action codes, e.g. "service" → "service.create". */
  auditPrefix: string;
  /** Storage folder (lib/media/constants.ts's MEDIA_FOLDERS) this type's "image"-kind field(s) upload into. */
  imageFolder: MediaFolder;
}

const namedContentFields: ContentFieldConfig[] = [
  { key: "title", label: "Başlık", kind: "text", required: true },
  { key: "slug", label: "Slug", kind: "slug", required: true },
  { key: "description", label: "Açıklama", kind: "textarea", required: false },
  { key: "image", label: "Görsel", kind: "image", required: false },
];

/**
 * Phase 9.6 (migration 0007): `solutions.short_description` — shown on
 * the /cozumler list card, while the shared `description` field above
 * remains the long/detail-page text. Field keys must match the DB
 * column name exactly (see app/dashboard/customers/[customerId]/content/
 * [type]/actions.ts's toRow(), which uses field.key as the row key
 * directly — no camelCase mapping layer exists).
 */
const solutionFields: ContentFieldConfig[] = [
  { key: "title", label: "Başlık", kind: "text", required: true },
  { key: "slug", label: "Slug", kind: "slug", required: true },
  { key: "short_description", label: "Kısa Açıklama (liste kartında gösterilir)", kind: "textarea", required: false },
  { key: "description", label: "Uzun Açıklama (detay sayfasında gösterilir)", kind: "textarea", required: false },
  { key: "image", label: "Görsel", kind: "image", required: false },
  // Faz 6F-4A-3.4.1.2 (migration 0010) — /cozumler/[slug] detay sayfası
  // için opsiyonel SEO override alanları. Boş bırakılırsa solution'ın
  // kendi title/short_description/image'ına düşülür (bkz. build-metadata.ts,
  // bağlanması ayrı bir faz — 6F-4A-3.4.1.3). `imageFolder` burada değil,
  // ContentTypeConfig.imageFolder'dan ("solutions") geliyor.
  { key: "seo_title", label: "SEO Başlık", kind: "text", required: false },
  { key: "seo_description", label: "SEO Açıklama", kind: "textarea", required: false },
  { key: "seo_og_image", label: "SEO Görsel (OG Image)", kind: "image", required: false },
];

/**
 * Faz 4C (migration 0008): homepage "Ürün Yelpazesi" cards. `brand` is
 * this type's title-equivalent field (see `titleField: "brand"` below —
 * same pattern as testimonials' `name`/faqs' `question`, neither of
 * which is called "title" either). No long-form `description` — only
 * `short_description`, matching the legacy static data's single
 * `shortDescription` field.
 */
const productShowcaseFields: ContentFieldConfig[] = [
  { key: "brand", label: "Marka", kind: "text", required: true },
  { key: "slug", label: "Slug", kind: "slug", required: true },
  { key: "category", label: "Kategori", kind: "text", required: false },
  { key: "short_description", label: "Kısa Açıklama", kind: "textarea", required: false },
  { key: "href", label: "Link", kind: "text", required: false },
  { key: "image", label: "Görsel", kind: "image", required: false },
];

/**
 * Faz 6 (migration 0011): homepage "Markalar" logo cards. `name` matches
 * `PetraBrand.name` (lib/data/petra/brands.ts) directly — no schema-gap
 * naming needed (unlike product_showcase_items' `brand`/`type`). No
 * `category` field — `PetraBrand` has no category-equivalent.
 */
const brandFields: ContentFieldConfig[] = [
  { key: "name", label: "Marka Adı", kind: "text", required: true },
  { key: "slug", label: "Slug", kind: "slug", required: true },
  { key: "short_description", label: "Kısa Açıklama", kind: "textarea", required: false },
  { key: "href", label: "Link", kind: "text", required: false },
  { key: "image", label: "Logo", kind: "image", required: false },
];

/**
 * Faz 6 (migration 0012): homepage "Referanslarımız" teaser + full
 * /referanslar page client/institution reference logos. `image` (not
 * `logo`) matches every OTHER content type's uniform image-field key
 * convention — the static `PetraReference.logo` field is renamed here,
 * see `mapClientReferenceRows` (lib/cms/petra/mappers.ts). `category` is
 * free text (not a DB enum) — same "trust the admin" choice as
 * `projects.category`/`product_showcase_items.category`; the mapper
 * falls back to "Diğer Projeler" for any value outside the 5 known
 * categories, so a typo never silently drops a reference from
 * /referanslar's grouped list. No `slug` (the static type has none, no
 * detail route exists) and no `href` (the static type's `href` is
 * always `null` and never rendered as a real link — see migration
 * 0012's own comment for why neither was added).
 */
const clientReferenceFields: ContentFieldConfig[] = [
  { key: "name", label: "Kurum / Müşteri Adı", kind: "text", required: true },
  { key: "category", label: "Kategori", kind: "text", required: false },
  { key: "image", label: "Logo", kind: "image", required: false },
  {
    key: "is_real_logo",
    label: "Gerçek marka logosu (işaretlenmezse nötr referans rozeti olarak gösterilir)",
    kind: "boolean",
    required: false,
  },
  { key: "featured", label: "Ana sayfada öne çıksın mı?", kind: "boolean", required: false },
];

/** Phase 9.6 (migration 0007): `projects.category`, optional badge on /projeler. */
const projectFields: ContentFieldConfig[] = [
  ...namedContentFields,
  { key: "category", label: "Kategori", kind: "text", required: false },
];

/**
 * Phase 9.6 (migration 0007): `campaigns.price_label`/`cta_label`/
 * `cta_href`. `cta_href` is deliberately `kind: "text"`, not `"url"` —
 * the engine-wide default it falls back to ("/iletisim") is a relative
 * in-site path, and `"url"` fields are Zod-validated as an absolute URL
 * (see lib/validation/content.ts's buildContentFormSchema), which would
 * reject that. Same pattern as hero_sections.cta_primary_href.
 */
const campaignFields: ContentFieldConfig[] = [
  ...namedContentFields,
  { key: "price_label", label: "Fiyat Etiketi", kind: "text", required: false },
  { key: "cta_label", label: "Buton Metni", kind: "text", required: false },
  { key: "cta_href", label: "Buton Linki", kind: "text", required: false },
];

export const CONTENT_TYPES: Record<ContentTypeKey, ContentTypeConfig> = {
  services: {
    key: "services",
    label: "Hizmetler",
    titleField: "title",
    fields: namedContentFields,
    auditPrefix: "service",
    imageFolder: "services",
  },
  solutions: {
    key: "solutions",
    label: "Çözümler",
    titleField: "title",
    fields: solutionFields,
    auditPrefix: "solution",
    imageFolder: "solutions",
  },
  product_showcase_items: {
    key: "product_showcase_items",
    label: "Ürün Yelpazesi",
    titleField: "brand",
    fields: productShowcaseFields,
    auditPrefix: "product_showcase",
    imageFolder: "products",
  },
  brands: {
    key: "brands",
    label: "Markalar",
    titleField: "name",
    fields: brandFields,
    auditPrefix: "brand",
    // Reuses the existing "brand" media folder (lib/media/constants.ts) —
    // no new storage folder/system introduced.
    imageFolder: "brand",
  },
  client_references: {
    key: "client_references",
    label: "Referanslar",
    titleField: "name",
    fields: clientReferenceFields,
    auditPrefix: "client_reference",
    // New "references" folder (lib/media/constants.ts) — a dedicated,
    // independently growing (~33 rows) set of logos, kept separate from
    // the generic "brand" folder faqs currently uses.
    imageFolder: "references",
  },
  projects: {
    key: "projects",
    label: "Projeler",
    titleField: "title",
    fields: projectFields,
    auditPrefix: "project",
    imageFolder: "projects",
  },
  campaigns: {
    key: "campaigns",
    label: "Kampanyalar",
    titleField: "title",
    fields: campaignFields,
    auditPrefix: "campaign",
    imageFolder: "campaigns",
  },
  testimonials: {
    key: "testimonials",
    // Faz 6 (client_references): renamed from "Referanslar" — that
    // label was a pre-existing naming collision (this type is customer
    // QUOTES, name/role/company/quote, not the 33 client/institution
    // LOGOS the actual /referanslar page and homepage "Referanslarımız"
    // section show — see claude/FAZ6_REFERANSLAR_CMS_AUDIT.md's opening
    // finding). The CRUD/route/data itself is completely UNCHANGED —
    // only this display label. "Referanslar" now belongs solely to the
    // new `client_references` type below, resolving the collision.
    label: "Müşteri Yorumları",
    titleField: "name",
    auditPrefix: "testimonial",
    imageFolder: "testimonials",
    fields: [
      { key: "name", label: "Ad", kind: "text", required: true },
      { key: "role", label: "Ünvan", kind: "text", required: false },
      { key: "company", label: "Şirket", kind: "text", required: false },
      { key: "quote", label: "Yorum", kind: "textarea", required: true },
      { key: "image", label: "Görsel", kind: "image", required: false },
    ],
  },
  faqs: {
    key: "faqs",
    label: "SSS",
    titleField: "question",
    auditPrefix: "faq",
    imageFolder: "brand",
    fields: [
      { key: "question", label: "Soru", kind: "text", required: true },
      { key: "answer", label: "Cevap", kind: "textarea", required: true },
    ],
  },
};

export function getContentTypeConfig(key: string): ContentTypeConfig | null {
  return (CONTENT_TYPES as Record<string, ContentTypeConfig>)[key] ?? null;
}

export function isContentTypeKey(key: string): key is ContentTypeKey {
  return key in CONTENT_TYPES;
}
