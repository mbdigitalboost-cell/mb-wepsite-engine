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

export type ContentTypeKey =
  | "services"
  | "solutions"
  | "projects"
  | "campaigns"
  | "testimonials"
  | "faqs";

export interface ContentFieldConfig {
  key: string;
  label: string;
  kind: "text" | "textarea" | "slug" | "url";
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
}

const namedContentFields: ContentFieldConfig[] = [
  { key: "title", label: "Başlık", kind: "text", required: true },
  { key: "slug", label: "Slug", kind: "slug", required: true },
  { key: "description", label: "Açıklama", kind: "textarea", required: false },
  { key: "image", label: "Görsel URL", kind: "url", required: false },
];

export const CONTENT_TYPES: Record<ContentTypeKey, ContentTypeConfig> = {
  services: { key: "services", label: "Hizmetler", titleField: "title", fields: namedContentFields, auditPrefix: "service" },
  solutions: { key: "solutions", label: "Çözümler", titleField: "title", fields: namedContentFields, auditPrefix: "solution" },
  projects: { key: "projects", label: "Projeler", titleField: "title", fields: namedContentFields, auditPrefix: "project" },
  campaigns: { key: "campaigns", label: "Kampanyalar", titleField: "title", fields: namedContentFields, auditPrefix: "campaign" },
  testimonials: {
    key: "testimonials",
    label: "Referanslar",
    titleField: "name",
    auditPrefix: "testimonial",
    fields: [
      { key: "name", label: "Ad", kind: "text", required: true },
      { key: "role", label: "Ünvan", kind: "text", required: false },
      { key: "company", label: "Şirket", kind: "text", required: false },
      { key: "quote", label: "Yorum", kind: "textarea", required: true },
      { key: "image", label: "Görsel URL", kind: "url", required: false },
    ],
  },
  faqs: {
    key: "faqs",
    label: "SSS",
    titleField: "question",
    auditPrefix: "faq",
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
