"use server";

import { revalidatePath } from "next/cache";
import { requireCustomerWriteAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { leadStatusSchema } from "@/lib/validation/content";
import { logAuditEvent } from "@/lib/auth/audit-log";

/**
 * Status-change only — leads themselves are created by the public
 * discovery-request flow (not yet wired to this table this phase, see
 * app/api/forms/discovery-request/route.ts), never by an admin/customer
 * typing one in. `leads` has no anon/authenticated SELECT/INSERT policy
 * at all (0005_customer_rls.sql) — only this service-role path, gated by
 * requireCustomerWriteAccess, can ever touch this table.
 */
export async function setLeadStatusAction(customerId: string, leadId: string, formData: FormData): Promise<void> {
  const { user } = await requireCustomerWriteAccess(customerId);

  const parsed = leadStatusSchema.safeParse(formData.get("status"));
  if (!parsed.success) return;

  const connection = await loadCustomerConnection(customerId);
  if (!connection) return;

  const { error } = await connection.client.from("leads").update({ status: parsed.data }).eq("id", leadId);
  if (error) {
    console.error("[leads] failed to set status:", error.message);
    return;
  }

  await logAuditEvent({ userId: user.id, customerId, action: "lead.status_change", entityType: "leads", entityId: leadId, metadata: { status: parsed.data } });
  revalidatePath(`/dashboard/customers/${customerId}/leads`);
}
