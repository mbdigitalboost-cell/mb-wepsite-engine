"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { verifyMfaChallengeAction } from "./actions";
import { initialMfaChallengeState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";

export function MfaChallengeForm() {
  const [state, formAction, pending] = useActionState(verifyMfaChallengeAction, initialMfaChallengeState);
  const formId = useId();

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor={`${formId}-code`} className="mb-1.5 block text-sm font-medium text-foreground">
          Doğrulama Kodu
        </label>
        <input
          id={`${formId}-code`}
          name="code"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          autoComplete="one-time-code"
          autoFocus
          className={inputClasses}
          placeholder="123456"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full justify-center">
        {pending ? "Doğrulanıyor..." : "Doğrula"}
      </Button>
    </form>
  );
}
