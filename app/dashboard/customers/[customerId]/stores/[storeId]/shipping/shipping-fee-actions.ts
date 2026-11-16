"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/auth/audit-log";

/**
 * Faz 31 — mağaza kargo ücreti ayarı (store_admin+; RLS:
 * store_shipping_fee_settings admin-tier insert/update). Faz 29 guard'ı:
 * URL müşterisi mağazanın gerçek müşterisi değilse 404. Tutarlar admin'in
 * girdiği değerlerdir; kod hiçbir tutar uydurmaz.
 */
const money = z.coerce.number().min(0, "Tutar negatif olamaz.").max(1_000_000);
const schema = z.object({
  shippingFee: money,
  freeShippingThreshold: z.union([z.literal(""), money]),
  thresholdBasis: z.enum(["before_discount", "after_discount"]),
  codFee: money,
});

export async function updateShippingFeeSettingsAction(customerId: string, storeId: string, formData: FormData): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId, customerId);
  const base = `/dashboard/customers/${customerId}/stores/${storeId}/shipping`;

  const parsed = schema.safeParse({
    shippingFee: String(formData.get("shippingFee") ?? "").replace(",", "."),
    freeShippingThreshold: String(formData.get("freeShippingThreshold") ?? "").trim().replace(",", "."),
    thresholdBasis: formData.get("thresholdBasis"),
    codFee: String(formData.get("codFee") ?? "0").replace(",", ".") || "0",
  });
  if (!parsed.success) redirect(`${base}?ucret=hata#kargo-ucreti`);

  const round = (value: number) => Math.round(value * 100) / 100;
  const threshold = parsed.data.freeShippingThreshold === "" ? null : round(parsed.data.freeShippingThreshold);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("store_shipping_fee_settings").upsert(
    {
      store_id: storeId,
      shipping_fee: round(parsed.data.shippingFee),
      free_shipping_threshold: threshold,
      threshold_basis: parsed.data.thresholdBasis,
      cod_fee: round(parsed.data.codFee),
    },
    { onConflict: "store_id" },
  );
  if (error) {
    console.error("[shipping-fee] save failed:", error.message);
    redirect(`${base}?ucret=hata#kargo-ucreti`);
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "store.shipping_fee_update",
    entityType: "store",
    entityId: storeId,
    metadata: {
      shippingFee: round(parsed.data.shippingFee),
      freeShippingThreshold: threshold,
      thresholdBasis: parsed.data.thresholdBasis,
      codFee: round(parsed.data.codFee),
    },
  });

  revalidatePath(base);
  // Vitrin (duyuru şeridi, ürün sayfası, sepet) ayarı her istekte okur.
  redirect(`${base}?ucret=kaydedildi#kargo-ucreti`);
}
