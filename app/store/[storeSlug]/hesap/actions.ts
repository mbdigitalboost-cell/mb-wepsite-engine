"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { AuthError } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { storeSignupFormSchema } from "@/lib/validation/store-customer";
import { loginFormSchema } from "@/lib/validation/auth";
import type { StoreSignupState, StoreLoginState } from "./form-state";

const SIGNUP_RATE_LIMIT_PER_EMAIL = { limit: 5, windowMs: 15 * 60 * 1000 };
const SIGNUP_RATE_LIMIT_PER_IP = { limit: 20, windowMs: 15 * 60 * 1000 };
const LOGIN_RATE_LIMIT_PER_EMAIL = { limit: 5, windowMs: 15 * 60 * 1000 };
const LOGIN_RATE_LIMIT_PER_IP = { limit: 20, windowMs: 15 * 60 * 1000 };

const GENERIC_LOGIN_ERROR = "E-posta veya şifre hatalı.";
const RATE_LIMITED_ERROR = "Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.";

async function getRequestIp(): Promise<string> {
  const headerList = await headers();
  return getClientIp(new Request("http://internal", { headers: headerList }));
}

/**
 * FAZ 5.1 — the ONE place a store_customers row is ever written. Called
 * from both signupAction (immediately, if Supabase Auth grants a session
 * right away — i.e. email confirmation is off) and loginAction (every
 * successful login, for every store). Running it on every login — not
 * just signup — is what makes the "aynı e-posta 2 mağazaya ayrı kayıt
 * olabilir" case (spec's own wording) work without a second signup form:
 * logging into a NEW store with an EXISTING account auto-registers that
 * account as this store's customer too. It's also what makes this
 * self-healing if Supabase Auth requires email confirmation (signupAction
 * can't write this row without a session — see its own comment — so the
 * row gets created the moment they actually log in post-confirmation
 * instead).
 *
 * Runs under the caller's own authenticated session (never the
 * service-role admin client) — RLS's `store_customers_insert_self` /
 * `_update_self` policies (migration 0031) are what actually allow this,
 * not application trust.
 */
async function ensureStoreCustomerLink(
  supabase: SupabaseClient<Database>,
  storeId: string,
  userId: string,
  email: string,
): Promise<void> {
  const { error } = await supabase
    .from("store_customers")
    .upsert({ user_id: userId, store_id: storeId, email }, { onConflict: "user_id,store_id" });

  if (error) {
    console.error("[store/hesap] failed to link store_customers row:", error.message);
  }
}

function mapSignupError(error: AuthError): string {
  const message = error.message.toLowerCase();
  if (message.includes("already registered") || message.includes("already exists")) {
    return "Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin.";
  }
  if (message.includes("password")) {
    return "Şifre yeterince güçlü değil, lütfen farklı bir şifre deneyin.";
  }
  return "Kayıt oluşturulamadı, lütfen tekrar deneyin.";
}

export async function signupAction(
  storeSlug: string,
  _prevState: StoreSignupState,
  formData: FormData,
): Promise<StoreSignupState> {
  const store = await getStoreBySlug(storeSlug);
  if (!store) {
    return { status: "error", error: "Mağaza bulunamadı." };
  }

  const parsed = storeSignupFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }
  const { email, password } = parsed.data;

  const ip = await getRequestIp();
  const perIp = rateLimit(`store-signup:ip:${ip}`, SIGNUP_RATE_LIMIT_PER_IP);
  const perEmail = rateLimit(`store-signup:email:${ip}:${email}`, SIGNUP_RATE_LIMIT_PER_EMAIL);
  if (!perIp.allowed || !perEmail.allowed) {
    return { status: "error", error: RATE_LIMITED_ERROR };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { status: "error", error: mapSignupError(error) };
  }
  if (!data.user) {
    return { status: "error", error: "Kayıt oluşturulamadı, lütfen tekrar deneyin." };
  }

  if (!data.session) {
    // Email confirmation is required by this Supabase project's auth
    // settings — no session yet, so store_customers can't (and per its own
    // self-insert RLS policy, must not) be written here. See
    // ensureStoreCustomerLink's own comment: it runs on first login
    // instead, once a real session exists.
    return { status: "confirm_email", error: null };
  }

  await ensureStoreCustomerLink(supabase, store.id, data.user.id, data.user.email ?? email);
  redirect(`/store/${storeSlug}/hesap`);
}

export async function loginAction(
  storeSlug: string,
  _prevState: StoreLoginState,
  formData: FormData,
): Promise<StoreLoginState> {
  const store = await getStoreBySlug(storeSlug);
  if (!store) {
    return { error: "Mağaza bulunamadı." };
  }

  const parsed = loginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "E-posta ve şifre gerekli." };
  }
  const { email, password } = parsed.data;

  const ip = await getRequestIp();
  const perIp = rateLimit(`store-login:ip:${ip}`, LOGIN_RATE_LIMIT_PER_IP);
  const perEmail = rateLimit(`store-login:email:${ip}:${email}`, LOGIN_RATE_LIMIT_PER_EMAIL);
  if (!perIp.allowed || !perEmail.allowed) {
    return { error: RATE_LIMITED_ERROR };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: GENERIC_LOGIN_ERROR };
  }

  await ensureStoreCustomerLink(supabase, store.id, data.user.id, data.user.email ?? email);
  redirect(`/store/${storeSlug}/hesap`);
}

export async function logoutAction(storeSlug: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(`/store/${storeSlug}`);
}
