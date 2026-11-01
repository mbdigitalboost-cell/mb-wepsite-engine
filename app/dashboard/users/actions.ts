"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createUserWithPassword, resetUserPassword } from "@/lib/auth/create-user-with-password";
import { createUserFormSchema, userRoleFormSchema, resetPasswordFormSchema } from "@/lib/validation/invite";
import { reauthenticateWithPassword } from "@/lib/auth/reauthenticate";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { CreateUserFormState, RoleFormState, ResetPasswordFormState } from "./form-state";

/**
 * Admin Kullanıcı Oluşturma devir metni — eski inviteUserAction'ın (Supabase
 * e-posta davet akışı) YERİNE geçti. Create-account → assign-role, tek
 * action:
 *  1. `createUserWithPassword()` hesabı DOĞRUDAN oluşturur + doğrulanmış
 *     sayar + rastgele bir geçici şifre atar — hiçbir e-posta gönderilmez,
 *     hiçbir onay beklenmez (bkz. lib/auth/create-user-with-password.ts'in
 *     kendi KÖK NEDEN yorumu: Supabase'in varsayılan e-posta gönderimi +
 *     hâlâ localhost'ta duran Auth Site URL ayarı yüzünden davet akışı
 *     gerçek kullanıcılar için ÇALIŞMIYORDU).
 *  2. Service-role admin client ile `profiles.full_name` set edilir (RLS
 *     sadece bir profilin KENDİSİNİ güncellemesine izin verir).
 *  3. `customer_users` satırı eklenir — asıl erişimi bu verir.
 *
 * Üretilen şifre SADECE bu action'ın DÖNÜŞ DEĞERİNDE bir kez var — ne
 * veritabanına ne audit log metadata'sına ne de hiçbir yere düz metin
 * olarak yazılmıyor.
 */
export async function createUserAction(
  _prevState: CreateUserFormState,
  formData: FormData,
): Promise<CreateUserFormState> {
  const { user } = await requireAdmin();

  const parsed = createUserFormSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    customerId: formData.get("customerId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form.", success: null };
  }

  const { email, fullName, role, customerId } = parsed.data;
  const scopedCustomerId = role === "store_admin" ? customerId || null : null;

  const createResult = await createUserWithPassword({ email, fullName });
  if (!createResult.ok || !createResult.userId || !createResult.tempPassword) {
    return { error: createResult.error ?? "Kullanıcı oluşturulamadı.", success: null };
  }

  const admin = createSupabaseAdminClient();
  await admin.from("profiles").update({ full_name: fullName }).eq("id", createResult.userId);

  const { error: membershipError } = await admin.from("customer_users").insert({
    user_id: createResult.userId,
    role,
    customer_id: scopedCustomerId,
  });

  if (membershipError) {
    return {
      error: `Kullanıcı oluşturuldu ancak rol atanamadı: ${membershipError.message}. Kullanıcılar listesinden tekrar deneyin.`,
      success: null,
    };
  }

  await logAuditEvent({
    userId: user.id,
    customerId: scopedCustomerId,
    action: "user.create",
    entityType: "user",
    entityId: createResult.userId,
    metadata: { email, fullName, role },
  });

  revalidatePath("/dashboard/users");
  return { error: null, success: { email, tempPassword: createResult.tempPassword } };
}

/**
 * Phase 1 (PHASE_0 audit bulgusu): platform'daki en yüksek riskli tek
 * işlem — bir kullanıcıya platform admin yetkisi vermek/almak. Bu yüzden
 * `requireAdmin()`'in üzerine EK olarak `reauthenticateWithPassword()`
 * bağlandı — form artık admin'in kendi güncel şifresini de istiyor (bkz.
 * lib/validation/invite.ts'teki `currentPassword` alanı ve
 * lib/auth/reauthenticate.ts'in dosya yorumu: bu ek sürtünme bilinçli
 * olarak SADECE bu action'a eklendi, diğer yazma action'larına değil).
 */
export async function changeUserRoleAction(
  _prevState: RoleFormState,
  formData: FormData,
): Promise<RoleFormState> {
  const { user } = await requireAdmin();

  const parsed = userRoleFormSchema.safeParse({
    membershipId: formData.get("membershipId"),
    role: formData.get("role"),
    customerId: formData.get("customerId"),
    currentPassword: formData.get("currentPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const { membershipId, role, customerId, currentPassword } = parsed.data;

  const reauth = await reauthenticateWithPassword(user, currentPassword);
  if (!reauth.ok) {
    await logAuditEvent({
      userId: user.id,
      customerId: null,
      action: "user.role_change_reauth_failed",
      entityType: "user",
      entityId: membershipId,
    });
    return { error: reauth.error };
  }

  const scopedCustomerId = role === "store_admin" ? customerId || null : null;

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

/**
 * Admin Kullanıcı Oluşturma devir metni — "Şifreyi Sıfırla". Sıkışmış/
 * giremeyen bir kullanıcıyı (ör. e-posta davet akışının hiç çalışmadığı
 * taktikalp46@gmail.com) kurtarmak için GENEL, tekrar kullanılabilir bir
 * araç — bu action'ın kendisi, o hesabın canlıda gerçekten düzeltilmesi
 * için de kullanıldı.
 *
 * changeUserRoleAction'ın AYNI reauth deseni (currentPassword) — bir
 * kullanıcının şifresini sıfırlayabilmek platform admin yetkisi vermek
 * kadar (hatta ondan da riskli — doğrudan hesap ele geçirme imkanı)
 * kritik bir işlem.
 */
export async function resetUserPasswordAction(
  userId: string,
  email: string,
  _prevState: ResetPasswordFormState,
  formData: FormData,
): Promise<ResetPasswordFormState> {
  const { user } = await requireAdmin();

  const parsed = resetPasswordFormSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form.", success: null };
  }

  const reauth = await reauthenticateWithPassword(user, parsed.data.currentPassword);
  if (!reauth.ok) {
    await logAuditEvent({
      userId: user.id,
      customerId: null,
      action: "user.password_reset_reauth_failed",
      entityType: "user",
      entityId: userId,
    });
    return { error: reauth.error, success: null };
  }

  const result = await resetUserPassword(userId);
  if (!result.ok || !result.tempPassword) {
    return { error: result.error ?? "Şifre sıfırlanamadı.", success: null };
  }

  await logAuditEvent({
    userId: user.id,
    customerId: null,
    action: "user.password_reset",
    entityType: "user",
    entityId: userId,
  });

  revalidatePath("/dashboard/users");
  return { error: null, success: { email, tempPassword: result.tempPassword } };
}
