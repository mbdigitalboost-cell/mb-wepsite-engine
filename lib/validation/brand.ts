import { z } from "zod";
import { optionalSafeNavigationUrlSchema } from "@/lib/validation/safe-url";

/**
 * FAZ 2A — Brand (store_editor+ writes; permanent delete is store_admin+
 * only — same split as categories). Mirrors migration
 * 0016_categories_brands.sql's `brands` table exactly. No hierarchy
 * (no parent_id) AND — unlike categories — NO sort_order column either
 * (verified against the real migration file: brands has no sort_order),
 * otherwise the same shape/RLS pattern as categories — see
 * lib/validation/category.ts for the shared design rationale (store_id
 * never a field here; logoUrl uses the same safe-navigation-url allowlist
 * as category's imageUrl).
 */
const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const brandFormSchema = z.object({
  name: z.string().trim().min(1, "Marka adı zorunlu.").max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Slug zorunlu.")
    .max(150)
    .regex(slugRegex, "Slug yalnızca küçük harf, rakam ve tire (-) içerebilir."),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  logoUrl: optionalSafeNavigationUrlSchema(500),
  isActive: z.coerce.boolean().default(true),
  seoTitle: z.string().trim().max(200).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(300).optional().or(z.literal("")),
});
