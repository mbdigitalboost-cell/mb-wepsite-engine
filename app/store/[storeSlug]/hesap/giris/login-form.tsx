"use client";

import { useActionState, useId } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/lib/utils/input-classes";
import { loginAction } from "../actions";
import { initialStoreLoginState } from "../form-state";

export function StoreLoginForm({ storeSlug }: { storeSlug: string }) {
  const [state, formAction, pending] = useActionState(loginAction.bind(null, storeSlug), initialStoreLoginState);
  const formId = useId();

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
          autoComplete="current-password"
          className={inputClasses}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full justify-center">
        {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
      </Button>

      <p className="text-center text-xs text-foreground/50">
        <Link href={`/store/${storeSlug}/hesap/sifremi-unuttum`} className="text-brand-accent underline-offset-2 hover:underline">
          Şifremi unuttum
        </Link>
      </p>

      <p className="text-center text-xs text-foreground/50">
        Hesabınız yok mu?{" "}
        <Link href={`/store/${storeSlug}/hesap/kayit`} className="text-brand-accent underline-offset-2 hover:underline">
          Hesap oluşturun
        </Link>
      </p>
    </form>
  );
}
