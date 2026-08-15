"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { loginAction } from "./actions";
import { initialLoginState } from "./form-state";

const inputClasses =
  "w-full rounded-md border border-black/15 bg-transparent px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus-visible:border-foreground/40 focus-visible:outline-none";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialLoginState);
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
    </form>
  );
}
