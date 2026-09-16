import { z } from "zod";
import { optionalSafeNavigationUrlSchema } from "@/lib/validation/safe-url";

/**
 * FAZ 2A — Category (store_editor+ writes; permanent delete is
 * store_admin+ only — same split as brands/homepage/navigation, see
 * migration 0016_categories_brands.sql's RLS policies). Mirrors that
 * migration's `categories` table exactly.
 *
 * store_id is NEVER a field in this schema — tenant scoping comes from
 * the authenticated route's storeId (requireStoreEditorAccess /
 * requireStoreAdminAccess) at the Server Action layer, not from user
 * input. The real tenant-isolation guarantee is the DB's RLS + (for
 * parent_id, a same-store category) the store_id-scoped unique index —
 * this schema only validates the SHAPE of the input.
 *
 * imageUrl uses the same safe-navigation-url allowlist as homepage
 * section's imageUrl/linkUrl (lib/validation/safe-url.ts) — never a bare
 * z.string().url() — for the same CRITICAL REMEDIATION reasoning (only
 * a same-site relative path or an https:// link is accepted).
 */
const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Kategori adı zorunlu.").max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Slug zorunlu.")
    .max(150)
    .regex(slugRegex, "Slug yalnızca küçük harf, rakam ve tire (-) içerebilir."),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  imageUrl: optionalSafeNavigationUrlSchema(500),
  /** Nullable self-reference — same-store correctness enforced by the DB, not here. */
  parentId: z.string().uuid().optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0, "Sıra 0 veya daha büyük olmalı.").default(0),
  isActive: z.coerce.boolean().default(true),
  seoTitle: z.string().trim().max(200).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(300).optional().or(z.literal("")),
});
