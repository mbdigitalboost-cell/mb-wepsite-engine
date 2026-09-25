"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils/format-price";
import { useCart } from "@/components/commerce/public/cart/cart-context";

/**
 * FAZ 1 (mağaza sepeti/configurator) — renders purely from CartContext's
 * localStorage-backed state, no server query of its own (every display
 * field was already snapshotted into each CartItem at add-time — see
 * cart-context.tsx's own comment on why).
 *
 * "Sipariş Ver" is rendered but disabled, not omitted — per this phase's
 * own spec ("bu fazda YOK/devre dışı"), a visible-but-disabled button
 * with an explanatory note is more honest about what's coming than
 * silently having no checkout affordance at all. It does nothing today:
 * there is no order/cart backend yet (Faz 2's job).
 */
export function CartList({ storeSlug }: { storeSlug: string }) {
  const { items, subtotal, removeItem, setQuantity } = useCart();

  if (items.length === 0) {
    return (
      <div className="mt-8">
        <p className="text-sm text-foreground/60">Sepetiniz boş.</p>
        <Link href={`/store/${storeSlug}`} className="mt-3 inline-block text-sm text-brand-accent underline-offset-2 hover:underline">
          ← Alışverişe devam et
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <ul className="divide-y divide-black/10 rounded-lg border border-black/10">
        {items.map((item) => (
          <li key={item.lineId} className="flex flex-wrap items-start gap-4 p-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-black/10 bg-black/5">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt={item.productName} fill unoptimized sizes="80px" className="object-cover" />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <Link
                href={`/store/${storeSlug}/urun/${item.productSlug}`}
                className="font-medium text-foreground hover:underline"
              >
                {item.productName}
              </Link>
              {item.variantLabel ? <p className="mt-0.5 text-xs text-foreground/60">{item.variantLabel}</p> : null}
              {item.addonLabels.length > 0 ? (
                <p className="mt-0.5 text-xs text-foreground/50">{item.addonLabels.join(", ")}</p>
              ) : null}

              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center rounded-md border border-black/15">
                  <button
                    type="button"
                    aria-label="Adedi azalt"
                    onClick={() => setQuantity(item.lineId, item.quantity - 1)}
                    className="px-2.5 py-1 text-sm text-foreground/70 hover:text-foreground"
                  >
                    −
                  </button>
                  <span className="min-w-[2ch] px-1.5 text-center text-sm text-foreground">{item.quantity}</span>
                  <button
                    type="button"
                    aria-label="Adedi artır"
                    onClick={() => setQuantity(item.lineId, item.quantity + 1)}
                    className="px-2.5 py-1 text-sm text-foreground/70 hover:text-foreground"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.lineId)}
                  className="text-xs text-foreground/50 underline-offset-2 hover:text-red-600 hover:underline"
                >
                  Kaldır
                </button>
              </div>
            </div>

            <div className="whitespace-nowrap text-right text-sm">
              <p className="text-foreground">{formatPrice(item.unitPrice * item.quantity)}</p>
              {item.quantity > 1 ? <p className="text-xs text-foreground/50">{formatPrice(item.unitPrice)} / adet</p> : null}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-black/10 p-4">
        <span className="text-sm text-foreground/60">Genel Toplam</span>
        <span className="text-xl font-semibold text-foreground">{formatPrice(subtotal)}</span>
      </div>

      <div className="mt-4">
        <Button type="button" size="md" disabled>
          Sipariş Ver
        </Button>
        <p className="mt-1.5 text-xs text-foreground/50">Sipariş verme yakında eklenecek.</p>
      </div>
    </div>
  );
}
