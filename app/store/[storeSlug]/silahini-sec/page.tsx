import { notFound } from "next/navigation";
import Link from "next/link";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getPublicBrandsWithProductCounts } from "@/lib/commerce/public/brands";
import { Container } from "@/components/ui/container";
import { SilahiniSecBreadcrumb } from "@/components/commerce/public/silahini-sec-progress";
import { StorefrontCtaBand } from "@/components/commerce/public/storefront-cta-band";
import { BrandAvatar } from "@/components/commerce/public/brand-avatar";
import { storefrontDisplayClasses, storefrontMonoClasses } from "@/lib/utils/storefront-typography";

/**
 * FAZ 7.2 — "Silahını Seç" akışı, adım 1: marka seçimi.
 *
 * Site Tasarımı v3 + Silahını Seç Sistemi devir metni, Kısım B — eski
 * getPublicBrandsWithProducts (SADECE en az 1 ürünü olan markalar) yerine
 * getPublicBrandsWithProductCounts (TÜM aktif markalar + GERÇEK sayım) —
 * bu sayfa artık düz metin kartları değil, büyük görsel marka kartları
 * gösteriyor: ürünü olan marka (bugün CANİK) turuncu border + "AKTİF
 * KATALOG" rozeti + gerçek sayı ile tıklanabilir; ürünü olmayan marka
 * (bugün SARSILMAZ/GLOCK — GERÇEKTEN 0 ürünleri var, bu dürüstçe
 * yansıtılıyor) donuk/dashed kart + "Yakında" rozeti, BİLEREK Link
 * DEĞİL — tıklanamaz (devir metninin kendi tercihi; bir kullanıcı doğrudan
 * linkle oraya giderse [brandSlug]/page.tsx kendi nazik boş-durum
 * ekranını gösteriyor, savunma derinliği).
 *
 * Faz 12 devamı — v2 koyu tema. Bu sayfa (ve akışın diğer 2 sayfası)
 * tenant-bağımsız/genel — bkz. silahini-sec-progress.tsx'in kendi doc
 * comment'i.
 */
export default async function StoreChooseWeaponPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;

  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const brands = await getPublicBrandsWithProductCounts(store.id);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Container className="py-10">
        <SilahiniSecBreadcrumb storeSlug={storeSlug} activeStep={1} />
        <h1 className={`${storefrontDisplayClasses} mt-3 text-2xl font-bold tracking-tight text-[#F5F5F5]`}>Silahını Seç</h1>
        <p className="mt-1 text-sm text-[#A3A3A3]">Önce bir marka seçin.</p>

        {brands.length === 0 ? (
          <p className="mt-6 text-sm text-[#A3A3A3]">Henüz marka eklenmemiş.</p>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {brands.map((brand) => (
              <li key={brand.id}>
                {brand.productCount > 0 ? (
                  <Link
                    href={`/store/${storeSlug}/silahini-sec/${brand.slug}`}
                    className="group relative flex aspect-square flex-col items-center justify-center gap-3 overflow-hidden rounded-[14px] border border-[#D95F00]/50 bg-[#171717] p-5 text-center transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#D95F00]"
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0"
                      style={{ background: "radial-gradient(220px 160px at 50% 20%, rgba(217,95,0,.1), transparent 70%)" }}
                    />
                    <span
                      className={`${storefrontMonoClasses} absolute right-3 top-3 rounded-full bg-[#D95F00] px-2 py-0.5 text-[9px] font-bold text-[#1A0D00]`}
                    >
                      AKTİF KATALOG
                    </span>
                    <BrandAvatar name={brand.name} logoUrl={brand.logoUrl} size={44} />
                    <span className={`${storefrontDisplayClasses} relative text-base font-bold text-[#F5F5F5]`}>{brand.name}</span>
                    <span className={`${storefrontMonoClasses} relative text-[11px] text-[#A3A3A3]`}>{brand.productCount} ürün</span>
                  </Link>
                ) : (
                  <div className="flex aspect-square flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-[#292929] bg-[#171717]/50 p-5 text-center opacity-60">
                    <BrandAvatar name={brand.name} logoUrl={brand.logoUrl} size={44} />
                    <span className={`${storefrontDisplayClasses} text-base font-bold text-[#A3A3A3]`}>{brand.name}</span>
                    <span className="rounded-full border border-[#3A3A3A] px-2.5 py-0.5 text-[10px] font-semibold text-[#6B6B6B]">
                      Yakında
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Devir metni v2 — kanvasta (SilahiniSec.dc.html) grid'in altında bu alt metin/link var, canlıda yoktu. */}
        <p className="mt-7 text-[12.5px] text-[#6B6B6B]">
          Markanı bulamadın mı?{" "}
          <Link href={`/store/${storeSlug}/kategoriler`} className="text-[#D95F00] underline-offset-2 hover:underline">
            Tüm kategorilere
          </Link>{" "}
          göz atabilirsin.
        </p>
      </Container>

      {/* Faz 12 devamı — bandın kendi py-14'üne dokunmadan, üstündeki grid'le arasına nefes payı. */}
      <div className="mt-16">
        <StorefrontCtaBand storeId={store.id} storeSlug={storeSlug} />
      </div>
    </div>
  );
}
