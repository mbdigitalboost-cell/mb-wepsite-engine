"use client";

import { useActionState, useId } from "react";
import { Space_Grotesk } from "next/font/google";
import { storefrontInputClasses } from "@/lib/utils/storefront-input-classes";
import { storefrontButtonClasses } from "@/lib/utils/storefront-button-classes";
import { requestPasswordResetAction } from "./actions";
import { initialPasswordResetRequestState } from "./form-state";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["700"] });

export function RequestResetForm({ storeSlug }: { storeSlug: string }) {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction.bind(null, storeSlug),
    initialPasswordResetRequestState,
  );
  const formId = useId();

  if (state.status === "sent") {
    return (
      <p className="text-sm text-[#A3A3A3]">
        Eğer bu e-posta ile bir hesabınız varsa, şifre sıfırlama bağlantısını gönderdik. Gelen kutunuzu kontrol edin.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor={`${formId}-email`} className="mb-1.5 block text-sm font-medium text-[#F5F5F5]">
          E-posta
        </label>
        <input
          id={`${formId}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          className={storefrontInputClasses}
        />
      </div>

      {state.status === "error" && state.error ? (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={`${spaceGrotesk.className} w-full ${storefrontButtonClasses}`}>
        {pending ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
      </button>
    </form>
  );
}
