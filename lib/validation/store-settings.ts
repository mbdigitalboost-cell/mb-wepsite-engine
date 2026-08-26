import { z } from "zod";

/**
 * PHASE 2 — Store Settings (store_admin+ only, is_store_admin_member).
 * `taxMode` mirrors the migration's text+check constraint exactly
 * (`store_settings.tax_mode in ('included','excluded','disabled')`) — Zod
 * is the app-layer half of that same constraint, DB CHECK is the real
 * enforcement.
 *
 * `maintenanceMode`/`maintenanceMessage` are split into their OWN schema
 * (`storeMaintenanceFormSchema`) because turning maintenance mode ON is a
 * CRITICAL action (2026-08-25 karar madde 3) that goes through
 * `lib/auth/reauthenticate.ts` — its Server Action must read/validate only
 * these two fields, never silently accept a maintenance-mode flip bundled
 * into an unrelated settings form submit.
 */
export const STORE_TAX_MODES = ["included", "excluded", "disabled"] as const;

export const storeSettingsFormSchema = z.object({
  currency: z.string().trim().toUpperCase().length(3, "3 harfli bir para birimi kodu girin (ör. TRY)."),
  locale: z.string().trim().min(2).max(10),
  taxMode: z.enum(STORE_TAX_MODES, { message: "Geçerli bir KDV modu seçin." }),
});

export const storeMaintenanceFormSchema = z.object({
  maintenanceMode: z.coerce.boolean(),
  maintenanceMessage: z.string().trim().max(500).optional().or(z.literal("")),
  /** Re-auth confirmation — read directly by the Server Action, not stored. */
  password: z.string().min(1, "Şifre onayı zorunlu."),
});
