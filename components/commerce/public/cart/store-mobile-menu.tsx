"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, User, ChevronRight } from "lucide-react";
import type { PublicCategory } from "@/lib/commerce/public/categories";
import { storefrontDisplayClasses, storefrontMonoClasses } from "@/lib/utils/storefront-typography";

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
 * Site geneli tasarım sistemi (Faz 12 devamı) — bu panel önceki fazlarda
 * BİLEREK açık temada bırakılmıştı ("header/menü çubuğu" görevinin
 * kapsamı dışıydı, bkz. eski doc comment). Bu turun kendi devir metni
 * artık AÇIKÇA bu paneli de kapsıyor — tasarım kanvasının (MobilMenu
 * .dc.html) koyu, sağdan kayan drawer'ı referans alındı: hesap/giriş
 * girişi artık en üstte, belirgin bir satır (önceden en altta, listenin
 * sonundaydı); "Siparişlerim" turuncu-tonlu hafif bir zeminle öne
 * çıkıyor; nav linkleri arasında ince ayraçlar var. Sosyal medya
 * ikonları/footer bloğu kanvasta var ama BİLEREK eklenmedi — bu bileşene
 * gerçek bir Instagram linki (store_profiles.social_links.instagram)
 * hiç prop olarak geçmiyor, uydurma/placeholder bir sosyal link
 * koymamak için o alt bölüm atlandı.
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
        className="inline-flex items-center justify-center rounded-md p-1.5 text-[#F5F5F5] hover:text-[#D95F00]"
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <div role="presentation" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60" />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mağaza menüsü"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-[#292929] bg-[#171717] shadow-2xl"
          >
            <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#292929] px-5">
              <span className={`${storefrontMonoClasses} text-[11px] uppercase text-[#6B6B6B]`}>Menü</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Menüyü kapat"
                className="inline-flex items-center justify-center rounded-md p-1.5 text-[#A3A3A3] hover:text-[#F5F5F5]"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Hesap/giriş — en üstte, belirgin (kanvasın kendi önceliği: önce kimlik, sonra gezinme). */}
            <Link
              href={isLoggedIn ? `/store/${storeSlug}/hesap` : `/store/${storeSlug}/hesap/giris`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 border-b border-[#292929] p-5"
            >
              <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#3A3A3A]">
                <User size={18} className="text-[#F5F5F5]" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-[#F5F5F5]">{isLoggedIn ? "Hesabım" : "Giriş Yap / Üye Ol"}</span>
                <span className={`${storefrontMonoClasses} mt-0.5 block text-[11px] text-[#6B6B6B]`}>
                  {isLoggedIn ? "Siparişlerini ve adreslerini yönet" : "Siparişlerini kaydet, hızlı sipariş ver"}
                </span>
              </span>
            </Link>

            <nav className="flex flex-1 flex-col overflow-auto">
              <Link
                href={`/store/${storeSlug}`}
                onClick={() => setOpen(false)}
                className={`${storefrontDisplayClasses} flex items-center justify-between border-b border-[#292929] px-5 py-4 text-sm font-semibold text-[#F5F5F5]`}
              >
                Anasayfa
              </Link>

              {categories.length > 0 ? (
                categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/store/${storeSlug}/kategori/${category.slug}`}
                    onClick={() => setOpen(false)}
                    className={`${storefrontDisplayClasses} flex items-center justify-between border-b border-[#292929] px-5 py-4 text-sm font-semibold text-[#A3A3A3] hover:text-[#F5F5F5]`}
                  >
                    {category.name}
                    <ChevronRight size={14} className="text-[#6B6B6B]" aria-hidden="true" />
                  </Link>
                ))
              ) : null}

              {/*
                "Siparişlerim" — ÜYE OLAN OLMAYAN HERKESE (devir metninin
                kendi talimatı): isLoggedIn'den bağımsız, her zaman
                gösteriliyor. Tek route (/siparislerim) üye/misafir
                dallanmasını kendi içinde yapıyor (page.tsx). Kanvasın
                kendi talimatı — turuncu-tonlu hafif zemin + turuncu metin,
                diğer linklerden görsel olarak öne çıkıyor.
              */}
              <Link
                href={`/store/${storeSlug}/siparislerim`}
                onClick={() => setOpen(false)}
                className={`${storefrontDisplayClasses} flex items-center justify-between border-b border-[#292929] px-5 py-4 text-sm font-semibold text-[#D95F00]`}
                style={{ background: "rgba(217,95,0,0.07)" }}
              >
                Siparişlerim
              </Link>

              {/* FAZ 6.2 — only shown when logged in: an address book only means anything for an account, and the addresses page itself redirects a guest to /giris anyway. */}
              {isLoggedIn ? (
                <Link
                  href={`/store/${storeSlug}/hesap/adreslerim`}
                  onClick={() => setOpen(false)}
                  className={`${storefrontDisplayClasses} flex items-center justify-between border-b border-[#292929] px-5 py-4 text-sm font-semibold text-[#A3A3A3] hover:text-[#F5F5F5]`}
                >
                  Adreslerim
                </Link>
              ) : null}
            </nav>

            <div className="shrink-0 border-t border-[#292929] p-5">
              <span className={`${storefrontMonoClasses} text-[10.5px] text-[#6B6B6B]`}>© {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
