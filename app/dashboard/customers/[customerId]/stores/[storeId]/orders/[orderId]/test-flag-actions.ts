"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/auth/audit-log";

/** Faz 30 — siparişi "test" olarak işaretle/kaldır (orders.is_test; satış raporundan hariç tutulur). */
export async function setOrderTestFlagAction(customerId: string, storeId: string, orderId: string, isTest: boolean): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId, customerId);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("orders").update({ is_test: isTest }).eq("id", orderId).eq("store_id", storeId).select("order_number");
  if (data?.length) {
    await logAuditEvent({
      userId: user.id,
      customerId,
      action: "order.test_flag",
      entityType: "order",
      entityId: orderId,
      metadata: { storeId, orderNumber: data[0].order_number, isTest },
    });
  }
  const path = `/dashboard/customers/${customerId}/stores/${storeId}/orders/${orderId}`;
  revalidatePath(path);
  redirect(path);
}
