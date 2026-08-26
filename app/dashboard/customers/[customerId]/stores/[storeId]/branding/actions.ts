"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { storeBrandingFormSchema } from "@/lib/validation/store-branding";
import { storeBrandingTag } from "@/lib/commerce/cache-tags";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { StoreBrandingFormState } from "./form-state";

/** Branding write — store_editor+ (is_store_editor_member), NOT admin-only. Not critical, no re-auth. */
export async function updateStoreBrandingAction(
  customerId: string,
  storeId: string,
  _prevState: StoreBrandingFormState,
  formData: FormData,
): Promise<StoreBrandingFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const parsed = storeBrandingFormSchema.safeParse({
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
    accentColor: formData.get("accentColor"),
    buttonStyle: formData.get("buttonStyle") || undefined,
    typography: formData.get("typography"),
    colorMode: formData.get("colorMode"),
    themeConfig: {
      hoverColor: formData.get("themeConfig.hoverColor"),
    },
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("store_branding")
    .upsert({
      store_id: storeId,
      primary_color: parsed.data.primaryColor || null,
      secondary_color: parsed.data.secondaryColor || null,
      accent_color: parsed.data.accentColor || null,
      button_style: parsed.data.buttonStyle || null,
      typography: parsed.data.typography || null,
      color_mode: parsed.data.colorMode,
      theme_config: parsed.data.themeConfig,
    })
    .eq("store_id", storeId);

  if (error) {
    return { error: `Kaydedilemedi: ${error.message}` };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "store_branding.update",
    entityType: "store_branding",
    entityId: storeId,
    metadata: { colorMode: parsed.data.colorMode, buttonStyle: parsed.data.buttonStyle ?? null },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/branding`);
  revalidateTag(storeBrandingTag(storeId), "max");
  return { error: null };
}
