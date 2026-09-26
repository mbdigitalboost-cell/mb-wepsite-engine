"use server";

import { headers } from "next/headers";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/config/env";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { storePasswordResetRequestSchema } from "@/lib/validation/store-customer";
import type { PasswordResetRequestState } from "./form-state";

const RESET_RATE_LIMIT_PER_EMAIL = { limit: 3, windowMs: 15 * 60 * 1000 };
const RESET_RATE_LIMIT_PER_IP = { limit: 10, windowMs: 15 * 60 * 1000 };

/**
 * FAZ 5.1 — spec: "Supabase Auth'un kendi 'reset password' e-posta akışını
 * kullan (resetPasswordForEmail) — ayrı bir e-posta gönderim sistemi
 * kurma." Reuses app/auth/callback/route.ts UNCHANGED (already a generic,
 * safe `?code=...&next=...` handler — see lib/auth/invite-user.ts for the
 * same reuse on the admin invite side) with `next` pointing at this
 * store's own sifre-guncelle page, not the dashboard's /auth/set-password.
 *
 * Always returns the same "sent" status whether or not the email has an
 * account — same account-enumeration reasoning as the dashboard's own
 * loginAction (app/(auth)/login/actions.ts): Supabase's
 * resetPasswordForEmail itself already never reveals existence, so this
 * just doesn't undo that by branching on its result.
 */
export async function requestPasswordResetAction(
  storeSlug: string,
  _prevState: PasswordResetRequestState,
  formData: FormData,
): Promise<PasswordResetRequestState> {
  const store = await getStoreBySlug(storeSlug);
  if (!store) {
    return { status: "error", error: "Mağaza bulunamadı." };
  }

  const parsed = storePasswordResetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0]?.message ?? "Geçersiz e-posta." };
  }
  const { email } = parsed.data;

  const headerList = await headers();
  const ip = getClientIp(new Request("http://internal", { headers: headerList }));
  const perIp = rateLimit(`store-reset:ip:${ip}`, RESET_RATE_LIMIT_PER_IP);
  const perEmail = rateLimit(`store-reset:email:${ip}:${email}`, RESET_RATE_LIMIT_PER_EMAIL);
  if (!perIp.allowed || !perEmail.allowed) {
    // Deliberately still reports "sent" — a rate-limit-specific error here
    // would itself leak whether repeated attempts are hitting a real
    // account often enough to matter. Silently no-ops instead.
    return { status: "sent", error: null };
  }

  const supabase = await createSupabaseServerClient();
  const redirectTo = `${publicEnv.siteUrl}/auth/callback?next=${encodeURIComponent(`/store/${storeSlug}/hesap/sifre-guncelle`)}`;
  await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  return { status: "sent", error: null };
}
