"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/lib/utils/input-classes";
import {
  startMfaEnrollmentAction,
  confirmMfaEnrollmentAction,
  disableMfaAction,
  initialMfaActionState,
} from "./mfa-actions";
import type { TotpFactorSummary } from "@/lib/auth/mfa";

/**
 * Phase 1 (PHASE_0 sonrası MFA eklentisi) — bkz. lib/auth/mfa.ts'in
 * dosya yorumu. Bilinçli olarak sade tutuldu: tek faktör türü (TOTP),
 * tek "etkinleştir/kaldır" akışı, no client-side crypto — QR kod ve
 * secret tamamen Supabase'in kendi `enroll()` yanıtından geliyor.
 */
export function MfaSection({ factors }: { factors: TotpFactorSummary[] }) {
  const router = useRouter();
  const verifiedFactor = factors.find((factor) => factor.status === "verified") ?? null;

  const [enrollment, setEnrollment] = useState(initialMfaActionState);
  const [startPending, startTransitionForStart] = useTransition();

  const [confirmState, confirmFormAction, confirmPending] = useActionState(
    confirmMfaEnrollmentAction,
    initialMfaActionState,
  );

  const [disableError, setDisableError] = useState<string | null>(null);
  const [disablePending, startTransitionForDisable] = useTransition();

  useEffect(() => {
    if (confirmState.enrolled) {
      router.refresh();
    }
  }, [confirmState.enrolled, router]);

  function handleStartEnrollment() {
    startTransitionForStart(async () => {
      const result = await startMfaEnrollmentAction();
      setEnrollment(result);
    });
  }

  function handleDisable() {
    if (!verifiedFactor) return;
    startTransitionForDisable(async () => {
      const result = await disableMfaAction(verifiedFactor.id);
      setDisableError(result.error);
      if (!result.error) router.refresh();
    });
  }

  if (verifiedFactor) {
    return (
      <div>
        <p className="text-sm text-foreground/60">
          İki adımlı doğrulama <span className="font-medium text-foreground">aktif</span>.
        </p>
        {disableError ? (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {disableError}
          </p>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disablePending}
          onClick={handleDisable}
          className="mt-3"
        >
          {disablePending ? "Kaldırılıyor..." : "İki Adımlı Doğrulamayı Kaldır"}
        </Button>
      </div>
    );
  }

  if (enrollment.enrollment) {
    return (
      <form action={confirmFormAction} className="space-y-4">
        <input type="hidden" name="factorId" value={enrollment.enrollment.factorId} />
        <p className="text-sm text-foreground/60">
          Kimlik doğrulama uygulamanızla (Google Authenticator, 1Password vb.) aşağıdaki QR kodu okutun,
          ardından uygulamanın gösterdiği 6 haneli kodu girin.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element -- Supabase'in döndürdüğü data: URI, next/image ile uyumlu bir remote kaynak değil */}
        <img src={enrollment.enrollment.qrCode} alt="TOTP QR kodu" width={180} height={180} className="rounded-md border border-black/10" />
        <p className="text-xs text-foreground/50 break-all">
          Manuel giriş anahtarı: <span className="font-mono">{enrollment.enrollment.secret}</span>
        </p>
        <input
          name="code"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          placeholder="123456"
          className={inputClasses}
        />
        {confirmState.error ? (
          <p role="alert" className="text-sm text-red-600">
            {confirmState.error}
          </p>
        ) : null}
        <Button type="submit" size="sm" disabled={confirmPending}>
          {confirmPending ? "Doğrulanıyor..." : "Etkinleştir"}
        </Button>
      </form>
    );
  }

  return (
    <div>
      <p className="text-sm text-foreground/60">
        İki adımlı doğrulama <span className="font-medium text-foreground">kapalı</span>.
      </p>
      {enrollment.error ? (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {enrollment.error}
        </p>
      ) : null}
      <Button type="button" size="sm" disabled={startPending} onClick={handleStartEnrollment} className="mt-3">
        {startPending ? "Hazırlanıyor..." : "Etkinleştir"}
      </Button>
    </div>
  );
}
