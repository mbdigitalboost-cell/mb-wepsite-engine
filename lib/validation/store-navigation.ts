import { z } from "zod";
import { safeNavigationUrlSchema } from "@/lib/validation/safe-url";

/**
 * PHASE 2 — Store Navigation (store_editor+ writes; permanent delete is
 * store_admin+ only — see migration 0010's comment on
 * store_navigation_items). `sortOrder` here is ONLY used to render the
 * current order in a form / drag list — the actual persisted order is
 * ALWAYS recomputed server-side from a submitted ID list
 * (2026-08-25 karar madde 6: "Client'tan gelen sort_order asla güvenilir
 * değil"), never trusted as a raw number written straight from this form.
 */
export const STORE_MENU_TYPES = ["main", "footer", "category"] as const;

export const storeNavigationMenuFormSchema = z.object({
  menuType: z.enum(STORE_MENU_TYPES, { message: "Geçerli bir menü tipi seçin." }),
});

export const storeNavigationItemFormSchema = z.object({
  label: z.string().trim().min(1, "Etiket zorunlu.").max(150),
  // PHASE 2 CRITICAL REMEDIATION (CRITICAL 1, kısım C) — artık serbest bir
  // string DEĞİL: sadece site-içi göreli path veya https:// harici bağlantı
  // kabul edilir (javascript:/data:/vbscript:/... reddedilir). Bkz.
  // lib/validation/safe-url.ts.
  url: safeNavigationUrlSchema(500),
  parentItemId: z.string().uuid().optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
});

/**
 * Server-side reorder transaction input: an ORDERED list of item IDs
 * belonging to one menu. The action recomputes gap-based sort_order values
 * (10/20/30/...) from this order — it never reads a client-submitted
 * numeric sort_order field.
 */
export const storeNavigationReorderSchema = z.object({
  menuId: z.string().uuid(),
  orderedItemIds: z.array(z.string().uuid()).min(1),
});
