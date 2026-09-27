import Link from "next/link";
import Image from "next/image";
import { Truck, ShieldCheck, RotateCcw, Headphones } from "lucide-react";
import type { PublicCategory } from "@/lib/commerce/public/categories";
import type { PublicBrand } from "@/lib/commerce/public/brands";
import type { PublicProduct } from "@/lib/commerce/public/products";
import { CATEGORY_FALLBACK_IMAGES } from "@/lib/commerce/public/category-fallback-images";
import { formatPrice } from "@/lib/utils/format-price";
import { Container } from "@/components/ui/container";

/**
 * FAZ 7.3 follow-up — Taktikalp46'nın v2 ana sayfa bölümleri (hero'nun
 * altı). Kasıtlı olarak `components/commerce/public/homepage-sections/
 * store-homepage-sections.tsx`'in İÇİNE değil, tamamen AYRI bir dosyaya
 * kondu — o bileşen hâlâ jenerik/tenant-agnostic kalmak zorunda (her
 * mağazanın store_homepage_sections satırlarını render eder), bu dosya
 * ise açıkça Taktikalp46'ya özel, hardcoded bir tasarım. Sadece
 * app/store/[storeSlug]/page.tsx'ten çağrılıyor; layout.tsx'e ya da başka
 * hiçbir route'a eklenmedi, yani /kategoriler, /silahini-sec gibi diğer
 * sayfalar bundan etkilenmiyor.
 *
 * Her bölüm PROPS üzerinden gerçek veri alıyor (page.tsx zaten
 * getPublicCategories/getPublicBrandsWithProducts/getPublicProducts/
 * getPublicStoreProfile'ı çağırmış durumda) — burada yeni bir Supabase
 * sorgusu YOK. Veri yoksa (marka/ürün/Instagram linki) ilgili bölüm hiç
 * render edilmiyor; sahte veri asla eklenmedi (bkz. her bölümün kendi
 * erken-dönüş kontrolü).
 */

const HEADING = "font-bold uppercase tracking-tight";

/** 1. Neden Kydex? — statik, genel Kydex malzeme gerçekleri (ürün-spesifik iddia değil). */
const WHY_KYDEX_ITEMS = [
  { n: "01", title: "Hafif Yapı", body: "Günlük taşıma ve operasyonel kullanım için optimize edilmiş yapı." },
  { n: "02", title: "Yüksek Dayanıklılık", body: "Darbe ve zorlu kullanım koşullarına karşı dayanıklı malzeme yapısı." },
  { n: "03", title: "Formunu Korur", body: "Isıl şekillendirilmiş Kydex yapı sayesinde ürün formunu korur." },
  { n: "04", title: "Kullanıma Özel Tasarım", body: "Farklı modeller ve taşıma ihtiyaçları için ürün seçenekleri." },
];

export function WhyKydexSection({ headingFont }: { headingFont: string }) {
  return (
    <div className="bg-[#111111] py-14">
      <Container>
        <div className="mb-10 text-center">
          <h2 className={`${HEADING} ${headingFont} text-[30px] text-[#F5F5F5]`}>Neden Kydex?</h2>
          <p className="mt-2 text-sm text-[#A3A3A3]">Hafif. Dayanıklı. Formunu koruyan.</p>
        </div>
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {WHY_KYDEX_ITEMS.map((item) => (
            <div key={item.n} className="rounded-[6px] border border-[#292929] bg-[#171717] p-6">
              <div className={`${headingFont} text-xl font-bold text-[#D95F00]`}>{item.n}</div>
              <div className={`${headingFont} mt-2.5 text-[15px] font-semibold text-[#F5F5F5]`}>{item.title}</div>
              <div className="mt-2 text-[13px] leading-relaxed text-[#A3A3A3]">{item.body}</div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}

/** 2. Kydex Koleksiyonu — 4 sabit slug, gerçek kategori varsa kart olarak göster (yoksa o kart atlanır). */
const FEATURED_COLLECTION_SLUGS = ["silah-kiliflari", "bicak-kiliflari", "sarjor-kiliflari", "edc-ve-gunluk-tasima"];

export function KydexCollectionSection({
  storeSlug,
  categories,
  headingFont,
}: {
  storeSlug: string;
  categories: PublicCategory[];
  headingFont: string;
}) {
  const featured = FEATURED_COLLECTION_SLUGS.map((slug) => categories.find((c) => c.slug === slug)).filter(
    (c): c is PublicCategory => Boolean(c),
  );
  if (featured.length === 0) return null;

  return (
    <div className="bg-[#0A0A0A] py-14">
      <Container>
        <h2 className={`${HEADING} ${headingFont} mb-6 text-[26px] text-[#F5F5F5]`}>Kydex Koleksiyonu</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {featured.map((category) => {
            const imageUrl = category.imageUrl ?? CATEGORY_FALLBACK_IMAGES[category.slug] ?? null;
            return (
              <Link
                key={category.id}
                href={`/store/${storeSlug}/kategori/${category.slug}`}
                className="group relative block h-[240px] overflow-hidden rounded-[6px] border border-[#292929] bg-[#171717] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={category.name}
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="object-cover opacity-85 transition-transform duration-300 group-hover:scale-105"
                  />
                ) : null}
                <div
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(180deg, rgba(10,10,10,0.05) 0%, rgba(10,10,10,0.88) 100%)" }}
                />
                <div className="absolute bottom-4 left-4">
                  <p className={`${headingFont} text-[15px] font-semibold text-white`}>{category.name}</p>
                  <p className="mt-0.5 text-xs font-medium text-[#D95F00]">Keşfet →</p>
                </div>
              </Link>
            );
          })}
        </div>
      </Container>
    </div>
  );
}

/** 3. Silahına Uygun Kılıfı Bul — gerçek marka listesi, ilk 3 (veya kaç tane varsa). Marka yoksa render edilmez. */
export function BrandFinderSection({
  storeSlug,
  brands,
  headingFont,
}: {
  storeSlug: string;
  brands: PublicBrand[];
  headingFont: string;
}) {
  if (brands.length === 0) return null;

  return (
    <div className="bg-[#111111] py-14">
      <Container>
        <div className="text-center">
          <h2 className={`${HEADING} ${headingFont} text-[26px] text-[#F5F5F5]`}>Silahına Uygun Kılıfı Bul</h2>
          <p className="mt-2 text-[13px] text-[#A3A3A3]">Marka → Model → Kılıf</p>
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {brands.slice(0, 3).map((brand, index) => (
            <Link
              key={brand.id}
              href={`/store/${storeSlug}/silahini-sec/${brand.slug}`}
              className={`${headingFont} rounded-[4px] px-7 py-3 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5 ${
                index === 0
                  ? "bg-[#D95F00] text-white hover:bg-[#F26A00]"
                  : "border border-[#292929] bg-[#171717] text-[#F5F5F5] hover:border-[#D95F00]"
              }`}
            >
              {brand.name.toLocaleUpperCase("tr")}
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}

/** 4. Öne Çıkan Kydex Ürünler — gerçek ürünler (page.tsx en fazla 4 gönderiyor), yıldız YOK. Ürün yoksa render edilmez. */
export function FeaturedProductsSection({
  storeSlug,
  products,
  headingFont,
}: {
  storeSlug: string;
  products: PublicProduct[];
  headingFont: string;
}) {
  if (products.length === 0) return null;

  return (
    <div className="bg-[#0A0A0A] py-14">
      <Container>
        <h2 className={`${HEADING} ${headingFont} mb-6 text-[26px] text-[#F5F5F5]`}>Öne Çıkan Kydex Ürünler</h2>
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/store/${storeSlug}/urun/${product.slug}`}
              className="group block overflow-hidden rounded-[6px] border border-[#292929] bg-[#171717] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="h-[170px] bg-[#1D1D1B]" />
              <div className="p-3.5">
                <div className="text-[13px] font-semibold text-[#F5F5F5]">{product.name}</div>
                <div className={`${headingFont} mt-2 text-[15px] font-bold text-[#D95F00]`}>
                  {formatPrice(product.price)}
                </div>
                <div className="mt-2.5 rounded-[3px] border border-[#292929] py-2 text-center text-xs text-[#F5F5F5] transition-colors group-hover:border-[#D95F00]">
                  İncele
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}

/** 5. Kydex'in Üretim Hissi — foto/video YOK (gerçek görsel gelince ayrıca eklenecek), düz koyu zemin + süreç adımları. */
const PRODUCTION_STEPS = ["Kydex Levha", "Isı", "Şekillendirme", "Kesim", "Son Ürün"];

export function ProductionFeelSection({ headingFont }: { headingFont: string }) {
  return (
    <div
      className="py-20"
      style={{ background: "linear-gradient(160deg, #111111 0%, #0A0A0A 100%)" }}
    >
      <Container className="flex flex-col items-center gap-4 text-center">
        <h2 className={`${HEADING} ${headingFont} text-[34px] text-[#F5F5F5]`}>Formdan Ekipmana</h2>
        <p className="max-w-xl text-[15px] leading-relaxed text-[#A3A3A3]">
          Kydex&apos;in şekillendirilmesinden son ürüne kadar teknik detaylara odaklanan üretim yaklaşımı.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-[#A3A3A3]">
          {PRODUCTION_STEPS.map((step, index) => (
            <span key={step} className="flex items-center gap-2">
              <span className="rounded-full border border-[#292929] px-3.5 py-1.5">{step}</span>
              {index < PRODUCTION_STEPS.length - 1 ? <span>→</span> : null}
            </span>
          ))}
        </div>
      </Container>
    </div>
  );
}

/** 6. "Güvenle Taşı." marka statement — statik. */
export function BrandStatementSection({ headingFont }: { headingFont: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 bg-[#0A0A0A] py-20 text-center">
      <h2 className={`${HEADING} ${headingFont} text-[44px] text-white`}>Güvenle Taşı.</h2>
      <div className={`${headingFont} text-sm font-semibold tracking-wide text-[#D95F00]`}>TAKTİKALP46</div>
      <p className="mt-2 max-w-md text-[13px] text-[#A3A3A3]">
        Günlük taşıma, saha kullanımı ve ekipman ihtiyaçları için tasarlanan ürünler.
      </p>
    </div>
  );
}

/** 7. Diğer Kategoriler — Kydex Koleksiyonu'na girmeyen gerçek kategoriler. Hiç yoksa render edilmez. */
export function OtherCategoriesSection({
  storeSlug,
  categories,
  headingFont,
}: {
  storeSlug: string;
  categories: PublicCategory[];
  headingFont: string;
}) {
  const otherCategories = categories.filter((c) => !FEATURED_COLLECTION_SLUGS.includes(c.slug));
  if (otherCategories.length === 0) return null;

  return (
    <div className="bg-[#111111] py-11">
      <Container>
        <h2 className={`${headingFont} mb-4 text-xl font-semibold uppercase tracking-wide text-[#A3A3A3]`}>
          Taktikal Ekipman
        </h2>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
          {otherCategories.map((category) => (
            <Link
              key={category.id}
              href={`/store/${storeSlug}/kategori/${category.slug}`}
              className="flex h-[70px] items-end rounded-[5px] border border-[#292929] bg-[#171717] p-2.5 text-xs text-[#F5F5F5] transition-colors hover:border-[#D95F00]"
            >
              {category.name}
            </Link>
          ))}
          <Link
            href={`/store/${storeSlug}/kategoriler`}
            className="flex h-[70px] items-end rounded-[5px] border border-[#292929] bg-[#171717] p-2.5 text-xs font-medium text-[#D95F00] transition-colors hover:border-[#D95F00]"
          >
            Tümünü Gör →
          </Link>
        </div>
      </Container>
    </div>
  );
}

/** 8. Güven rozetleri — teyitsiz sayı yok ("14 gün" gibi), sadece teyitli/nötr ifadeler. */
const TRUST_BADGES = [
  { Icon: Truck, label: "2.000 TL Üzeri Ücretsiz Kargo" },
  { Icon: ShieldCheck, label: "Güvenli Ödeme" },
  { Icon: RotateCcw, label: "Kolay İade" },
  { Icon: Headphones, label: "Müşteri Desteği" },
];

export function TrustBadgesSection() {
  return (
    <div className="border-y border-[#292929] bg-[#0A0A0A] py-8">
      <Container className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {TRUST_BADGES.map(({ Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-2 text-center text-xs text-[#F5F5F5]">
            <Icon size={20} strokeWidth={1.75} className="text-[#D95F00]" aria-hidden="true" />
            <span>{label}</span>
          </div>
        ))}
      </Container>
    </div>
  );
}

/** 9. Instagram — sahte gönderi yok, sadece gerçek link varsa basit bir banner/buton. */
export function InstagramSection({ instagramUrl, headingFont }: { instagramUrl: string; headingFont: string }) {
  return (
    <div className="bg-[#111111] py-14 text-center">
      <Container className="flex flex-col items-center gap-4">
        <h2 className={`${HEADING} ${headingFont} text-xl text-[#F5F5F5]`}>Taktikalp46&apos;yı Takip Et</h2>
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${headingFont} inline-flex items-center gap-2 rounded-[4px] border border-[#292929] bg-[#171717] px-6 py-3 text-sm font-semibold text-[#F5F5F5] transition-colors hover:border-[#D95F00] hover:text-[#D95F00]`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <circle cx="12" cy="12" r="4.2" />
            <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
          </svg>
          Bizi Instagram&apos;da Takip Et →
        </a>
      </Container>
    </div>
  );
}

/**
 * 10. Footer — v2 koyu tema. Sadece bu sayfaya (page.tsx) eklendi, ortak
 * layout.tsx'e DEĞİL: görev "hero'nun altına, page.tsx'e ekle" dedi ve
 * /kategoriler ile /silahini-sec'in kendi koduna dokunmamayı istedi — bu
 * sayfaları da kapsayan bir site-geneli footer, o "dokunma" sınırını
 * dolaylı olarak ihlal ederdi. Site geneline yayma (layout.tsx'e taşıma)
 * istenirse ayrı, açık bir görev olarak yapılmalı.
 *
 * KURUMSAL linkleri (Hakkımızda/İletişim/KVKK/Gizlilik/Kullanım Koşulları)
 * BİLEREK YOK: bu 5 sayfa app/(public)/** altında, yani Petra'nın kendi
 * route ağacında yaşıyor — Taktikalp46'ya ait bir karşılığı yok. Araştırma
 * adımı bunu doğruladı (glob), bu yüzden görevin kendi talimatı gereği
 * ("bulamadığın sayfalar için o linki koyma") bu sütun tamamen atlandı.
 * MÜŞTERİ sütunundaki "Hesabım" linki zaten sipariş geçmişini de aynı
 * sayfada gösteriyor (app/store/[storeSlug]/hesap/page.tsx) — ayrı bir
 * "Siparişlerim" linki eklemedi, aynı sayfaya ikinci bir link olurdu.
 */
export function StoreFooterV2({
  storeSlug,
  categories,
  headingFont,
}: {
  storeSlug: string;
  categories: PublicCategory[];
  headingFont: string;
}) {
  const footerCategories = categories.slice(0, 6);

  return (
    <footer className="border-t border-[#292929] bg-[#0A0A0A] py-11 text-[#A3A3A3]">
      <Container>
        <div className="flex flex-wrap justify-between gap-10">
          <div className="max-w-[260px]">
            <div className={`${headingFont} text-lg font-bold text-white`}>TAKTİKALP46</div>
            <div className="mt-1 text-xs text-[#A3A3A3]">Güvenle Taşı.</div>
          </div>
          <div className="flex flex-wrap gap-14">
            {footerCategories.length > 0 ? (
              <div>
                <div className={`${headingFont} mb-3.5 text-xs font-semibold tracking-wide text-white`}>
                  KATEGORİLER
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  {footerCategories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/store/${storeSlug}/kategori/${category.slug}`}
                      className="hover:text-[#F5F5F5] hover:underline"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <div className={`${headingFont} mb-3.5 text-xs font-semibold tracking-wide text-white`}>MÜŞTERİ</div>
              <div className="flex flex-col gap-2 text-sm">
                <Link href={`/store/${storeSlug}/hesap`} className="hover:text-[#F5F5F5] hover:underline">
                  Hesabım
                </Link>
                <Link href={`/store/${storeSlug}/sepet`} className="hover:text-[#F5F5F5] hover:underline">
                  Sepetim
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-7 border-t border-[#292929] pt-4 text-center text-xs text-[#7A776E]">
          © {new Date().getFullYear()} Taktikalp46 — Güvenle Taşı.
        </div>
      </Container>
    </footer>
  );
}
