"use client";

import { useActionState, useState } from "react";
import { initialResetPasswordFormState, type ResetPasswordFormState } from "./form-state";
import { TempPasswordReveal } from "./temp-password-reveal";

const selectClasses =
  "rounded-md border border-black/15 bg-transparent px-2 py-1.5 text-xs text-foreground focus-visible:border-foreground/40 focus-visible:outline-none";

interface ResetPasswordFormProps {
  /**
   * "Şifreyi Sıfırla üretilen şifreyi göstermiyor" ACİL devir metni —
   * KÖK NEDEN: bu action önceden BURADA, client component'in İÇİNDE,
   * her render'da yeniden `resetUserPasswordAction.bind(null, userId,
   * email)` ile üretiliyordu. DeleteProductButton/DuplicateProductButton
   * gibi bu codebase'in HER YERDE kanıtlanmış çalışan deseni AKSİNE —
   * oralarda bind SERVER COMPONENT'TE (page.tsx) BİR KEZ yapılıp sonucu
   * client'a bir PROP olarak geçiyor. Artık aynı desen: page.tsx
   * `resetUserPasswordAction.bind(null, membership.user_id, profile.email)`'i
   * BİR KEZ üretip buraya `action` prop'u olarak geçiyor.
   */
  action: (prevState: ResetPasswordFormState, formData: FormData) => Promise<ResetPasswordFormState>;
  email: string;
}

/**
 * Admin Kullanıcı Oluşturma devir metni — "Şifreyi Sıfırla", sıkışmış/
 * giremeyen bir kullanıcıyı kurtarmak için.
 *
 * Görünürlük artık native `<details>`'in KENDİ uncontrolled durumuna
 * DEĞİL, açık bir `useState`'e bağlı — revalidatePath'in tetiklediği
 * sunucu-kaynaklı yeniden render'larda native bir elementin "open"
 * attribute'unun hayatta kalıp kalmayacağına dair HİÇBİR belirsizlik
 * bırakmıyor (ACİL devir metninin kendi "ekranda hiçbir şifre
 * gösterilmedi" bulgusunun ikinci olası sebebiydi).
 */
export function ResetPasswordForm({ action, email }: ResetPasswordFormProps) {
  const [state, formAction, pending] = useActionState(action, initialResetPasswordFormState);
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-1 text-xs text-foreground/50 underline-offset-2 hover:text-foreground hover:underline"
      >
        Şifreyi Sıfırla
      </button>
    );
  }

  return (
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
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-xs text-foreground/40 underline-offset-2 hover:text-foreground hover:underline"
        >
          Vazgeç
        </button>
        {state.error ? <span className="text-xs text-red-600">{state.error}</span> : null}
      </form>
      {state.success ? <TempPasswordReveal email={state.success.email} tempPassword={state.success.tempPassword} /> : null}
    </div>
  );
}
