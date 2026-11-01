import "server-only";

import { verifyPassword } from "@/lib/auth/verify-password";
import type { User } from "@supabase/supabase-js";

/**
 * Phase 1 (PHASE_0 audit bulgusu): en riskli tek işlem — bir kullanıcıya
 * platform admin yetkisi vermek/almak — oturumu açık olan HERKES
 * tarafından, ek bir onay olmadan yapılabiliyordu. Bu, `changeUserRoleAction`
 * VE `resetUserPasswordAction`'a (app/dashboard/users/actions.ts) bağlanan
 * bir "şifreni yeniden gir" adımı — kullanıcının kendi e-postası + girdiği
 * şifreyle KENDİ kimliğini yeniden kanıtlamasını istiyor.
 *
 * "Şifreyi Sıfırla hâlâ banner göstermiyor" ACİL devir metni — ÖNCEDEN bu
 * doğrulama admin'in GERÇEK (cookie'lere yazan) oturum client'ı üzerinden
 * yapılıyordu, bu da admin'in MFA/AAL durumunu bozup /mfa-challenge'a
 * sürüklüyordu (bkz. lib/auth/verify-password.ts'in kendi KÖK NEDEN
 * yorumu). Artık `verifyPassword()` TAMAMEN İZOLE bir client kullanıyor —
 * admin'in gerçek oturumuna/çerezlerine/MFA durumuna HİÇ dokunmadan
 * sadece "bu şifre doğru mu" sorusuna cevap veriyor.
 */
export async function reauthenticateWithPassword(
  user: User,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!user.email) {
    return { ok: false, error: "Hesabınızda bir e-posta adresi yok, şifre onayı yapılamıyor." };
  }

  const verified = await verifyPassword(user.email, password);

  if (!verified) {
    return { ok: false, error: "Şifre onayı başarısız: girdiğiniz şifre hatalı." };
  }

  return { ok: true };
}
