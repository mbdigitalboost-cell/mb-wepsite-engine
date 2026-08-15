import { z } from "zod";

/**
 * Mirrors the DB constraint `customers_slug_format` in
 * supabase/platform/migrations/0001_profiles_customers_websites.sql
 * exactly — lowercase letters, digits, single hyphens between groups. Kept
 * in sync by hand for the same reason lib/supabase/types.ts is: there's no
 * live project yet to generate this from.
 */
const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const customerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Müşteri adı en az 2 karakter olmalı.")
    .max(150, "Müşteri adı çok uzun."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Slug en az 2 karakter olmalı.")
    .max(80, "Slug çok uzun.")
    .regex(
      slugRegex,
      "Slug yalnızca küçük harf, rakam ve tire (-) içerebilir — örn: petra-muhendislik",
    ),
});

export type CustomerFormInput = z.infer<typeof customerFormSchema>;

export const customerStatusSchema = z.enum(["active", "inactive"]);
