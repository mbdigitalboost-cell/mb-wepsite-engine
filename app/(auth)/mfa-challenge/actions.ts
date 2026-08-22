"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";
import { listTotpFactors, verifyTotpCode } from "@/lib/auth/mfa";
import { rateLimit } from "@/lib/security/rate-limit";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { MfaChallengeState } from "./form-state";

// Güvenlik (Phase 1, PHASE_0 sonrası ek bulgu): bir TOTP kodu yalnızca
// 000000–999999 arası 6 haneli bir sayı — hız sınırı olmadan, çalınmış
// bir aal1 oturumuna sahip bir saldırgan bunu makul sürede deneyerek
// geçebilir (TOTP'nin 30 saniyelik pencereleri deneme sayısını kısıtlasa
// da, sınırsız deneme riski gerçek). Login ile aynı düşünceyle kullanıcı
// başına dar bir limit uygulanıyor.
const MFA_CHALLENGE_RATE_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 };

const GENERIC_ERROR = "Kod hatalı veya süresi dolmuş. Lütfen tekrar deneyin.";
const RATE_LIMITED_ERROR = "Çok fazla başarısız deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.";

export async function verifyMfaChallengeAction(
  _prevState: MfaChallengeState,
  formData: FormData,
): Promise<MfaChallengeState> {
  const { user } = await requireSession();
  const code = String(formData.get("code") ?? "").trim();

  if (!/^\d{6}$/.test(code)) {
    return { error: "Lütfen 6 haneli kodu girin." };
  }

  const limit = rateLimit(`mfa-challenge:${user.id}`, MFA_CHALLENGE_RATE_LIMIT);
  if (!limit.allowed) {
    await logAuditEvent({
      userId: user.id,
      customerId: null,
      action: "auth.mfa_challenge_rate_limited",
      entityType: "auth",
      entityId: user.id,
    });
    return { error: RATE_LIMITED_ERROR };
  }

  const factors = await listTotpFactors();
  const verifiedFactor = factors.find((factor) => factor.status === "verified");

  if (!verifiedFactor) {
    // Enrolled-but-then-unenrolled-elsewhere edge case, or a stale
    // client state — safest is to just send them on, requireSession's
    // AAL check upstream will re-evaluate from scratch.
    redirect("/dashboard");
  }

  const result = await verifyTotpCode(verifiedFactor.id, code);

  if (!result.ok) {
    await logAuditEvent({
      userId: user.id,
      customerId: null,
      action: "auth.mfa_challenge_failed",
      entityType: "auth",
      entityId: user.id,
    });
    return { error: GENERIC_ERROR };
  }

  await logAuditEvent({
    userId: user.id,
    customerId: null,
    action: "auth.mfa_challenge_succeeded",
    entityType: "auth",
    entityId: user.id,
  });

  redirect("/dashboard");
}
