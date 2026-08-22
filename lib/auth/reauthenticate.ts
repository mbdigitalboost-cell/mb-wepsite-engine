import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Phase 1 (PHASE_0 audit bulgusu): en riskli tek işlem — bir kullanıcıya
 * platform admin yetkisi vermek/almak — oturumu açık olan HERKES
 * tarafından, ek bir onay olmadan yapılabiliyordu. Bu, yalnızca
 * `changeUserRoleAction`'a (app/dashboard/users/actions.ts) bağlanan bir
 * "şifreni yeniden gir" adımı — kullanıcının kendi e-postası + girdiği
 * şifreyle `signInWithPassword` çağırarak KENDİ kimliğini yeniden
 * kanıtlamasını istiyor. Bilinçli olarak SADECE bu en yüksek riskli
 * action'a bağlandı (Phase 1 planı: "tüm kritik action'lara retrofit
 * etmek yerine tek, en riskli action'da gösterilen bir desen") — diğer
 * yazma action'ları (içerik/medya/SEO/tracking) bu ek sürtünmeyi
 * gerektirecek kadar riskli değil; onlar zaten requireCustomerWriteAccess
 * ile korunuyor.
 *
 * `signInWithPassword` başarılı olursa mevcut oturumu YENİLER (aynı
 * kullanıcı için) — yeni bir oturum açmıyor, sadece "bu şifre gerçekten
 * bu kullanıcıya ait" doğrulamasını yapıyor.
 */
export async function reauthenticateWithPassword(
  user: User,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!user.email) {
    return { ok: false, error: "Hesabınızda bir e-posta adresi yok, şifre onayı yapılamıyor." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });

  if (error) {
    return { ok: false, error: "Şifre onayı başarısız: girdiğiniz şifre hatalı." };
  }

  return { ok: true };
}
