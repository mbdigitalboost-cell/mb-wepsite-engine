import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

export interface LogAuditEventInput {
  /** Who did it. `null` only for system-initiated actions, not user ones. */
  userId: string | null;
  /** Which customer this action concerns. `null` for platform-wide actions (e.g. creating a new customer). */
  customerId: string | null;
  /** Short, stable action name, e.g. "customer.create", "website.publish". */
  action: string;
  entityType: string;
  entityId?: string | null;
  /** Must be JSON-serializable — this is stored in a jsonb column. */
  metadata?: Record<string, Json>;
}

/**
 * Writes one row to `audit_logs`. Uses the service-role admin client on
 * purpose: migration 0004 gives `audit_logs` no INSERT policy for
 * anon/authenticated at all, so this is the only path that can write a
 * log row, and only from trusted server code — never from something a
 * browser session could trigger directly.
 *
 * Not called from anywhere yet. Phase 3 only prepares this helper; the
 * real admin/customer actions that will call it (create customer,
 * invite user, deactivate website, publish content, ...) come in later
 * phases once those actions themselves exist. Wire it in at the same
 * time each of those actions is built — right after the action
 * succeeds, with the `user`/`customerId` already established by
 * whichever `require-admin.ts` / `require-customer-access.ts` check
 * gated that action.
 */
export async function logAuditEvent(input: LogAuditEventInput): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("audit_logs").insert({
    user_id: input.userId,
    customer_id: input.customerId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    // A failed log write should never take down the action it was
    // describing — surface it server-side only.
    console.error("[audit] failed to write audit log:", error.message);
  }
}
