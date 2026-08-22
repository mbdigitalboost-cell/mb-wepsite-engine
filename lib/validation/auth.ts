import { z } from "zod";

/**
 * Backs the login form's server action (`app/(auth)/login/actions.ts`).
 * Phase 1, PHASE_0 Bulgu H2 sertleştirmesinin bir parçası: e-posta
 * normalize edilip (trim + lowercase) rate-limit anahtarlarının tutarlı
 * olması sağlanıyor — aynı e-posta farklı harf büyüklüğüyle yazılırsa
 * ayrı bir limit sayacına düşmemeli.
 *
 * Şifreye üst sınır (200) dışında bir kural konmuyor — bu bir KAYIT
 * formu değil, var olan bir şifreyle giriş formu; minimum uzunluk gibi
 * kurallar burada anlamsız ve gerçek kullanıcıyı yanıltabilir.
 */
export const loginFormSchema = z.object({
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin.").max(255),
  password: z.string().min(1, "Şifre gerekli.").max(200),
});

export type LoginFormInput = z.infer<typeof loginFormSchema>;
