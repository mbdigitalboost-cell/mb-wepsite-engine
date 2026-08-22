"use server";

import { requireSession } from "@/lib/auth/require-session";
import { enrollTotpFactor, verifyTotpCode, unenrollTotpFactor, type EnrollTotpResult } from "@/lib/auth/mfa";
import { logAuditEvent } from "@/lib/auth/audit-log";

export interface MfaActionState {
  error: string | null;
  enrollment: EnrollTotpResult | null;
  enrolled: boolean;
}

export const initialMfaActionState: MfaActionState = { error: null, enrollment: null, enrolled: false };

/** Starts enrollment: creates an unverified TOTP factor and returns its QR code/secret for the client to show. */
export async function startMfaEnrollmentAction(): Promise<MfaActionState> {
  const { user } = await requireSession();

  const result = await enrollTotpFactor();
  if (!result.ok) {
    return { error: result.error, enrollment: null, enrolled: false };
  }

  await logAuditEvent({
    userId: user.id,
    customerId: null,
    action: "auth.mfa_enrollment_started",
    entityType: "auth",
    entityId: user.id,
    metadata: { factorId: result.data.factorId },
  });

  return { error: null, enrollment: result.data, enrolled: false };
}

/** Confirms enrollment with the 6-digit code the user's authenticator app is now showing. */
export async function confirmMfaEnrollmentAction(
  prevState: MfaActionState,
  formData: FormData,
): Promise<MfaActionState> {
  const { user } = await requireSession();
  const factorId = String(formData.get("factorId") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  if (!factorId || !/^\d{6}$/.test(code)) {
    return { ...prevState, error: "Lütfen 6 haneli kodu girin." };
  }

  const result = await verifyTotpCode(factorId, code);
  if (!result.ok) {
    return { ...prevState, error: "Kod hatalı veya süresi dolmuş. Lütfen tekrar deneyin." };
  }

  await logAuditEvent({
    userId: user.id,
    customerId: null,
    action: "auth.mfa_enrolled",
    entityType: "auth",
    entityId: user.id,
    metadata: { factorId },
  });

  return { error: null, enrollment: null, enrolled: true };
}

export async function disableMfaAction(factorId: string): Promise<{ error: string | null }> {
  const { user } = await requireSession();

  const result = await unenrollTotpFactor(factorId);
  if (!result.ok) {
    return { error: result.error };
  }

  await logAuditEvent({
    userId: user.id,
    customerId: null,
    action: "auth.mfa_disabled",
    entityType: "auth",
    entityId: user.id,
    metadata: { factorId },
  });

  return { error: null };
}
