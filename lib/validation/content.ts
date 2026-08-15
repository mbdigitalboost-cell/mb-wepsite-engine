import { z } from "zod";
import { CONTENT_TYPES, type ContentTypeKey } from "@/lib/cms/dashboard/content-types";

const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Builds a Zod schema from a content type's field config
 * (lib/cms/dashboard/content-types.ts) — one schema per type (services,
 * solutions, ...), generated the same way each type's form/actions are
 * generated, instead of 6 hand-written near-duplicate schemas.
 */
export function buildContentFormSchema(type: ContentTypeKey) {
  const config = CONTENT_TYPES[type];
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of config.fields) {
    let base: z.ZodString;
    if (field.kind === "slug") {
      base = z.string().trim().toLowerCase().max(150).regex(slugRegex, `${field.label} yalnızca küçük harf, rakam ve tire (-) içerebilir.`);
    } else if (field.kind === "url") {
      base = z.string().trim().max(500).url(`${field.label} geçerli bir URL olmalı.`);
    } else if (field.kind === "textarea") {
      base = z.string().trim().max(5000);
    } else {
      base = z.string().trim().max(300);
    }

    shape[field.key] = field.required ? base.min(1, `${field.label} zorunlu.`) : base.optional().or(z.literal(""));
  }

  shape.sortOrder = z.coerce.number().int().min(0).max(99999).default(0);

  return z.object(shape);
}

export const heroFormSchema = z.object({
  heading: z.string().trim().min(1, "Başlık zorunlu.").max(300),
  subtext: z.string().trim().max(1000).optional().or(z.literal("")),
  ctaPrimaryLabel: z.string().trim().max(100).optional().or(z.literal("")),
  ctaPrimaryHref: z.string().trim().max(500).optional().or(z.literal("")),
  ctaSecondaryLabel: z.string().trim().max(100).optional().or(z.literal("")),
  ctaSecondaryHref: z.string().trim().max(500).optional().or(z.literal("")),
  backgroundImage: z.string().trim().max(500).url("Geçerli bir URL olmalı.").optional().or(z.literal("")),
});

/** Turkish phone format used across the project so far, e.g. "0535 791 11 96". */
const phoneRegex = /^0\d{3} \d{3} \d{2} \d{2}$/;

export const siteSettingsFormSchema = z.object({
  companyName: z.string().trim().max(200).optional().or(z.literal("")),
  alternateName: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(phoneRegex, "Telefon formatı: 0535 791 11 96")
    .optional()
    .or(z.literal("")),
  whatsapp: z
    .string()
    .trim()
    .max(20)
    .regex(phoneRegex, "WhatsApp formatı: 0535 791 11 96")
    .optional()
    .or(z.literal("")),
  email: z.string().trim().email("Geçerli bir e-posta girin.").max(200).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  serviceArea: z.string().trim().max(200).optional().or(z.literal("")),
  workingHours: z.string().trim().max(200).optional().or(z.literal("")),
  logo: z.string().trim().max(500).url("Geçerli bir URL olmalı.").optional().or(z.literal("")),
  logoWhite: z.string().trim().max(500).url("Geçerli bir URL olmalı.").optional().or(z.literal("")),
  favicon: z.string().trim().max(500).url("Geçerli bir URL olmalı.").optional().or(z.literal("")),
  primaryColor: z.string().trim().max(20).optional().or(z.literal("")),
  secondaryColor: z.string().trim().max(20).optional().or(z.literal("")),
  radius: z.string().trim().max(20).optional().or(z.literal("")),
  buttonStyle: z.string().trim().max(50).optional().or(z.literal("")),
});

export const seoFormSchema = z.object({
  title: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(400).optional().or(z.literal("")),
  canonical: z.string().trim().max(500).optional().or(z.literal("")),
  ogImage: z.string().trim().max(500).url("Geçerli bir URL olmalı.").optional().or(z.literal("")),
  robotsIndex: z.coerce.boolean().default(true),
  robotsFollow: z.coerce.boolean().default(true),
});

export const trackingFormSchema = z.object({
  ga4Id: z.string().trim().max(50).optional().or(z.literal("")),
  gtmId: z.string().trim().max(50).optional().or(z.literal("")),
  metaPixelId: z.string().trim().max(50).optional().or(z.literal("")),
  metaCapiEnabled: z.coerce.boolean().default(false),
  /** Empty = "leave the existing token unchanged" — see app/dashboard/customers/[customerId]/tracking/actions.ts. */
  metaCapiToken: z.string().trim().max(500).optional().or(z.literal("")),
});

export const mediaAssetFormSchema = z.object({
  fileName: z.string().trim().min(1, "Dosya adı zorunlu.").max(200),
  fileUrl: z.string().trim().min(1, "Dosya URL'si zorunlu.").max(1000).url("Geçerli bir URL olmalı."),
  storagePath: z
    .string()
    .trim()
    .min(1, "Klasör yolu zorunlu.")
    .max(300)
    .regex(/^(brand|hero|solutions|services|projects|campaigns|banners)\/.+/, "Yol brand/, hero/, solutions/, services/, projects/, campaigns/ veya banners/ ile başlamalı."),
  altText: z.string().trim().max(300).optional().or(z.literal("")),
  type: z.string().trim().max(50).optional().or(z.literal("")),
  width: z.coerce.number().int().min(0).max(20000).optional(),
  height: z.coerce.number().int().min(0).max(20000).optional(),
});

export const leadStatusSchema = z.enum(["new", "contacted", "closed"]);
