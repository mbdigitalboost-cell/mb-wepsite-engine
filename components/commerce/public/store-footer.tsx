import { storeBase, storeHref } from "@/lib/sites/store-href";
import Link from "next/link";
import Image from "next/image";
import type { PublicCategory } from "@/lib/commerce/public/categories";
import { storefrontDisplayClasses } from "@/lib/utils/storefront-typography";
import { Container } from "@/components/ui/container";

/** Faz 24 — kullanıcının verdiği TAM adres; değiştirme, takip parametresi ekleme. */
const MB_DIGITAL_BOOST_INSTAGRAM_URL = "https://www.instagram.com/mbdigitalboost";

/**
 * Faz 24 — site geneli mağaza footer'ı. Önceden `StoreFooterV2` adıyla
 * yalnızca ana sayfada (taktikalp46-homepage-sections.tsx → page.tsx)
 * render ediliyordu; /kategoriler, /kategori/**, /sepet, /hesap/** gibi
 * sayfalarda hiç footer yoktu. Artık app/store/[storeSlug]/layout.tsx'ten
 * TEK yerde render ediliyor, ana sayfadan kaldırıldı (çift footer yok).
 * İçerik (kategoriler, Müşteri sütunu, © satırı, MB Digital Boost rozeti)
 * aynen korundu; eklenenler: marka logosu (~48px) ve MB Digital Boost
 * rozetinin Instagram bağlantısı.
 *
 * KURUMSAL linkler BİLEREK yok — o sayfalar Petra'nın app/(public)/**
 * ağacında, Taktikalp46'ya ait karşılığı yok (önceki footer'ın notu aynen geçerli).
 */
export function StoreFooter({
  storeSlug,
  storeName,
  logoUrl,
  categories,
}: {
  storeSlug: string;
  storeName: string;
  /** lib/commerce/public/store-brand-assets.ts → resolveStoreLogoUrl (DB önce, repo yedeği sonra). */
  logoUrl: string | null;
  categories: PublicCategory[];
}) {
  const footerCategories = categories.slice(0, 6);

  return (
    <footer className="border-t border-[#292929] bg-[#0A0A0A] py-11 text-[#A3A3A3]">
      <Container>
        <div className="flex flex-wrap justify-between gap-10">
          <div className="max-w-[260px]">
            <Link href={storeHref(storeSlug)} className="inline-flex items-center" aria-label={`${storeName} ana sayfa`}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- DB'den gelebilecek keyfi tenant URL'i ya da küçük statik dosya; header ile aynı gerekçe.
                <img src={logoUrl} alt={storeName} className="h-12 w-auto object-contain" />
              ) : (
                <span className={`${storefrontDisplayClasses} text-lg font-bold text-white`}>{storeName}</span>
              )}
            </Link>
            <div className="mt-2 text-xs text-[#A3A3A3]">Güvenle Taşı.</div>
          </div>
          <div className="flex flex-wrap gap-14">
            {footerCategories.length > 0 ? (
              <div>
                <div className={`${storefrontDisplayClasses} mb-3.5 text-xs font-semibold tracking-wide text-white`}>KATEGORİLER</div>
                <div className="flex flex-col gap-2 text-sm">
                  {footerCategories.map((category) => (
                    <Link
                      key={category.id}
                      href={`${storeBase(storeSlug)}/kategori/${category.slug}`}
                      className="hover:text-[#F5F5F5] hover:underline"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <div className={`${storefrontDisplayClasses} mb-3.5 text-xs font-semibold tracking-wide text-white`}>MÜŞTERİ</div>
              <div className="flex flex-col gap-2 text-sm">
                <Link href={`${storeBase(storeSlug)}/hesap`} className="hover:text-[#F5F5F5] hover:underline">
                  Hesabım
                </Link>
                <Link href={`${storeBase(storeSlug)}/siparislerim`} className="hover:text-[#F5F5F5] hover:underline">
                  Siparişlerim
                </Link>
                <Link href={`${storeBase(storeSlug)}/sepet`} className="hover:text-[#F5F5F5] hover:underline">
                  Sepetim
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-7 flex flex-col items-center justify-between gap-2 border-t border-[#292929] pt-4 text-center text-xs text-[#7A776E] sm:flex-row sm:text-left">
          <p>
            © {new Date().getFullYear()} {storeName} — Güvenle Taşı.
          </p>
          <a
            href={MB_DIGITAL_BOOST_INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="MB Digital Boost Instagram"
            className="group inline-flex items-center gap-1.5 transition-colors hover:text-[#F5F5F5]"
          >
            <span>
              Web sitesi <span className="underline-offset-2 group-hover:text-[#D95F00] group-hover:underline">MB Digital Boost</span> tarafından
              geliştirilmiştir.
            </span>
            <Image
              src="/images/mb-digital-boost/mb-mark.png"
              alt=""
              width={16}
              height={16}
              className="opacity-70 transition-opacity group-hover:opacity-100"
            />
          </a>
        </div>
      </Container>
    </footer>
  );
}
