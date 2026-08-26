"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { storeProfileFormSchema } from "@/lib/validation/store-profile";
import { storeProfileTag } from "@/lib/commerce/cache-tags";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { StoreProfileFormState } from "./form-state";

/**
 * Store Profile write — SADECE store_admin+ (is_store_admin_member,
 * migration 0008/0009) — store_editor bu kapıdan GEÇEMEZ. Read access for
 * the page itself is broader (store_viewer+, see page.tsx) — that
 * asymmetry is deliberate (2026-08-25 karar madde 2): everyone on the
 * store can SEE the profile, only store_admin can CHANGE it.
 */
export async function updateStoreProfileAction(
  customerId: string,
  storeId: string,
  _prevState: StoreProfileFormState,
  formData: FormData,
): Promise<StoreProfileFormState> {
  const { user } = await requireStoreAdminAccess(storeId);

  const parsed = storeProfileFormSchema.safeParse({
    displayName: formData.get("displayName"),
    description: formData.get("description"),
    logoUrl: formData.get("logoUrl"),
    faviconUrl: formData.get("faviconUrl"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    socialLinks: {
      instagram: formData.get("socialLinks.instagram"),
      facebook: formData.get("socialLinks.facebook"),
      whatsapp: formData.get("socialLinks.whatsapp"),
      tiktok: formData.get("socialLinks.tiktok"),
      youtube: formData.get("socialLinks.youtube"),
      linkedin: formData.get("socialLinks.linkedin"),
    },
    businessInfo: {
      tradeName: formData.get("businessInfo.tradeName"),
      taxOffice: formData.get("businessInfo.taxOffice"),
      taxNumber: formData.get("businessInfo.taxNumber"),
      mersisNumber: formData.get("businessInfo.mersisNumber"),
    },
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("store_profiles")
    .upsert({
      store_id: storeId,
      display_name: parsed.data.displayName || null,
      description: parsed.data.description || null,
      logo_url: parsed.data.logoUrl || null,
      favicon_url: parsed.data.faviconUrl || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      social_links: parsed.data.socialLinks,
      business_info: parsed.data.businessInfo,
    })
    .eq("store_id", storeId);

  if (error) {
    return { error: `Kaydedilemedi: ${error.message}` };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "store_profile.update",
    entityType: "store_profile",
    entityId: storeId,
    metadata: { displayName: parsed.data.displayName || null },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/profile`);
  revalidateTag(storeProfileTag(storeId), "max");
  return { error: null };
}
