"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { parseAnnouncementLines, validateStorefrontTexts, type StorefrontTexts } from "@/lib/commerce/storefront-texts";

/**
 * Faz 39 — mağazanın vitrin metinleri (duyuru şeridi maddeleri, CTA bandı,
 * "kendi üretim" rozeti). Yalnız store_admin+; storeId'nin bu müşteriye ait
 * olduğunu requireStoreAdminAccess doğrular (Faz 29), RLS ayrıca korur.
 * Boş bırakılan alan NULL yazılır: o parça vitrinde hiç gösterilmez.
 */
export async function updateStorefrontTextsAction(customerId: string, storeId: string, formData: FormData): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId, customerId);
  const base = `/dashboard/customers/${customerId}/stores/${storeId}/settings`;
  const field = (name: string) => {
    const value = String(formData.get(name) ?? "").trim();
    return value.length > 0 ? value : null;
  };

  const texts: StorefrontTexts = {
    announcementItems: parseAnnouncementLines(String(formData.get("announcementItems") ?? "")),
    ctaBandTitle: field("ctaBandTitle"),
    ctaBandSubtitle: field("ctaBandSubtitle"),
    ownProductionTitle: field("ownProductionTitle"),
    ownProductionSubtitle: field("ownProductionSubtitle"),
  };
  if (validateStorefrontTexts(texts) !== null) redirect(`${base}?vitrin=hata#vitrin-metinleri`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("store_storefront_texts").upsert(
    {
      store_id: storeId,
      announcement_items: texts.announcementItems,
      cta_band_title: texts.ctaBandTitle,
      cta_band_subtitle: texts.ctaBandSubtitle,
      own_production_title: texts.ownProductionTitle,
      own_production_subtitle: texts.ownProductionSubtitle,
    },
    { onConflict: "store_id" },
  );
  if (error) {
    console.error("[storefront-texts] save failed:", error.message);
    redirect(`${base}?vitrin=hata#vitrin-metinleri`);
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "store.storefront_texts_update",
    entityType: "store",
    entityId: storeId,
    metadata: {
      announcementItemCount: texts.announcementItems.length,
      ctaBand: texts.ctaBandTitle !== null,
      ownProductionBadge: texts.ownProductionTitle !== null,
    },
  });

  revalidatePath(base);
  redirect(`${base}?vitrin=kaydedildi#vitrin-metinleri`);
}
