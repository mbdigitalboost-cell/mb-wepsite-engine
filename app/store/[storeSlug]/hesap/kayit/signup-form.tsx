"use client";

import { useActionState, useId } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/lib/utils/input-classes";
import { signupAction } from "../actions";
import { initialStoreSignupState } from "../form-state";

export function SignupForm({ storeSlug }: { storeSlug: string }) {
  const [state, formAction, pending] = useActionState(signupAction.bind(null, storeSlug), initialStoreSignupState);
  const formId = useId();

  if (state.status === "confirm_email") {
    return (
      <div className="rounded-lg border border-black/10 p-4">
        <h2 className="text-sm font-semibold text-foreground">E-postanızı Kontrol Edin</h2>
        <p className="mt-2 text-sm text-foreground/70">
          Hesabınızı onaylamak için size bir e-posta gönderdik. Onay bağlantısına tıkladıktan sonra giriş
          yapabilirsiniz.
        </p>
        <Link
          href={`/store/${storeSlug}/hesap/giris`}
          className="mt-3 inline-block text-sm text-brand-accent underline-offset-2 hover:underline"
        >
          Giriş sayfasına git
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor={`${formId}-email`} className="mb-1.5 block text-sm font-medium text-foreground">
          E-posta
        </label>
        <input
          id={`${formId}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-password`} className="mb-1.5 block text-sm font-medium text-foreground">
          Şifre
        </label>
        <input
          id={`${formId}-password`}
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClasses}
        />
      </div>

      {state.status === "error" && state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full justify-center">
        {pending ? "Kayıt oluşturuluyor..." : "Hesap Oluştur"}
      </Button>

      <p className="text-center text-xs text-foreground/50">
        Zaten hesabınız var mı?{" "}
        <Link href={`/store/${storeSlug}/hesap/giris`} className="text-brand-accent underline-offset-2 hover:underline">
          Giriş yapın
        </Link>
      </p>
    </form>
  );
}
