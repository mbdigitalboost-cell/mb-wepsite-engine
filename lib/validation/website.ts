import { z } from "zod";

/** Mirrors `websites_slug_format` — see lib/validation/customer.ts for why this is hand-kept. */
const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Mirrors `websites_connection_key_format` — used to build env var names (SUPABASE_URL_<KEY>). */
const connectionKeyRegex = /^[A-Z0-9_]+$/;
/** Deliberately simple — a full RFC-3986 host validator is overkill here; the DB unique constraint is the real backstop against duplicates/typos causing collisions. */
const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

export const websiteFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Website adı en az 2 karakter olmalı.")
    .max(150, "Website adı çok uzun."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Slug en az 2 karakter olmalı.")
    .max(80, "Slug çok uzun.")
    .regex(slugRegex, "Slug yalnızca küçük harf, rakam ve tire (-) içerebilir."),
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .max(255, "Domain çok uzun.")
    .regex(domainRegex, "Geçerli bir domain girin — örn: petramuhendislik.com.tr")
    .optional()
    .or(z.literal("")),
  template: z.string().trim().max(80, "Şablon adı çok uzun.").optional().or(z.literal("")),
  supabaseConnectionKey: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Connection key en az 2 karakter olmalı.")
    .max(50, "Connection key çok uzun.")
    .regex(
      connectionKeyRegex,
      "Connection key yalnızca büyük harf, rakam ve alt çizgi (_) içerebilir — örn: PETRA",
    ),
});

export type WebsiteFormInput = z.infer<typeof websiteFormSchema>;

export const websiteStatusSchema = z.enum(["active", "inactive"]);
