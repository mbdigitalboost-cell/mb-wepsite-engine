"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { setPasswordAction } from "./actions";
import { initialSetPasswordState } from "./form-state";

const inputClasses =
  "w-full rounded-md border border-black/15 bg-transparent px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus-visible:border-foreground/40 focus-visible:outline-none";

export function SetPasswordForm() {
  const [state, formAction, pending] = useActionState(setPasswordAction, initialSetPasswordState);
  const formId = useId();

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor={`${formId}-password`} className="mb-1.5 block text-sm font-medium text-foreground">
          Yeni Şifre
        </label>
        <input
          id={`${formId}-password`}
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          autoFocus
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-confirmPassword`} className="mb-1.5 block text-sm font-medium text-foreground">
          Yeni Şifre (Tekrar)
        </label>
        <input
          id={`${formId}-confirmPassword`}
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClasses}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full justify-center">
        {pending ? "Kaydediliyor..." : "Şifreyi Kaydet"}
      </Button>
    </form>
  );
}
