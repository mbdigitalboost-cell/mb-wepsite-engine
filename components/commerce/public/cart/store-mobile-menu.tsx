"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import type { PublicCategory } from "@/lib/commerce/public/categories";

/**
 * FAZ 6.1 — hamburger menu for the storefront header. Own component (not
 * inlined in store-header.tsx) since it owns real state/effects (open/
 * closed, Escape-to-close, body-scroll-lock) on top of markup, same
 * "colocated but separate file" split as this route tree's other
 * client-component pairs (e.g. sepet/cart-list.tsx + checkout-form.tsx).
 *
 * `categories` are the store's TOP-LEVEL categories only (parentId ===
 * null), filtered in layout.tsx from the exact same `getPublicCategories`
 * every other public read already uses (lib/commerce/public/categories.ts)
 * — no new query. Subcategories are intentionally not shown here (a
 * flat, simple drawer per spec's own "basit bir panel" instruction);
 * a category's own page (kategori/[categorySlug]/page.tsx) already lists
 * its subcategories once a visitor drills in.
 *
 * Giriş Yap/Hesabım moved here from the inline header (see
 * store-header.tsx's own comment) to keep the header itself from getting
 * cramped on mobile now that it also has a hamburger button — Sepetim
 * stays inline in the header since it's the one action a shopper expects
 * to reach in one tap regardless of screen size.
 */
export function StoreMobileMenu({
  storeSlug,
  categories,
  isLoggedIn,
}: {
  storeSlug: string;
  categories: PublicCategory[];
  isLoggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menüyü aç"
        aria-expanded={open}
        className="inline-flex items-center justify-center rounded-md p-1.5 text-foreground/80 hover:text-foreground"
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <div
            role="presentation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mağaza menüsü"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-black/10 bg-background p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Menü</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Menüyü kapat"
                className="inline-flex items-center justify-center rounded-md p-1.5 text-foreground/60 hover:text-foreground"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <nav className="mt-4 flex flex-col gap-1">
              <Link
                href={`/store/${storeSlug}`}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2 text-sm text-foreground hover:bg-black/5"
              >
                Ana Sayfa
              </Link>

              {categories.length > 0 ? (
                <>
                  <p className="mt-3 px-2 text-xs font-medium uppercase tracking-wide text-foreground/40">
                    Kategoriler
                  </p>
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/store/${storeSlug}/kategori/${category.slug}`}
                      onClick={() => setOpen(false)}
                      className="rounded-md px-2 py-2 text-sm text-foreground/80 hover:bg-black/5 hover:text-foreground"
                    >
                      {category.name}
                    </Link>
                  ))}
                </>
              ) : null}

              <div className="mt-3 border-t border-black/10 pt-3">
                <Link
                  href={isLoggedIn ? `/store/${storeSlug}/hesap` : `/store/${storeSlug}/hesap/giris`}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-2 py-2 text-sm text-foreground/80 hover:bg-black/5 hover:text-foreground"
                >
                  {isLoggedIn ? "Hesabım" : "Giriş Yap"}
                </Link>
                {/* FAZ 6.2 — only shown when logged in: an address book only means anything for an account, and the addresses page itself redirects a guest to /giris anyway. */}
                {isLoggedIn ? (
                  <Link
                    href={`/store/${storeSlug}/hesap/adreslerim`}
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-2 py-2 text-sm text-foreground/80 hover:bg-black/5 hover:text-foreground"
                  >
                    Adreslerim
                  </Link>
                ) : null}
              </div>
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
