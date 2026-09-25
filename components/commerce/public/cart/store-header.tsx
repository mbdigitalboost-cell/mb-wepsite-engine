"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "./cart-context";

/**
 * FAZ 1 (mağaza sepeti/configurator) — minimal persistent header, mounted
 * once in app/store/[storeSlug]/layout.tsx so it appears on every
 * storefront page. Deliberately thin: the storefront has NO shared header
 * at all today (every existing page — homepage/kategori/urun — renders
 * its own <h1>/nav independently, see their own files) — this doesn't
 * replace or redesign any of that, it only adds the one thing every page
 * currently lacks a place for: a persistent link back to the store home
 * and the cart badge this phase's spec asks for.
 */
export function StoreHeader({ storeSlug, storeName }: { storeSlug: string; storeName: string }) {
  const { itemCount } = useCart();

  return (
    <header className="border-b border-black/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href={`/store/${storeSlug}`} className="text-sm font-medium text-foreground hover:underline">
          {storeName}
        </Link>
        <Link
          href={`/store/${storeSlug}/sepet`}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-sm text-foreground/80 transition-colors hover:border-black/20 hover:text-foreground"
        >
          <ShoppingCart size={16} aria-hidden="true" />
          Sepetim {itemCount > 0 ? `(${itemCount})` : ""}
        </Link>
      </div>
    </header>
  );
}
