"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/lib/utils/input-classes";
import { requestPasswordResetAction } from "./actions";
import { initialPasswordResetRequestState } from "./form-state";

export function RequestResetForm({ storeSlug }: { storeSlug: string }) {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction.bind(null, storeSlug),
    initialPasswordResetRequestState,
  );
  const formId = useId();

  if (state.status === "sent") {
    return (
      <p className="text-sm text-foreground/70">
        Eğer bu e-posta ile bir hesabınız varsa, şifre sıfırlama bağlantısını gönderdik. Gelen kutunuzu kontrol edin.
      </p>
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

      {state.status === "error" && state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full justify-center">
        {pending ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
      </Button>
    </form>
  );
}
