import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveSafeNextPath } from "@/lib/security/safe-redirect";

/**
 * Handles every Supabase Auth "click a link in an email" flow: invite
 * acceptance, password recovery, magic link. Supabase sends the user
 * here with a `?code=...` query param; exchanging it for a session sets
 * the auth cookies (via the same cookie-writing Supabase server client
 * used everywhere else), then we forward the user on.
 *
 * `next` lets a specific flow choose where to land afterwards (defaults
 * to the dashboard) — see lib/auth/invite-user.ts for the one caller
 * that sets it today (`?next=/auth/set-password`).
 *
 * GÜVENLİK (Phase 1, PHASE_0 bulgusu H1): `next` daha önce hiç
 * doğrulanmadan `${origin}${next}` şeklinde birleştiriliyordu. Bu, bir
 * saldırganın `next=@evil.com` gibi bir değerle userinfo/host enjeksiyonu
 * yaparak (`http://siteniz.com@evil.com` — tarayıcı bunu `evil.com`
 * host'una yönlendirir) meşru görünümlü bir invite/reset e-postası linki
 * üzerinden phishing yapmasına izin veriyordu. `resolveSafeNextPath` artık
 * `next`'i yalnızca "gerçekten bu sitenin içinde bir path'e mi işaret
 * ediyor" diye doğruluyor (allowlist: `/` ile başlamalı, `//`/`@`/`:`
 * içermemeli) — geçersizse sessizce varsayılan `/dashboard`'a düşüyor,
 * mevcut login/invite/password-reset akışlarının hiçbiri bundan
 * etkilenmiyor (hepsi zaten ya `next` göndermiyor ya da geçerli bir
 * `/dashboard` veya `/auth/set-password` path'i gönderiyor).
 *
 * GET /auth/callback?code=...&next=/dashboard
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = resolveSafeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
