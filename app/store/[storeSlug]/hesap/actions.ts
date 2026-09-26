"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { AuthError, User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { createSupabaseStorefrontServerClient } from "@/lib/supabase/storefront-server";
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

interface StoreCustomerProfileFields {
  fullName?: string;
  addressCity?: string;
  addressDistrict?: string;
  addressNeighborhood?: string;
  addressLine?: string;
}

/**
 * FAZ 5.1b — reads the same fields signupAction wrote into Supabase Auth's
 * own user_metadata at signUp time (see signupAction's `options.data`
 * below). This is what closes the "email confirmation required" gap:
 * signupAction cannot write store_customers without a session (see its own
 * comment), so the name/address collected AT signup would otherwise be
 * lost by the time a real session exists at first login. user_metadata is
 * persisted on the auth.users row regardless of confirmation status, so
 * it's still there whenever ensureStoreCustomerLink finally runs. Returns
 * `undefined` for a field the metadata doesn't have (e.g. an account that
 * never went through this store's own signup — a plain login elsewhere,
 * or a pre-5.1b account) rather than an empty string, so
 * ensureStoreCustomerLink's upsert leaves an existing, possibly more
 * recent value (see createOrderAction's own address-sync comment)
 * untouched instead of blanking it out.
 */
function extractProfileMetaFromUser(user: User): StoreCustomerProfileFields {
  const meta = user.user_metadata as Record<string, unknown>;
  const asString = (value: unknown) => (typeof value === "string" && value.trim() ? value : undefined);

  return {
    fullName: asString(meta.full_name),
    addressCity: asString(meta.address_city),
    addressDistrict: asString(meta.address_district),
    addressNeighborhood: asString(meta.address_neighborhood),
    addressLine: asString(meta.address_line),
  };
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
 *
 * FAZ 5.1b — `profile` fields are optional and only included in the
 * upsert payload when present (never sent as `undefined`/empty), so a
 * conflict-path UPDATE never overwrites an existing, possibly more
 * recently synced value (see createOrderAction's own address-sync
 * comment) with nothing.
 */
async function ensureStoreCustomerLink(
  supabase: SupabaseClient<Database>,
  storeId: string,
  userId: string,
  email: string,
  profile?: StoreCustomerProfileFields,
): Promise<void> {
  const { error } = await supabase.from("store_customers").upsert(
    {
      user_id: userId,
      store_id: storeId,
      email,
      ...(profile?.fullName !== undefined ? { full_name: profile.fullName } : {}),
      ...(profile?.addressCity !== undefined ? { address_city: profile.addressCity } : {}),
      ...(profile?.addressDistrict !== undefined ? { address_district: profile.addressDistrict } : {}),
      ...(profile?.addressNeighborhood !== undefined ? { address_neighborhood: profile.addressNeighborhood } : {}),
      ...(profile?.addressLine !== undefined ? { address_line: profile.addressLine } : {}),
    },
    { onConflict: "user_id,store_id" },
  );

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
    fullName: formData.get("fullName"),
    addressCity: formData.get("addressCity"),
    addressDistrict: formData.get("addressDistrict"),
    addressNeighborhood: formData.get("addressNeighborhood"),
    addressLine: formData.get("addressLine"),
  });
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }
  const { email, password, fullName, addressCity, addressDistrict, addressNeighborhood, addressLine } = parsed.data;

  const ip = await getRequestIp();
  const perIp = rateLimit(`store-signup:ip:${ip}`, SIGNUP_RATE_LIMIT_PER_IP);
  const perEmail = rateLimit(`store-signup:email:${ip}:${email}`, SIGNUP_RATE_LIMIT_PER_EMAIL);
  if (!perIp.allowed || !perEmail.allowed) {
    return { status: "error", error: RATE_LIMITED_ERROR };
  }

  const supabase = await createSupabaseStorefrontServerClient();
  // FAZ 5.1b — name/address also go into Supabase Auth's own
  // user_metadata (not just store_customers below), specifically so
  // they're not lost if email confirmation is required — see
  // extractProfileMetaFromUser's own comment for why.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        address_city: addressCity,
        address_district: addressDistrict,
        address_neighborhood: addressNeighborhood,
        address_line: addressLine,
      },
    },
  });

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
    // instead, once a real session exists — and extractProfileMetaFromUser
    // recovers fullName/address from user_metadata at that point, since
    // the login form itself only ever asks for email+password.
    return { status: "confirm_email", error: null };
  }

  await ensureStoreCustomerLink(supabase, store.id, data.user.id, data.user.email ?? email, {
    fullName,
    addressCity,
    addressDistrict,
    addressNeighborhood,
    addressLine,
  });
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

  const supabase = await createSupabaseStorefrontServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: GENERIC_LOGIN_ERROR };
  }

  await ensureStoreCustomerLink(
    supabase,
    store.id,
    data.user.id,
    data.user.email ?? email,
    extractProfileMetaFromUser(data.user),
  );
  redirect(`/store/${storeSlug}/hesap`);
}

export async function logoutAction(storeSlug: string): Promise<void> {
  const supabase = await createSupabaseStorefrontServerClient();
  await supabase.auth.signOut();
  redirect(`/store/${storeSlug}`);
}
