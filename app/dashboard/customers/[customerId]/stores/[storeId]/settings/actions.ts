"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { storeSettingsFormSchema, storeMaintenanceFormSchema } from "@/lib/validation/store-settings";
import { storeSettingsTag } from "@/lib/commerce/cache-tags";
import { reauthenticateWithPassword } from "@/lib/auth/reauthenticate";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { StoreSettingsFormState } from "./form-state";

/** Non-critical settings (currency/locale/taxMode) — store_admin+, no re-auth needed. */
export async function updateStoreSettingsAction(
  customerId: string,
  storeId: string,
  _prevState: StoreSettingsFormState,
  formData: FormData,
): Promise<StoreSettingsFormState> {
  const { user } = await requireStoreAdminAccess(storeId);

  const parsed = storeSettingsFormSchema.safeParse({
    currency: formData.get("currency"),
    locale: formData.get("locale"),
    taxMode: formData.get("taxMode"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("store_settings")
    .upsert({
      store_id: storeId,
      currency: parsed.data.currency,
      locale: parsed.data.locale,
      tax_mode: parsed.data.taxMode,
    })
    .eq("store_id", storeId);

  if (error) {
    return { error: `Kaydedilemedi: ${error.message}` };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "store_settings.update",
    entityType: "store_settings",
    entityId: storeId,
    metadata: { currency: parsed.data.currency, locale: parsed.data.locale, taxMode: parsed.data.taxMode },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/settings`);
  revalidateTag(storeSettingsTag(storeId), "max");
  return { error: null };
}

/**
 * CRITICAL — maintenance mode (2026-08-25 karar madde 3). Reuses
 * `lib/auth/reauthenticate.ts` (the SAME mechanism as
 * `changeUserRoleAction`), not a new parallel check. A failed re-auth is
 * logged separately (mirrors `user.role_change_reauth_failed`) so a
 * repeated failed attempt on this specific critical action is visible in
 * the audit trail even though nothing was actually changed.
 */
export async function setStoreMaintenanceModeAction(
  customerId: string,
  storeId: string,
  _prevState: StoreSettingsFormState,
  formData: FormData,
): Promise<StoreSettingsFormState> {
  const { user } = await requireStoreAdminAccess(storeId);

  const parsed = storeMaintenanceFormSchema.safeParse({
    maintenanceMode: formData.get("maintenanceMode"),
    maintenanceMessage: formData.get("maintenanceMessage"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const reauth = await reauthenticateWithPassword(user, parsed.data.password);
  if (!reauth.ok) {
    await logAuditEvent({
      userId: user.id,
      customerId,
      action: "store_settings.maintenance_reauth_failed",
      entityType: "store_settings",
      entityId: storeId,
    });
    return { error: reauth.error };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("store_settings")
    .upsert({
      store_id: storeId,
      maintenance_mode: parsed.data.maintenanceMode,
      maintenance_message: parsed.data.maintenanceMessage || null,
    })
    .eq("store_id", storeId);

  if (error) {
    return { error: `Kaydedilemedi: ${error.message}` };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: parsed.data.maintenanceMode ? "store_settings.maintenance_enable" : "store_settings.maintenance_disable",
    entityType: "store_settings",
    entityId: storeId,
    metadata: { maintenanceMode: parsed.data.maintenanceMode },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/settings`);
  revalidateTag(storeSettingsTag(storeId), "max");
  return { error: null };
}
