"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { inviteUser } from "@/lib/auth/invite-user";
import { inviteUserFormSchema, userRoleFormSchema } from "@/lib/validation/invite";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { InviteFormState, RoleFormState } from "./form-state";

/**
 * Invite → create-account → assign-role, all in one action:
 *  1. `inviteUser()` sends the Supabase Auth invite email. This is what
 *     actually creates the `auth.users` row (and, via the
 *     `handle_new_user` trigger from migration 0004, the matching
 *     `profiles` row) — there is no separate "create account" step.
 *  2. The service-role admin client sets `profiles.full_name`, because
 *     RLS only lets a profile update ITSELF (migration 0004) — an admin
 *     inviting someone else cannot do this through the normal RLS-backed
 *     client, and rightly so.
 *  3. A `customer_users` row is inserted with the chosen role/customer —
 *     this is what actually grants access; being invited alone grants
 *     nothing.
 *
 * At no point does this action see, generate, or store a password — the
 * invited user sets their own at /auth/set-password after clicking the
 * emailed link (see lib/auth/invite-user.ts's redirectTo default).
 */
export async function inviteUserAction(
  _prevState: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const { user } = await requireAdmin();

  const parsed = inviteUserFormSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    customerId: formData.get("customerId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form.", success: null };
  }

  const { email, fullName, role, customerId } = parsed.data;
  const scopedCustomerId = role === "customer" ? customerId || null : null;

  const inviteResult = await inviteUser({ email, fullName });
  if (!inviteResult.ok || !inviteResult.userId) {
    return { error: inviteResult.error ?? "Davet gönderilemedi.", success: null };
  }

  const admin = createSupabaseAdminClient();
  await admin.from("profiles").update({ full_name: fullName }).eq("id", inviteResult.userId);

  const { error: membershipError } = await admin.from("customer_users").insert({
    user_id: inviteResult.userId,
    role,
    customer_id: scopedCustomerId,
  });

  if (membershipError) {
    return {
      error: `Davet gönderildi ancak rol atanamadı: ${membershipError.message}. Kullanıcılar listesinden tekrar deneyin.`,
      success: null,
    };
  }

  await logAuditEvent({
    userId: user.id,
    customerId: scopedCustomerId,
    action: "user.invite",
    entityType: "user",
    entityId: inviteResult.userId,
    metadata: { email, fullName, role },
  });

  revalidatePath("/dashboard/users");
  return { error: null, success: `${email} adresine davet gönderildi.` };
}

export async function changeUserRoleAction(
  _prevState: RoleFormState,
  formData: FormData,
): Promise<RoleFormState> {
  const { user } = await requireAdmin();

  const parsed = userRoleFormSchema.safeParse({
    membershipId: formData.get("membershipId"),
    role: formData.get("role"),
    customerId: formData.get("customerId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const { membershipId, role, customerId } = parsed.data;
  const scopedCustomerId = role === "customer" ? customerId || null : null;

  const supabase = await createSupabaseServerClient();
  const { data: membership, error } = await supabase
    .from("customer_users")
    .update({ role, customer_id: scopedCustomerId })
    .eq("id", membershipId)
    .select("user_id")
    .single();

  if (error || !membership) {
    return { error: `Rol değiştirilemedi: ${error?.message ?? "kayıt bulunamadı"}` };
  }

  await logAuditEvent({
    userId: user.id,
    customerId: scopedCustomerId,
    action: "user.role_change",
    entityType: "user",
    entityId: membership.user_id,
    metadata: { role, customerId: scopedCustomerId },
  });

  revalidatePath("/dashboard/users");
  return { error: null };
}
