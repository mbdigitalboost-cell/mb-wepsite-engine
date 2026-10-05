"use client";

import { useActionState, useId } from "react";
import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import { storefrontInputClasses } from "@/lib/utils/storefront-input-classes";
import { storefrontButtonClasses } from "@/lib/utils/storefront-button-classes";
import { loginAction } from "../actions";
import { initialStoreLoginState } from "../form-state";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["700"] });

export function StoreLoginForm({ storeSlug }: { storeSlug: string }) {
  const [state, formAction, pending] = useActionState(loginAction.bind(null, storeSlug), initialStoreLoginState);
  const formId = useId();

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

      <div>
        <label htmlFor={`${formId}-password`} className="mb-1.5 block text-sm font-medium text-[#F5F5F5]">
          Şifre
        </label>
        <input
          id={`${formId}-password`}
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={storefrontInputClasses}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={`${spaceGrotesk.className} w-full ${storefrontButtonClasses}`}>
        {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
      </button>

      <p className="text-center text-xs text-[#A3A3A3]">
        <Link href={`/store/${storeSlug}/hesap/sifremi-unuttum`} className="text-[#D95F00] underline-offset-2 hover:text-[#F26A00] hover:underline">
          Şifremi unuttum
        </Link>
      </p>

      <p className="text-center text-xs text-[#A3A3A3]">
        Hesabınız yok mu?{" "}
        <Link href={`/store/${storeSlug}/hesap/kayit`} className="text-[#D95F00] underline-offset-2 hover:text-[#F26A00] hover:underline">
          Hesap oluşturun
        </Link>
      </p>
    </form>
  );
}
