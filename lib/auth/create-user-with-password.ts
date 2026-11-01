import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/auth/generate-temp-password";

export interface CreateUserResult {
  ok: boolean;
  userId?: string;
  tempPassword?: string;
  error?: string;
}

/**
 * Admin Kullanıcı Oluşturma devir metni — lib/auth/invite-user.ts'in
 * (Supabase'in kendi e-posta davet mekanizması, `inviteUserByEmail`)
 * YERİNİ ALIYOR. KÖK NEDEN: Supabase'in varsayılan e-posta gönderimi
 * (özel SMTP bağlanmadan) güvenilmez + Auth Site URL hâlâ localhost'ta
 * (Faz 5.1'den beri açık bir sorun, bu turun KAPSAMI DIŞI) — davet
 * e-postası gitse bile linki kullanıcının kendi makinesinde çalışmayan
 * bir adrese gidiyordu. taktikalp46@gmail.com GERÇEKTE bu yüzden hiç
 * giriş yapamadı (invited_at/confirmation_sent_at dolu ama confirmed_at/
 * last_sign_in_at hep null).
 *
 * Yeni akış: e-postaya HİÇ güvenilmiyor. Admin API ile hem hesap
 * OLUŞTURULUYOR hem email_confirm:true ile DOĞRULANMIŞ sayılıyor hem de
 * rastgele bir geçici şifre DOĞRUDAN atanıyor — kullanıcı onay beklemeden
 * ilk günden girebiliyor. `must_change_password: true` user_metadata
 * flag'i, app/dashboard/layout.tsx'in kendi gate'i tarafından okunup ilk
 * girişte /auth/set-password'e yönlendirmeyi tetikliyor.
 *
 * Üretilen şifre BURADA, dönüş değerinde bir KEZ var — hiçbir yere
 * (veritabanı, log, audit event metadata'sı) düz metin olarak YAZILMIYOR.
 * Çağıran action (createUserAction) bunu SADECE kendi one-shot form
 * state'inde admin'in tarayıcısına döndürüyor.
 */
export async function createUserWithPassword(params: { email: string; fullName: string }): Promise<CreateUserResult> {
  const admin = createSupabaseAdminClient();
  const tempPassword = generateTempPassword();

  const { data, error } = await admin.auth.admin.createUser({
    email: params.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: params.fullName, must_change_password: true },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, userId: data.user?.id, tempPassword };
}

/**
 * "ACİL — mevcut takılı kalan hesabı düzelt" devir metnindeki senaryonun
 * GENEL/tekrar kullanılabilir hâli: var olan, bir şekilde kilitlenmiş/
 * giremeyen bir kullanıcıya YENİ bir geçici şifre atar + tekrar
 * `must_change_password: true` işaretler — createUserWithPassword'ün
 * "yeni hesap" senaryosunun "var olan hesabı kurtar" karşılığı.
 *
 * Mevcut `user_metadata`'yı ÖNCE okuyup merge ediyor (full_name gibi
 * alanları kaybetmemek için) — Admin API'nin `updateUserById`'si
 * `user_metadata`'yı GoTrue'nun kendi self-service `updateUser`'ı gibi
 * otomatik merge ETMEYEBİLİR, bu yüzden merge burada, açıkça, elle
 * yapılıyor.
 */
export async function resetUserPassword(userId: string): Promise<CreateUserResult> {
  const admin = createSupabaseAdminClient();
  const tempPassword = generateTempPassword();

  const { data: existing, error: fetchError } = await admin.auth.admin.getUserById(userId);
  if (fetchError || !existing.user) {
    return { ok: false, error: fetchError?.message ?? "Kullanıcı bulunamadı." };
  }

  const mergedMetadata = { ...existing.user.user_metadata, must_change_password: true };

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: tempPassword,
    email_confirm: true,
    user_metadata: mergedMetadata,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, userId, tempPassword };
}
