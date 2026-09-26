"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import type { PublicCategory } from "@/lib/commerce/public/categories";
import { useCart } from "./cart-context";
import { StoreMobileMenu } from "./store-mobile-menu";

/**
 * FAZ 1 (mağaza sepeti/configurator) — minimal persistent header, mounted
 * once in app/store/[storeSlug]/layout.tsx so it appears on every
 * storefront page. Deliberately thin: the storefront has NO shared header
 * at all today (every existing page — homepage/kategori/urun — renders
 * its own <h1>/nav independently, see their own files) — this doesn't
 * replace or redesign any of that, it only adds the one thing every page
 * currently lacks a place for: a persistent link back to the store home
 * and the cart badge this phase's spec asks for.
 *
 * FAZ 6.1 — hamburger menu (StoreMobileMenu) added on the left, shown at
 * every viewport size: this header never had a category/nav link at all
 * (mainNav on the homepage is a separate, admin-configured CMS menu, not
 * the store's actual categories — see kategori/[categorySlug]/page.tsx's
 * own "ana kategori + alt kategoriler" model), so per this phase's own
 * spec there's nothing on desktop for the hamburger to be redundant
 * with. Giriş Yap/Hesabım MOVED into that menu (was inline here) to keep
 * this header from getting cramped now that it also has a hamburger
 * button on the left — Sepetim stays inline since it's the one action a
 * shopper expects to reach in one tap at any screen size.
 */
export function StoreHeader({
  storeSlug,
  storeName,
  isLoggedIn,
  categories,
}: {
  storeSlug: string;
  storeName: string;
  /** FAZ 5.1 — resolved server-side (layout.tsx) since this is a client component with no session access of its own. */
  isLoggedIn: boolean;
  /** FAZ 6.1 — top-level categories only (parentId === null), resolved server-side in layout.tsx. */
  categories: PublicCategory[];
}) {
  const { itemCount } = useCart();

  return (
    <header className="border-b border-black/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <StoreMobileMenu storeSlug={storeSlug} categories={categories} isLoggedIn={isLoggedIn} />
          <Link href={`/store/${storeSlug}`} className="text-sm font-medium text-foreground hover:underline">
            {storeName}
          </Link>
        </div>
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
