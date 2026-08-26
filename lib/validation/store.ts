import { z } from "zod";

/**
 * PHASE 2 — "Stores" admin module (platform-admin only, mirrors
 * lib/validation/customer.ts / website.ts exactly). A store's `name`/`slug`
 * are the ONLY fields this schema owns — Profile/Settings/Branding/
 * Navigation/Homepage each have their own dedicated schema below, per the
 * "do not bloat a single form/table" decision (2026-08-25 karar madde 4).
 */
const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const storeFormSchema = z.object({
  name: z.string().trim().min(1, "Mağaza adı zorunlu.").max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Slug zorunlu.")
    .max(150)
    .regex(slugRegex, "Slug yalnızca küçük harf, rakam ve tire (-) içerebilir."),
});
