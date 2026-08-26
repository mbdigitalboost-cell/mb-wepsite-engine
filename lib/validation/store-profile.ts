import { z } from "zod";

/**
 * PHASE 2 — Store Profile (store_admin+ only, is_store_admin_member).
 * Mirrors `lib/validation/content.ts`'s `siteSettingsFormSchema` phone
 * format and URL-optional-or-empty-string convention exactly.
 *
 * `socialLinks`/`businessInfo` map to `store_profiles.social_links`/
 * `business_info` (jsonb) — BUT are validated here against a FIXED key set
 * (per migration 0009's comment: "şekli app katmanında (Zod) doğrulanır"),
 * never accepted as arbitrary freeform JSON. Adding a new social platform
 * or business field later means adding a key here, not a migration.
 */
const phoneRegex = /^0\d{3} \d{3} \d{2} \d{2}$/;
const urlField = z.string().trim().max(500).url("Geçerli bir URL olmalı.").optional().or(z.literal(""));

export const storeSocialLinksSchema = z.object({
  instagram: urlField,
  facebook: urlField,
  whatsapp: z.string().trim().max(20).regex(phoneRegex, "WhatsApp formatı: 0535 791 11 96").optional().or(z.literal("")),
  tiktok: urlField,
  youtube: urlField,
  linkedin: urlField,
});

export const storeBusinessInfoSchema = z.object({
  tradeName: z.string().trim().max(200).optional().or(z.literal("")),
  taxOffice: z.string().trim().max(200).optional().or(z.literal("")),
  taxNumber: z.string().trim().max(50).optional().or(z.literal("")),
  mersisNumber: z.string().trim().max(50).optional().or(z.literal("")),
});

export const storeProfileFormSchema = z.object({
  displayName: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  logoUrl: urlField,
  faviconUrl: urlField,
  phone: z.string().trim().max(20).regex(phoneRegex, "Telefon formatı: 0535 791 11 96").optional().or(z.literal("")),
  email: z.string().trim().email("Geçerli bir e-posta girin.").max(200).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  socialLinks: storeSocialLinksSchema,
  businessInfo: storeBusinessInfoSchema,
});
