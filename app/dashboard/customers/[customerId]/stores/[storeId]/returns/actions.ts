"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStoreAdminAccess, requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { canTransition } from "@/lib/commerce/returns/state";
import { getReturnSettings, loadReturnOrderContext } from "@/lib/commerce/returns/service";
import { sendReturnEmail } from "@/lib/commerce/returns/notify";
import { orderGrandTotal } from "@/lib/commerce/shipping-fee";
import { formatIban } from "@/lib/commerce/returns/iban";
import { cancelShippingProviderOrders } from "@/lib/integrations/shipping-push";
import { getPaymentIntegrationCredentials } from "@/lib/integrations/store-payment-integration";
import { IyzicoApiError, IyzicoSignatureError, refundPaymentV2 } from "@/lib/integrations/iyzico";
import { resolveRequestClientIp } from "@/lib/http/request-base-url";
import type { Database, OrderReturnStatus } from "@/lib/supabase/types";

type ReturnUpdate = Database["public"]["Tables"]["order_returns"]["Update"];
import type { RevealIbanState } from "./reveal-iban-state";

/**
 * Faz 30 Kısım C — admin: iptal/iade talebi aksiyonları.
 * Her action: Faz 29 guard'ı (URL müşterisi = mağazanın müşterisi) + talebin
 * BU mağazaya ait olduğu (id + store_id) + durum makinesi
 * (lib/commerce/returns/state.ts). Güncellemeler mevcut durumla koşullu
 * (.eq("status", from)) — aynı talep iki sekmeden iki kez işlenemez.
 */

function detailPath(customerId: string, storeId: string, returnId: string, query = ""): string {
  return `/dashboard/customers/${customerId}/stores/${storeId}/returns/${returnId}${query ? `?${query}` : ""}`;
}

async function loadOwnedReturn(storeId: string, returnId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("order_returns").select("*").eq("id", returnId).eq("store_id", storeId).maybeSingle();
  return data;
}

async function transition(storeId: string, returnId: string, from: OrderReturnStatus, update: ReturnUpdate): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("order_returns")
    .update(update)
    .eq("id", returnId)
    .eq("store_id", storeId)
    .eq("status", from)
    .select("id");
  if (error) console.error("[returns] update failed:", error.message);
  return Boolean(data?.length);
}

function revalidateReturn(customerId: string, storeId: string, returnId: string, orderId: string) {
  const base = `/dashboard/customers/${customerId}/stores/${storeId}`;
  revalidatePath(`${base}/returns`);
  revalidatePath(`${base}/returns/${returnId}`);
  revalidatePath(`${base}/orders`);
  revalidatePath(`${base}/orders/${orderId}`);
}

/** Onay. İptal: sipariş iptal edilir + Basit Kargo kaydı (barkodsuzsa) silinir; iade edilecek para yoksa doğrudan kapanır. İade: iade kodu/talimat. */
export async function approveReturnAction(customerId: string, storeId: string, returnId: string, formData: FormData): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId, customerId);
  const record = await loadOwnedReturn(storeId, returnId);
  if (!record || !canTransition(record.kind, record.status, "approved")) redirect(detailPath(customerId, storeId, returnId, "hata=durum"));
  const context = await loadReturnOrderContext(storeId, record.order_id);
  if (!context) redirect(detailPath(customerId, storeId, returnId, "hata=siparis"));

  const now = new Date().toISOString();
  if (record.kind === "cancel") {
    if (!["pending", "confirmed", "preparing"].includes(context.order.status)) redirect(detailPath(customerId, storeId, returnId, "hata=kargoda"));
    const supabase = await createSupabaseServerClient();
    const { data: cancelled } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", context.order.id)
      .eq("store_id", storeId)
      .in("status", ["pending", "confirmed", "preparing"])
      .select("id");
    if (!cancelled?.length) redirect(detailPath(customerId, storeId, returnId, "hata=kargoda"));
    await cancelShippingProviderOrders({ storeId, customerId, actorUserId: user.id, orderIds: [context.order.id] });

    const nothingToRefund = record.refund_method === "none" || Number(record.refund_amount) <= 0;
    const ok = await transition(storeId, returnId, "requested", { status: nothingToRefund ? "closed" : "approved", decided_at: now });
    if (!ok) redirect(detailPath(customerId, storeId, returnId, "hata=durum"));
  } else {
    const settings = await getReturnSettings(storeId);
    const carrier = String(formData.get("carrierName") ?? settings.carrierName ?? "").trim().slice(0, 120) || null;
    const code = String(formData.get("returnCode") ?? settings.returnCode ?? "").trim().slice(0, 120) || null;
    const instructions = String(formData.get("instructions") ?? settings.instructions ?? "").trim().slice(0, 4000) || null;
    const ok = await transition(storeId, returnId, "requested", {
      status: "approved",
      decided_at: now,
      return_carrier_name: carrier,
      return_code: code,
      return_instructions_snapshot: instructions,
    });
    if (!ok) redirect(detailPath(customerId, storeId, returnId, "hata=durum"));
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "order_return.approve",
    entityType: "order_return",
    entityId: returnId,
    metadata: { storeId, orderNumber: context.order.orderNumber, kind: record.kind },
  });
  const fresh = await loadOwnedReturn(storeId, returnId);
  await sendReturnEmail({
    storeId,
    to: context.order.customerEmail,
    orderNumber: context.order.orderNumber,
    returnNumber: record.return_number,
    kind: record.kind,
    event: "approved",
    returnCode: fresh?.return_code,
    carrierName: fresh?.return_carrier_name,
    instructions: fresh?.return_instructions_snapshot,
  });
  revalidateReturn(customerId, storeId, returnId, record.order_id);
  redirect(detailPath(customerId, storeId, returnId, "ok=onay"));
}

export async function rejectReturnAction(customerId: string, storeId: string, returnId: string, formData: FormData): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId, customerId);
  const reason = String(formData.get("rejectionReason") ?? "").trim().slice(0, 1000);
  if (!reason) redirect(detailPath(customerId, storeId, returnId, "hata=gerekce"));
  const record = await loadOwnedReturn(storeId, returnId);
  if (!record || !canTransition(record.kind, record.status, "rejected")) redirect(detailPath(customerId, storeId, returnId, "hata=durum"));
  const ok = await transition(storeId, returnId, "requested", { status: "rejected", rejection_reason: reason, decided_at: new Date().toISOString() });
  if (!ok) redirect(detailPath(customerId, storeId, returnId, "hata=durum"));

  // Reddedilen talebin IBAN'ı tutulmaz.
  await createSupabaseAdminClient().from("order_return_bank_details").delete().eq("return_id", returnId).eq("store_id", storeId);

  const context = await loadReturnOrderContext(storeId, record.order_id);
  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "order_return.reject",
    entityType: "order_return",
    entityId: returnId,
    metadata: { storeId, orderNumber: context?.order.orderNumber ?? null, kind: record.kind },
  });
  await sendReturnEmail({
    storeId,
    to: context?.order.customerEmail ?? null,
    orderNumber: context?.order.orderNumber ?? 0,
    returnNumber: record.return_number,
    kind: record.kind,
    event: "rejected",
    rejectionReason: reason,
  });
  revalidateReturn(customerId, storeId, returnId, record.order_id);
  redirect(detailPath(customerId, storeId, returnId, "ok=red"));
}

/** Ürün geldi. "Stoğa geri ekle" işaretliyse (varsayılan kapalı — satışta stok otomatik düşülmüyor) kalem adetleri stoğa eklenir. */
export async function markReceivedAction(customerId: string, storeId: string, returnId: string, formData: FormData): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId, customerId);
  const record = await loadOwnedReturn(storeId, returnId);
  if (!record || record.kind !== "return" || !canTransition(record.kind, record.status, "received")) redirect(detailPath(customerId, storeId, returnId, "hata=durum"));
  const restock = formData.get("restock") === "on";
  const ok = await transition(storeId, returnId, "approved", { status: "received", received_at: new Date().toISOString(), restock });
  if (!ok) redirect(detailPath(customerId, storeId, returnId, "hata=durum"));

  if (restock) {
    const supabase = await createSupabaseServerClient();
    const { data: items } = await supabase.from("order_return_items").select("order_item_id, quantity").eq("return_id", returnId).eq("store_id", storeId);
    for (const item of items ?? []) {
      const { data: orderItem } = await supabase
        .from("order_items")
        .select("product_id, variant_id")
        .eq("id", item.order_item_id)
        .eq("store_id", storeId)
        .maybeSingle();
      if (orderItem?.variant_id) {
        const { data: variant } = await supabase.from("product_variants").select("stock").eq("id", orderItem.variant_id).eq("store_id", storeId).maybeSingle();
        if (variant && variant.stock !== null) {
          await supabase.from("product_variants").update({ stock: variant.stock + item.quantity }).eq("id", orderItem.variant_id).eq("store_id", storeId);
        }
      } else if (orderItem?.product_id) {
        const { data: product } = await supabase.from("products").select("stock, track_inventory").eq("id", orderItem.product_id).eq("store_id", storeId).maybeSingle();
        if (product?.track_inventory) {
          await supabase.from("products").update({ stock: product.stock + item.quantity }).eq("id", orderItem.product_id).eq("store_id", storeId);
        }
      }
    }
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "order_return.received",
    entityType: "order_return",
    entityId: returnId,
    metadata: { storeId, restock },
  });
  revalidateReturn(customerId, storeId, returnId, record.order_id);
  redirect(detailPath(customerId, storeId, returnId, "ok=geldi"));
}

/**
 * Parayı iade et. mode=iyzico → Refund V2 (hata olursa durum DEĞİŞMEZ, hata
 * gösterilir). mode=manual → dekont/referans zorunlu (IBAN havalesi ya da
 * iyzico panelinden yapılmış iade).
 */
export async function refundReturnAction(customerId: string, storeId: string, returnId: string, formData: FormData): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId, customerId);
  const record = await loadOwnedReturn(storeId, returnId);
  const from: OrderReturnStatus | null = record ? (record.kind === "cancel" ? "approved" : "received") : null;
  if (!record || !from || record.status !== from || !canTransition(record.kind, from, "refunded")) redirect(detailPath(customerId, storeId, returnId, "hata=durum"));
  const context = await loadReturnOrderContext(storeId, record.order_id);
  if (!context) redirect(detailPath(customerId, storeId, returnId, "hata=siparis"));

  // Faz 31 — admin tutarı gerekçeyle ARTIRABİLİR (ör. kısmi iadede kargo
  // ücretini de iade etmek). Üst sınır: müşterinin ödediği toplam − daha önce iade edilen.
  const maxRefundable = Math.max(0, Math.round((orderGrandTotal({
    subtotal: context.order.subtotal,
    discount_amount: context.order.discountAmount,
    shipping_fee: context.order.shippingFee,
    cod_fee: context.order.codFee,
  }) - context.alreadyRefunded) * 100) / 100);
  let amount = Number(record.refund_amount);
  const overrideRaw = String(formData.get("amountOverride") ?? "").trim().replace(",", ".");
  if (overrideRaw) {
    const override = Math.round(Number(overrideRaw) * 100) / 100;
    if (!Number.isFinite(override) || override <= 0 || override > maxRefundable + 0.001) {
      redirect(detailPath(customerId, storeId, returnId, "hata=tutar"));
    }
    if (Math.abs(override - amount) >= 0.01) {
      const note = String(formData.get("overrideNote") ?? "").trim().slice(0, 500);
      if (!note) redirect(detailPath(customerId, storeId, returnId, "hata=tutar-gerekce"));
      const supabase = await createSupabaseServerClient();
      await supabase
        .from("order_returns")
        .update({
          refund_amount: override,
          admin_note: `${record.admin_note ? `${record.admin_note}\n` : ""}İade tutarı ${amount.toFixed(2)} → ${override.toFixed(2)} TL: ${note}`.slice(0, 2000),
        })
        .eq("id", returnId)
        .eq("store_id", storeId)
        .eq("status", from);
      amount = override;
    }
  }
  const mode = String(formData.get("mode") ?? "manual");
  let reference = String(formData.get("reference") ?? "").trim().slice(0, 200);

  if (mode === "iyzico") {
    if (record.refund_method !== "iyzico" || !context.order.paymentProviderPaymentId) redirect(detailPath(customerId, storeId, returnId, "hata=yontem"));
    const credentials = await getPaymentIntegrationCredentials(storeId);
    if (!credentials) redirect(detailPath(customerId, storeId, returnId, "hata=iyzico-kapali"));
    try {
      const result = await refundPaymentV2(credentials, {
        paymentId: context.order.paymentProviderPaymentId,
        price: amount,
        conversationId: returnId,
        ip: await resolveRequestClientIp(),
      });
      reference = `iyzico ${result.hostReference ?? result.paymentId}`;
    } catch (error) {
      const message = error instanceof IyzicoApiError || error instanceof IyzicoSignatureError ? error.message : "iyzico iadesi tamamlanamadı.";
      console.error("[returns] iyzico refund failed:", message);
      redirect(detailPath(customerId, storeId, returnId, `hata=iyzico&mesaj=${encodeURIComponent(message.slice(0, 200))}`));
    }
  } else if (!reference) {
    redirect(detailPath(customerId, storeId, returnId, "hata=referans"));
  }

  const ok = await transition(storeId, returnId, from, { status: "refunded", refunded_at: new Date().toISOString(), refund_reference: reference });
  if (!ok) redirect(detailPath(customerId, storeId, returnId, "hata=durum"));

  // Siparişin ödeme durumu: toplam iade ≥ ödenen toplam (kargo dahil) → "İade Edildi", değilse "Kısmi İade".
  const totalRefunded = context.alreadyRefunded + amount;
  const net = orderGrandTotal({
    subtotal: context.order.subtotal,
    discount_amount: context.order.discountAmount,
    shipping_fee: context.order.shippingFee,
    cod_fee: context.order.codFee,
  });
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("orders")
    .update({ payment_status: totalRefunded + 0.005 >= net ? "refunded" : "partially_refunded" })
    .eq("id", context.order.id)
    .eq("store_id", storeId);

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "order_return.refund",
    entityType: "order_return",
    entityId: returnId,
    metadata: { storeId, orderNumber: context.order.orderNumber, amount, mode },
  });
  await sendReturnEmail({
    storeId,
    to: context.order.customerEmail,
    orderNumber: context.order.orderNumber,
    returnNumber: record.return_number,
    kind: record.kind,
    event: "refunded",
    refundAmount: amount,
  });
  revalidateReturn(customerId, storeId, returnId, record.order_id);
  redirect(detailPath(customerId, storeId, returnId, "ok=iade"));
}

/** İade edilecek para yoksa (ör. ödenmemiş kapıda ödeme) süreci kapat. */
export async function closeReturnAction(customerId: string, storeId: string, returnId: string): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId, customerId);
  const record = await loadOwnedReturn(storeId, returnId);
  const from: OrderReturnStatus | null = record ? (record.kind === "cancel" ? "approved" : "received") : null;
  if (!record || !from || record.status !== from || !canTransition(record.kind, from, "closed")) redirect(detailPath(customerId, storeId, returnId, "hata=durum"));
  const ok = await transition(storeId, returnId, from, { status: "closed" });
  if (!ok) redirect(detailPath(customerId, storeId, returnId, "hata=durum"));
  await logAuditEvent({ userId: user.id, customerId, action: "order_return.close", entityType: "order_return", entityId: returnId, metadata: { storeId } });
  revalidateReturn(customerId, storeId, returnId, record.order_id);
  redirect(detailPath(customerId, storeId, returnId, "ok=kapandi"));
}

/** IBAN'ı göster (store_admin+, AAL2). Değerin kendisi log'a/audit'e YAZILMAZ; yalnız "gösterildi" kaydı. */
export async function revealIbanAction(customerId: string, storeId: string, returnId: string, _prev: RevealIbanState): Promise<RevealIbanState> {
  const { user } = await requireStoreAdminAccess(storeId, customerId);
  const record = await loadOwnedReturn(storeId, returnId);
  if (!record) return { iban: null, holder: null, error: "Talep bulunamadı." };
  const { data } = await createSupabaseAdminClient()
    .from("order_return_bank_details")
    .select("iban, account_holder")
    .eq("return_id", returnId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!data) return { iban: null, holder: null, error: "Bu talep için kayıtlı IBAN yok." };
  await logAuditEvent({ userId: user.id, customerId, action: "order_return.iban_reveal", entityType: "order_return", entityId: returnId, metadata: { storeId } });
  return { iban: formatIban(data.iban), holder: data.account_holder, error: null };
}
