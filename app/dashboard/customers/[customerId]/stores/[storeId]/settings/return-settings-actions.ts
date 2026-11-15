"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { MIN_RETURN_WINDOW_DAYS } from "@/lib/commerce/returns/eligibility";

/**
 * Faz 30 — mağaza iade ayarları (store_admin+; RLS: store_return_settings
 * admin-tier insert/update). İade süresi 14 günün altına inemez (DB CHECK +
 * burada). Kargo firması, iade kodu ve talimat admin'in yazdığı metindir —
 * kod hiçbirini tahmin etmez/uydurmaz.
 */
const schema = z.object({
  returnsEnabled: z.boolean(),
  returnWindowDays: z.coerce.number().int().min(MIN_RETURN_WINDOW_DAYS, `İade süresi en az ${MIN_RETURN_WINDOW_DAYS} gün olmalı.`).max(365),
  carrierName: z.string().trim().max(120),
  returnCode: z.string().trim().max(120),
  instructions: z.string().trim().max(4000),
  address: z.string().trim().max(1000),
});

export async function updateReturnSettingsAction(customerId: string, storeId: string, formData: FormData): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId, customerId);
  const base = `/dashboard/customers/${customerId}/stores/${storeId}/settings`;

  const parsed = schema.safeParse({
    returnsEnabled: formData.get("returnsEnabled") === "on",
    returnWindowDays: formData.get("returnWindowDays"),
    carrierName: formData.get("carrierName") ?? "",
    returnCode: formData.get("returnCode") ?? "",
    instructions: formData.get("instructions") ?? "",
    address: formData.get("address") ?? "",
  });
  if (!parsed.success) redirect(`${base}?iade=hata`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("store_return_settings").upsert(
    {
      store_id: storeId,
      returns_enabled: parsed.data.returnsEnabled,
      return_window_days: parsed.data.returnWindowDays,
      return_carrier_name: parsed.data.carrierName || null,
      return_code: parsed.data.returnCode || null,
      return_instructions: parsed.data.instructions || null,
      return_address: parsed.data.address || null,
    },
    { onConflict: "store_id" },
  );
  if (error) {
    console.error("[return-settings] save failed:", error.message);
    redirect(`${base}?iade=hata`);
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "store.return_settings_update",
    entityType: "store",
    entityId: storeId,
    metadata: { returnsEnabled: parsed.data.returnsEnabled, returnWindowDays: parsed.data.returnWindowDays },
  });

  revalidatePath(base);
  redirect(`${base}?iade=kaydedildi`);
}
