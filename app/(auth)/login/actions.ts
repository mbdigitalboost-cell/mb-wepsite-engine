"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { loginFormSchema } from "@/lib/validation/auth";
import type { LoginState } from "./form-state";

// Güvenlik sertleştirmesi (Phase 1, PHASE_0 Bulgu H2): bu action önceden
// hiçbir deneme sınırı olmadan doğrudan `signInWithPassword` çağırıyordu
// — sınırsız brute-force/credential-stuffing riski. İki katmanlı limit
// uygulanıyor: (1) IP+e-posta kombinasyonu başına dar bir limit (hedefli
// bir hesaba karşı deneme sprayini yavaşlatır), (2) yalnızca IP başına
// daha geniş bir limit (tek bir IP'den çok sayıda FARKLI e-posta
// denenerek yapılan bir enumeration/credential-stuffing saldırısını
// yakalar — sadece e-posta+IP kombinasyonuna bakmak bunu kaçırırdı).
// `lib/security/rate-limit.ts`'in kendi dokümantasyonunda belirtildiği
// gibi bu bellek-içi/dağıtık-olmayan bir limiter — tek instance için
// gerçek bir ilk savunma hattı, ödeme içeren bir platforma geçmeden önce
// Upstash Redis gibi dağıtık bir çözüme taşınması önerilir (bkz. audit
// raporu §19).
const LOGIN_RATE_LIMIT_PER_EMAIL = { limit: 5, windowMs: 15 * 60 * 1000 };
const LOGIN_RATE_LIMIT_PER_IP = { limit: 20, windowMs: 15 * 60 * 1000 };

const GENERIC_LOGIN_ERROR = "E-posta veya şifre hatalı.";
const RATE_LIMITED_ERROR = "Çok fazla başarısız deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.";

/**
 * Server Action backing the login form (bound via React's
 * `useActionState`). Server-side is the ONLY place this is validated —
 * there is no client-side auth check anywhere that matters for security,
 * only for instant form feedback.
 *
 * Deliberately returns a generic "e-posta veya şifre hatalı" message for
 * every failure case (wrong password, unknown email, rate-limited, etc.)
 * rather than Supabase's raw error where possible — telling an attacker
 * "that email doesn't exist" vs. "wrong password" is an account-
 * enumeration leak. The rate-limit message IS distinguishable from the
 * credential error on purpose (a real user needs to know why their
 * correct password stopped working temporarily), but it never confirms
 * or denies whether the e-posta itself has an account.
 */
export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "E-posta ve şifre gerekli." };
  }

  const { email, password } = parsed.data;

  // Server Action olarak çağrıldığından burada bir `Request` nesnesi yok
  // — `getClientIp` bir `Request` bekliyor, bu yüzden onu değiştirmek
  // yerine (discovery-request route'unda kullanılan gerçek bir Request
  // ile aynı imzayı korumak için) aynı `x-forwarded-for`/`x-real-ip`
  // çıkarma mantığını burada tekrar etmek yerine, Next.js'in `headers()`
  // API'sinin döndürdüğü değerlerle minimal bir Headers nesnesi kurup
  // aynı yardımcıyı çağırıyoruz — tek bir IP-çıkarma mantığı kalıyor.
  const headerList = await headers();
  const ip = getClientIp(new Request("http://internal", { headers: headerList }));

  const perIp = rateLimit(`login:ip:${ip}`, LOGIN_RATE_LIMIT_PER_IP);
  const perEmail = rateLimit(`login:email:${ip}:${email}`, LOGIN_RATE_LIMIT_PER_EMAIL);

  if (!perIp.allowed || !perEmail.allowed) {
    await logAuditEvent({
      userId: null,
      customerId: null,
      action: "auth.login_rate_limited",
      entityType: "auth",
      metadata: { email },
    });
    return { error: RATE_LIMITED_ERROR };
  }

  if (!isSupabaseConfigured()) {
    return {
      error:
        "Supabase henüz bağlanmadı. Platform Supabase projesi kurulup .env.local doldurulduğunda giriş aktif olacak.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await logAuditEvent({
      userId: null,
      customerId: null,
      action: "auth.login_failed",
      entityType: "auth",
      metadata: { email },
    });
    return { error: GENERIC_LOGIN_ERROR };
  }

  await logAuditEvent({
    userId: data.user.id,
    customerId: null,
    action: "auth.login_succeeded",
    entityType: "auth",
    entityId: data.user.id,
  });

  redirect("/dashboard");
}
