import "server-only";

import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/config/env";
import type { Database } from "@/lib/supabase/types";

/**
 * "Şifreyi Sıfırla hâlâ banner göstermiyor" ACİL devir metni — gerçek kök
 * neden: `reauthenticateWithPassword`'un ESKİ hâli `createSupabaseServerClient()`
 * (lib/supabase/server.ts, `@supabase/ssr`'nin cookie-YAZAN server client'ı)
 * üzerinden `signInWithPassword` çağırıyordu. Admin'in hesabında TOTP/MFA
 * açık olduğu için (Faz 5.1'den beri bilinen durum), bu çağrı admin'in
 * GERÇEK tarayıcı oturumunun AAL durumunu aal1'e düşürüyordu — bir sonraki
 * /dashboard/* isteğinde app/dashboard/layout.tsx'in kendi MFA gate'i
 * yeniden tetikleniyor, admin /mfa-challenge'a sürükleniyor, kod girilince
 * O akışın KENDİ "doğrulama başarılı → /dashboard'a yönlendir" mantığı
 * devreye giriyor ve resetUserPasswordAction'ın/changeUserRoleAction'ın
 * ASIL sonucunu (banner) hiç görmeden eziyordu. Backend'in HER SEFERİNDE
 * gerçekten çalışması (updated_at'ın üç kez de değişmesi) bununla tam
 * tutarlıydı — sorun action'da değil, "onay" adımının yan etkisindeydi.
 *
 * Bu fonksiyon AYNI `signInWithPassword` doğrulamasını yapar ama TAMAMEN
 * İZOLE bir client ile — `persistSession: false` + `autoRefreshToken: false`
 * + hiçbir cookie adapter'ı yok, yani admin'in gerçek oturumuna/MFA
 * durumuna/çerezlerine HİÇ dokunmaz. Sadece "bu e-posta+şifre eşleşiyor
 * mu" sorusuna bir true/false döner, hiçbir session hiçbir yere yazılmaz.
 */
export async function verifyPassword(email: string, password: string): Promise<boolean> {
  const client = createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await client.auth.signInWithPassword({ email, password });
  return !error;
}
