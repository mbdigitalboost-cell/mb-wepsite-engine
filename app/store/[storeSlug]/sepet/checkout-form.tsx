"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/lib/utils/input-classes";
import { useCart, type CartItem } from "@/components/commerce/public/cart/cart-context";
import { createOrderAction } from "./actions";
import { initialCheckoutFormState } from "./form-state";

function toWireCartLine(item: CartItem) {
  return {
    productSlug: item.productSlug,
    variantId: item.variantId,
    addonIds: item.addonIds,
    quantity: item.quantity,
  };
}

/**
 * FAZ 2 (mağaza sepeti/sipariş) — customer info form. The cart's actual
 * line items are NEVER individually typed by the customer here — they're
 * serialized straight from useCart()'s own state (ids + quantity only,
 * see toWireCartLine) into one hidden field; createOrderAction re-derives
 * every price server-side from those ids, never trusting this form for
 * anything beyond contact/address details.
 *
 * Rendered only when the cart has items (see cart-list.tsx) — clears the
 * cart and shows a confirmation once an order is actually created, never
 * before (guarded by lastOrderNumber so a re-render after success doesn't
 * clear an already-empty cart again or re-fire the effect).
 */
export function CheckoutForm({ storeSlug }: { storeSlug: string }) {
  const { items, clear } = useCart();
  const [state, formAction, isPending] = useActionState(createOrderAction.bind(null, storeSlug), initialCheckoutFormState);
  const clearedForOrderNumber = useRef<number | null>(null);

  useEffect(() => {
    if (state.status === "success" && state.orderNumber !== null && clearedForOrderNumber.current !== state.orderNumber) {
      clearedForOrderNumber.current = state.orderNumber;
      clear();
    }
  }, [state.status, state.orderNumber, clear]);

  // Checked BEFORE the empty-cart case below on purpose: clear() (in the
  // effect above) empties the cart the instant an order succeeds, so
  // items.length is already 0 by the time this renders — without this
  // ordering the confirmation would never be reachable, immediately
  // replaced by "cart is empty" on the very next render.
  if (state.status === "success" && state.orderNumber !== null) {
    return (
      <div className="mt-6 rounded-lg border border-black/10 p-4">
        <h2 className="text-sm font-semibold text-foreground">Siparişiniz Alındı</h2>
        <p className="mt-2 text-sm text-foreground/70">
          Sipariş No: <span className="font-medium text-foreground">#{state.orderNumber}</span>
        </p>
        <p className="mt-1 text-sm text-foreground/70">
          Siparişinizi onaylamak için sizi arayacağız. Sorularınız için mağazayla iletişime geçebilirsiniz.
        </p>
      </div>
    );
  }

  // Nothing to check out — cart-list.tsx's own "Sepetiniz boş" message
  // already covers this case, this component adds nothing to it.
  if (items.length === 0) return null;

  return (
    <form action={formAction} className="mt-6 space-y-4 rounded-lg border border-black/10 p-4">
      <input type="hidden" name="cartItems" value={JSON.stringify(items.map(toWireCartLine))} />

      <h2 className="text-sm font-semibold text-foreground">Teslimat Bilgileri</h2>

      {state.status === "error" && state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="customerName" className="mb-1.5 block text-sm font-medium text-foreground">
            Ad Soyad
          </label>
          <input id="customerName" name="customerName" type="text" required className={inputClasses} />
        </div>
        <div>
          <label htmlFor="customerPhone" className="mb-1.5 block text-sm font-medium text-foreground">
            Telefon
          </label>
          <input id="customerPhone" name="customerPhone" type="tel" required className={inputClasses} />
        </div>
      </div>

      <div>
        <label htmlFor="customerEmail" className="mb-1.5 block text-sm font-medium text-foreground">
          E-posta <span className="text-foreground/40">(opsiyonel)</span>
        </label>
        <input id="customerEmail" name="customerEmail" type="email" className={inputClasses} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="addressCity" className="mb-1.5 block text-sm font-medium text-foreground">
            Şehir
          </label>
          <input id="addressCity" name="addressCity" type="text" required className={inputClasses} />
        </div>
        <div>
          <label htmlFor="addressDistrict" className="mb-1.5 block text-sm font-medium text-foreground">
            İlçe
          </label>
          <input id="addressDistrict" name="addressDistrict" type="text" required className={inputClasses} />
        </div>
      </div>

      <div>
        <label htmlFor="addressLine" className="mb-1.5 block text-sm font-medium text-foreground">
          Adres
        </label>
        <textarea id="addressLine" name="addressLine" required rows={2} className={inputClasses} />
      </div>

      <div>
        <label htmlFor="note" className="mb-1.5 block text-sm font-medium text-foreground">
          Not <span className="text-foreground/40">(opsiyonel)</span>
        </label>
        <textarea id="note" name="note" rows={2} className={inputClasses} />
      </div>

      <Button type="submit" size="md" disabled={isPending}>
        {isPending ? "Gönderiliyor..." : "Sipariş Ver"}
      </Button>
    </form>
  );
}
