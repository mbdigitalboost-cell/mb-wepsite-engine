"use client";

import { useActionState } from "react";
import { resetUserPasswordAction } from "./actions";
import { initialResetPasswordFormState } from "./form-state";
import { TempPasswordReveal } from "./temp-password-reveal";

const selectClasses =
  "rounded-md border border-black/15 bg-transparent px-2 py-1.5 text-xs text-foreground focus-visible:border-foreground/40 focus-visible:outline-none";

interface ResetPasswordFormProps {
  userId: string;
  email: string;
}

/**
 * Admin Kullanıcı Oluşturma devir metni — "Şifreyi Sıfırla", sıkışmış/
 * giremeyen bir kullanıcıyı kurtarmak için. Kendi başına küçük bir
 * <details> açılır panel (brands/page.tsx'in "Düzenle" deseniyle AYNI,
 * zero-JS collapse) — her satırda ayrı bir instance, kendi
 * useActionState'i, kendi TempPasswordReveal'ı.
 */
export function ResetPasswordForm({ userId, email }: ResetPasswordFormProps) {
  const [state, formAction, pending] = useActionState(
    resetUserPasswordAction.bind(null, userId, email),
    initialResetPasswordFormState,
  );

  return (
    <details className="mt-1">
      <summary className="cursor-pointer list-none text-xs text-foreground/50 underline-offset-2 hover:text-foreground hover:underline">
        Şifreyi Sıfırla
      </summary>
      <div className="mt-2 max-w-sm space-y-2">
        <form
          action={formAction}
          onSubmit={(event) => {
            const confirmed = window.confirm(
              `${email} kullanıcısının mevcut şifresi geçersiz olacak ve yerine yeni bir geçici şifre üretilecek. Devam edilsin mi?`,
            );
            if (!confirmed) event.preventDefault();
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input
            aria-label="Şifreniz (onay)"
            name="currentPassword"
            type="password"
            required
            placeholder="Şifreniz (onay)"
            autoComplete="current-password"
            className={selectClasses}
          />
          <button
            type="submit"
            disabled={pending}
            className="text-xs text-foreground/60 underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
          >
            {pending ? "Sıfırlanıyor..." : "Sıfırla"}
          </button>
          {state.error ? <span className="text-xs text-red-600">{state.error}</span> : null}
        </form>
        {state.success ? <TempPasswordReveal email={state.success.email} tempPassword={state.success.tempPassword} /> : null}
      </div>
    </details>
  );
}
