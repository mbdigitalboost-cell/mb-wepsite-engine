import "server-only";

import type { AuthenticatorAssuranceLevels } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Thin, server-only wrappers around `supabase.auth.mfa.*` (Phase 1,
 * PHASE_0 Bulgu — "no second factor available" was flagged as a
 * platform-admin-account risk: today exactly ONE person can do
 * everything, cross-customer, with just a password).
 *
 * IMPORTANT — no new dependency was added for this. Supabase's own TOTP
 * enrollment response already includes a ready-to-render SVG QR code at
 * `data.totp.qr_code` (confirmed directly in
 * node_modules/@supabase/auth-js's type definitions/examples) — so the
 * UI can do `<img src={qrCode} />` with zero extra npm packages (the
 * user's explicit "gereksiz bağımlılık ekleme" constraint).
 *
 * `challengeAndVerify` is used instead of separate `challenge()` +
 * `verify()` calls — it's the SDK's own single-step convenience for
 * exactly this case (both enrollment confirmation and post-login
 * challenge just need "here's a 6-digit code, check it").
 */

export interface EnrollTotpResult {
  factorId: string;
  /** Ready-to-render `data:image/svg+xml,...` URI. */
  qrCode: string;
  /** Manual-entry fallback for authenticator apps that can't scan. */
  secret: string;
}

export async function enrollTotpFactor(): Promise<
  { ok: true; data: EnrollTotpResult } | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    data: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret },
  };
}

export async function verifyTotpCode(
  factorId: string,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function unenrollTotpFactor(factorId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export interface TotpFactorSummary {
  id: string;
  friendlyName: string | null;
  status: "verified" | "unverified";
}

/** Verified + unverified TOTP factors for the current session's user. */
export async function listTotpFactors(): Promise<TotpFactorSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.mfa.listFactors();

  if (error || !data) {
    if (error) console.error("[auth/mfa] listFactors failed:", error.message);
    return [];
  }

  return data.totp.map((factor) => ({
    id: factor.id,
    friendlyName: factor.friendly_name ?? null,
    status: factor.status,
  }));
}

export type AalStatus = {
  currentLevel: AuthenticatorAssuranceLevels | null;
  nextLevel: AuthenticatorAssuranceLevels | null;
};

/**
 * `nextLevel === "aal2" && currentLevel !== "aal2"` is the exact signal
 * used by app/dashboard/layout.tsx (and app/(auth)/mfa-challenge) to mean
 * "this user has a verified factor enrolled, but has not completed the
 * second-factor challenge for the CURRENT session yet — send them to the
 * challenge screen before showing anything else."
 */
export async function getAalStatus(): Promise<AalStatus> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (error || !data) {
    if (error) console.error("[auth/mfa] getAuthenticatorAssuranceLevel failed:", error.message);
    return { currentLevel: null, nextLevel: null };
  }

  return { currentLevel: data.currentLevel, nextLevel: data.nextLevel };
}

export function needsMfaChallenge(status: AalStatus): boolean {
  return status.nextLevel === "aal2" && status.currentLevel !== "aal2";
}
