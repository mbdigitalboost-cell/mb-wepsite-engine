"use server";

import { revalidatePath } from "next/cache";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { isOrderStatus, isPaymentStatus } from "./status-labels";

/**
 * store_editor+ (RLS: orders_update_editor_tier) — same tier as
 * toggleProductActiveAction (a status transition is reversible, not the
 * "kalıcı silme" tier reserved for store_admin+ elsewhere — and orders
 * have no delete path at all, see migration 0029's own header). Reads the
 * submitted status from formData rather than a bound argument (unlike
 * toggleProductActiveAction's fixed `nextActive`) because this is a real
 * <select> of 6 possible values, not a single on/off toggle.
 */
export async function updateOrderStatusAction(
  customerId: string,
  storeId: string,
  orderId: string,
  formData: FormData,
): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const status = String(formData.get("status") ?? "");
  if (!isOrderStatus(status)) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId).eq("store_id", storeId);

  if (error) {
    console.error("[orders] failed to update order status:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "order.status_update",
    entityType: "order",
    entityId: orderId,
    metadata: { status },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/orders`);
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/orders/${orderId}`);
}

/**
 * FAZ 2.5 — store_editor+ (RLS: orders_update_editor_tier, same policy as
 * updateOrderStatusAction above — it already covers every column on this
 * table, no separate policy was added, see migration 0029's own comment).
 *
 * Reads the current row first so `paid_at` is set exactly ONCE, on the
 * real unpaid->paid transition — resubmitting the form with 'paid'
 * already selected (e.g. after also editing shipping info) never
 * overwrites an already-recorded payment timestamp with "now".
 */
export async function updateOrderPaymentStatusAction(
  customerId: string,
  storeId: string,
  orderId: string,
  formData: FormData,
): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const paymentStatus = String(formData.get("paymentStatus") ?? "");
  if (!isPaymentStatus(paymentStatus)) return;

  const supabase = await createSupabaseServerClient();

  const { data: current } = await supabase
    .from("orders")
    .select("payment_status, paid_at")
    .eq("id", orderId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!current) return;

  const shouldSetPaidAt = paymentStatus === "paid" && !current.paid_at;

  const { error } = await supabase
    .from("orders")
    .update({
      payment_status: paymentStatus,
      ...(shouldSetPaidAt ? { paid_at: new Date().toISOString() } : {}),
    })
    .eq("id", orderId)
    .eq("store_id", storeId);

  if (error) {
    console.error("[orders] failed to update payment status:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "order.payment_status_update",
    entityType: "order",
    entityId: orderId,
    metadata: { paymentStatus },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/orders`);
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/orders/${orderId}`);
}

/**
 * FAZ 2.5 — store_editor+, same policy as above. No carrier integration
 * this phase (a separate, later phase — which carrier is a real question
 * still open) — carrier/tracking_number are plain free-text fields an
 * admin fills in by hand.
 *
 * Silently no-ops (returns without writing) if the order's status hasn't
 * reached 'shipped' yet — mirrors [orderId]/page.tsx's own gating of this
 * form to `status === 'shipped' || status === 'completed'`, so a stale
 * page (open in one tab while another tab moves the order back to an
 * earlier status) can't sneak a shipping-info write in through a form
 * that should have been disabled.
 *
 * shipped_at is set exactly ONCE, the first time this action actually
 * writes — same "set on the real transition, never overwritten later"
 * pattern as paid_at above (editing the tracking number a second time
 * after the order already shipped doesn't reset the shipped date).
 */
export async function updateShippingInfoAction(
  customerId: string,
  storeId: string,
  orderId: string,
  formData: FormData,
): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const carrier = String(formData.get("carrier") ?? "").trim();
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();

  const supabase = await createSupabaseServerClient();

  const { data: current } = await supabase
    .from("orders")
    .select("status, shipped_at")
    .eq("id", orderId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!current) return;
  if (current.status !== "shipped" && current.status !== "completed") return;

  const shouldSetShippedAt = !current.shipped_at;

  const { error } = await supabase
    .from("orders")
    .update({
      carrier: carrier || null,
      tracking_number: trackingNumber || null,
      ...(shouldSetShippedAt ? { shipped_at: new Date().toISOString() } : {}),
    })
    .eq("id", orderId)
    .eq("store_id", storeId);

  if (error) {
    console.error("[orders] failed to update shipping info:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "order.shipping_info_update",
    entityType: "order",
    entityId: orderId,
    metadata: { carrier: carrier || null, trackingNumber: trackingNumber || null },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/orders`);
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/orders/${orderId}`);
}
