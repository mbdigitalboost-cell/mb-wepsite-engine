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
export function StoreHeader({
  storeSlug,
  storeName,
  isLoggedIn,
}: {
  storeSlug: string;
  storeName: string;
  /** FAZ 5.1 — resolved server-side (layout.tsx) since this is a client component with no session access of its own. */
  isLoggedIn: boolean;
}) {
  const { itemCount } = useCart();

  return (
    <header className="border-b border-black/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href={`/store/${storeSlug}`} className="text-sm font-medium text-foreground hover:underline">
          {storeName}
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={isLoggedIn ? `/store/${storeSlug}/hesap` : `/store/${storeSlug}/hesap/giris`}
            className="text-sm text-foreground/80 hover:text-foreground hover:underline"
          >
            {isLoggedIn ? "Hesabım" : "Giriş Yap"}
          </Link>
          <Link
            href={`/store/${storeSlug}/sepet`}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-sm text-foreground/80 transition-colors hover:border-black/20 hover:text-foreground"
          >
            <ShoppingCart size={16} aria-hidden="true" />
            Sepetim {itemCount > 0 ? `(${itemCount})` : ""}
          </Link>
        </div>
      </div>
    </header>
  );
}
