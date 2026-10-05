"use client";

import { useActionState, useId } from "react";
import { storefrontInputClasses } from "@/lib/utils/storefront-input-classes";
import { storefrontButtonClasses } from "@/lib/utils/storefront-button-classes";
import { OrderStatusCard } from "@/components/commerce/public/order-status-card";
import { lookupGuestOrderAction } from "./actions";
import { initialGuestOrderLookupState } from "./form-state";

/**
 * Misafir (üye olmayan) sipariş sorgu formu — sipariş kodu + telefon.
 * Başarılıysa SADECE o tek sipariş, paylaşımlı OrderStatusCard ile
 * gösteriliyor (üye listesindeki AYNI bileşen, bkz. page.tsx).
 */
export function GuestOrderLookupForm({ storeSlug }: { storeSlug: string }) {
  const [state, formAction, pending] = useActionState(lookupGuestOrderAction.bind(null, storeSlug), initialGuestOrderLookupState);
  const formId = useId();

  return (
    <div className="space-y-6">
      <form action={formAction} className="rounded-lg border border-[#292929] bg-[#171717] p-4">
        <p className="text-sm text-[#A3A3A3]">
          Sipariş verirken size gösterilen sipariş kodunu ve sipariş verirken kullandığınız telefon numarasını girin.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${formId}-orderNumber`} className="mb-1.5 block text-sm font-medium text-[#F5F5F5]">
              Sipariş Kodu
            </label>
            <input
              id={`${formId}-orderNumber`}
              name="orderNumber"
              type="text"
              inputMode="numeric"
              placeholder="Örn. 1042"
              required
              className={storefrontInputClasses}
            />
          </div>
          <div>
            <label htmlFor={`${formId}-phone`} className="mb-1.5 block text-sm font-medium text-[#F5F5F5]">
              Telefon
            </label>
            <input
              id={`${formId}-phone`}
              name="phone"
              type="tel"
              placeholder="Sipariş verirken girdiğiniz numara"
              required
              className={storefrontInputClasses}
            />
          </div>
        </div>

        {state.status === "error" && state.error ? (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {state.error}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className={`${storefrontButtonClasses} mt-4`}>
          {pending ? "Sorgulanıyor..." : "Siparişimi Göster"}
        </button>
      </form>

      {state.status === "success" && state.order ? <OrderStatusCard order={state.order} /> : null}
    </div>
  );
}
