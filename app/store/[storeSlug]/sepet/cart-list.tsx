"use client";

import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils/format-price";
import { useCart } from "@/components/commerce/public/cart/cart-context";
import { CheckoutForm, type InitialCustomer, type SavedAddress } from "./checkout-form";

/**
 * FAZ 1 (mağaza sepeti/configurator) — item list renders purely from
 * CartContext's localStorage-backed state, no server query of its own
 * (every display field was already snapshotted into each CartItem at
 * add-time — see cart-context.tsx's own comment on why).
 *
 * FAZ 2 (sipariş) — CheckoutForm is ALWAYS rendered here, not only in the
 * non-empty branch: it needs to keep showing its own success confirmation
 * even after a successful order clears the cart (see its own comment on
 * why that ordering matters) — so it owns its own "success / empty /
 * form" decision independently of this component's item-list rendering.
 */
export function CartList({
  storeSlug,
  initialCustomer,
  savedAddresses,
}: {
  storeSlug: string;
  initialCustomer: InitialCustomer | null;
  savedAddresses: SavedAddress[];
}) {
  const { items, subtotal, removeItem, setQuantity } = useCart();

  return (
    <div className="mt-6">
      {items.length === 0 ? (
        <div>
          <p className="text-sm text-[#A3A3A3]">Sepetiniz boş.</p>
          <Link href={`/store/${storeSlug}`} className="mt-3 inline-block text-sm text-[#D95F00] underline-offset-2 hover:text-[#F26A00] hover:underline">
            ← Alışverişe devam et
          </Link>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-[#292929] rounded-lg border border-[#292929] bg-[#171717]">
            {items.map((item) => (
              <li key={item.lineId} className="flex flex-wrap items-start gap-4 p-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-[#292929] bg-[#0A0A0A]">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.productName} fill unoptimized sizes="80px" className="object-cover" />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/store/${storeSlug}/urun/${item.productSlug}`}
                    className="font-medium text-[#F5F5F5] hover:underline"
                  >
                    {item.productName}
                  </Link>
                  {item.variantLabel ? <p className="mt-0.5 text-xs text-[#A3A3A3]">{item.variantLabel}</p> : null}
                  {item.addonLabels.length > 0 ? (
                    <p className="mt-0.5 text-xs text-[#A3A3A3]">{item.addonLabels.join(", ")}</p>
                  ) : null}

                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center rounded-md border border-[#292929]">
                      <button
                        type="button"
                        aria-label="Adedi azalt"
                        onClick={() => setQuantity(item.lineId, item.quantity - 1)}
                        className="px-2.5 py-1 text-sm text-[#A3A3A3] hover:text-[#F5F5F5]"
                      >
                        −
                      </button>
                      <span className="min-w-[2ch] px-1.5 text-center text-sm text-[#F5F5F5]">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label="Adedi artır"
                        onClick={() => setQuantity(item.lineId, item.quantity + 1)}
                        className="px-2.5 py-1 text-sm text-[#A3A3A3] hover:text-[#F5F5F5]"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.lineId)}
                      className="text-xs text-[#A3A3A3] underline-offset-2 hover:text-red-400 hover:underline"
                    >
                      Kaldır
                    </button>
                  </div>
                </div>

                <div className="whitespace-nowrap text-right text-sm">
                  <p className="text-[#F5F5F5]">{formatPrice(item.unitPrice * item.quantity)}</p>
                  {item.quantity > 1 ? <p className="text-xs text-[#A3A3A3]">{formatPrice(item.unitPrice)} / adet</p> : null}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#292929] bg-[#171717] p-4">
            <span className="text-sm text-[#A3A3A3]">Genel Toplam</span>
            <span className="text-xl font-semibold text-[#F5F5F5]">{formatPrice(subtotal)}</span>
          </div>
        </>
      )}

      <CheckoutForm storeSlug={storeSlug} initialCustomer={initialCustomer} savedAddresses={savedAddresses} />
    </div>
  );
}
