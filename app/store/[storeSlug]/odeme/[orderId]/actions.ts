"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { CARD_PAYMENT_METHOD, PAYMENT_METHODS } from "@/lib/validation/order";

/**
 * Faz 22 — "Başka yöntem seç": kart ödemesi başarısız olan/vazgeçilen
 * sipariş İKİNCİ bir sipariş açmadan kapıda ödeme / havaleye çevrilir.
 * Yalnızca hâlâ unpaid + pending + payment_method='Kredi Kartı' olan satır
 * güncellenir (WHERE şartları) — ödenmiş ya da işleme alınmış sipariş
 * değişmez. Sipariş uuid'si tahmin edilemez; müşteri bu sayfaya zaten
 * uuid ile geldi, ek bir oturum şartı yok (misafir sipariş de olabilir).
 * Ardından /sepet?siparis=<uuid>&odeme=yontem → başarı ekranı + sepet temizlenir.
 */
export async function switchPaymentMethodAction(storeSlug: string, orderId: string, formData: FormData): Promise<void> {
  const store = await getStoreBySlug(storeSlug);
  if (!store) redirect(`/store/${storeSlug}/sepet`);

  const method = String(formData.get("paymentMethod") ?? "");
  if (!(PAYMENT_METHODS as readonly string[]).includes(method)) {
    redirect(`/store/${storeSlug}/odeme/${orderId}?hata=yontem`);
  }

  const admin = createSupabaseAdminClient();
  const { data: updated } = await admin
    .from("orders")
    .update({ payment_method: method, payment_provider: null, payment_provider_token: null, payment_error: null })
    .eq("id", orderId)
    .eq("store_id", store.id)
    .eq("payment_status", "unpaid")
    .eq("status", "pending")
    .eq("payment_method", CARD_PAYMENT_METHOD)
    .select("id, order_number");

  if (!updated || updated.length === 0) {
    redirect(`/store/${storeSlug}/odeme/${orderId}`);
  }

  const { data: storeRow } = await admin.from("stores").select("customer_id").eq("id", store.id).maybeSingle();
  await logAuditEvent({
    userId: null,
    customerId: storeRow?.customer_id ?? null,
    action: "order.payment_method_switch",
    entityType: "order",
    entityId: orderId,
    metadata: { from: CARD_PAYMENT_METHOD, to: method, orderNumber: updated[0].order_number },
  });
  if (storeRow?.customer_id) {
    revalidatePath(`/dashboard/customers/${storeRow.customer_id}/stores/${store.id}/orders`);
  }

  redirect(`/store/${storeSlug}/sepet?siparis=${orderId}&odeme=yontem`);
}
