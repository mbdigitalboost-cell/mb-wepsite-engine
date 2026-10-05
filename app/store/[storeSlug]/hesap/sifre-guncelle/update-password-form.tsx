"use client";

import { useActionState, useId } from "react";
import { Space_Grotesk } from "next/font/google";
import { storefrontInputClasses } from "@/lib/utils/storefront-input-classes";
import { storefrontButtonClasses } from "@/lib/utils/storefront-button-classes";
import { updatePasswordAction } from "./actions";
import { initialUpdatePasswordState } from "./form-state";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["700"] });

export function UpdatePasswordForm({ storeSlug }: { storeSlug: string }) {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction.bind(null, storeSlug),
    initialUpdatePasswordState,
  );
  const formId = useId();

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor={`${formId}-password`} className="mb-1.5 block text-sm font-medium text-[#F5F5F5]">
          Yeni Şifre
        </label>
        <input
          id={`${formId}-password`}
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={storefrontInputClasses}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-confirmPassword`} className="mb-1.5 block text-sm font-medium text-[#F5F5F5]">
          Yeni Şifre (Tekrar)
        </label>
        <input
          id={`${formId}-confirmPassword`}
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={storefrontInputClasses}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={`${spaceGrotesk.className} w-full ${storefrontButtonClasses}`}>
        {pending ? "Kaydediliyor..." : "Şifreyi Güncelle"}
      </button>
    </form>
  );
}
