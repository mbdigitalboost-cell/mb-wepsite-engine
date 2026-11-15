"use client";

import { useActionState } from "react";
import { initialRevealIbanState, type RevealIbanState } from "./reveal-iban-state";

/** Faz 30 — IBAN maskeli; "Göster" store_admin+ ve audit kaydıyla tam değeri getirir (değer log'a yazılmaz). */
export function RevealIban({ masked, action }: { masked: string; action: (prev: RevealIbanState) => Promise<RevealIbanState> }) {
  const [state, formAction, pending] = useActionState(action, initialRevealIbanState);
  return (
    <div className="text-sm">
      <p className="font-mono">{state.iban ?? masked}</p>
      {state.holder ? <p className="text-xs text-foreground/70">Hesap sahibi: {state.holder}</p> : null}
      {state.error ? <p className="text-xs text-red-700">{state.error}</p> : null}
      {!state.iban ? (
        <form action={formAction} className="mt-1">
          <button type="submit" disabled={pending} className="text-xs text-brand-accent underline-offset-2 hover:underline disabled:opacity-50">
            {pending ? "…" : "Göster (kayıt altına alınır)"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
