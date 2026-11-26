import { storeBase } from "@/lib/sites/store-href";
import Link from "next/link";
import Image from "next/image";
import { Truck, ShieldCheck, RotateCcw, Headphones, ImageOff, Feather, Flame, Settings2 } from "lucide-react";
import type { PublicCategory } from "@/lib/commerce/public/categories";
import type { PublicBrand, PublicBrandWithCount } from "@/lib/commerce/public/brands";
import type { PublicProduct } from "@/lib/commerce/public/products";
import { CATEGORY_FALLBACK_IMAGES } from "@/lib/commerce/public/category-fallback-images";
import { formatPrice } from "@/lib/utils/format-price";
import { storefrontDisplayClasses, storefrontMonoClasses } from "@/lib/utils/storefront-typography";
import { Container } from "@/components/ui/container";
import { BrandAvatar } from "@/components/commerce/public/brand-avatar";

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

/** `headingFont` çağıranlardan storefrontDisplayClasses geliyor (uppercase/tracking-wide zaten onun içinde) — burada SADECE kalınlık ekleniyor, çakışan bir ikinci uppercase/tracking class'ı YOK. */
const HEADING = "font-bold";

/**
 * 1. Neden Kydex? — statik, genel Kydex malzeme gerçekleri (ürün-spesifik
 * iddia değil). Metinler/sıra DEĞİŞMEDİ (Site Tasarımı v3 devir metninin
 * kendi talimatı — "metin/başlıklar AYNEN kalıyor, sadece görsel
 * zenginleştirme") — sadece her karta ince bir ikon + hafif radial
 * gradient doku eklendi.
 */
const WHY_KYDEX_ITEMS = [
  { n: "01", Icon: Feather, title: "Hafif Yapı", body: "Günlük taşıma ve operasyonel kullanım için optimize edilmiş yapı." },
  { n: "02", Icon: ShieldCheck, title: "Yüksek Dayanıklılık", body: "Darbe ve zorlu kullanım koşullarına karşı dayanıklı malzeme yapısı." },
  { n: "03", Icon: Flame, title: "Formunu Korur", body: "Isıl şekillendirilmiş Kydex yapı sayesinde ürün formunu korur." },
  { n: "04", Icon: Settings2, title: "Kullanıma Özel Tasarım", body: "Farklı modeller ve taşıma ihtiyaçları için ürün seçenekleri." },
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
            <div
              key={item.n}
              className="relative overflow-hidden rounded-[14px] border border-[#292929] bg-[#171717] p-6 transition-colors hover:border-[#D95F00]/50"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-60"
                style={{ background: "radial-gradient(circle, rgba(217,95,0,0.16) 0%, transparent 70%)" }}
              />
              <div className="relative flex items-center justify-between">
                <div className={`${headingFont} text-xl font-bold text-[#D95F00]`}>{item.n}</div>
                <item.Icon size={20} strokeWidth={1.6} className="text-[#D95F00]/70" aria-hidden="true" />
              </div>
              <div className={`${headingFont} relative mt-2.5 text-[15px] font-semibold text-[#F5F5F5]`}>{item.title}</div>
              <div className="relative mt-2 text-[13px] leading-relaxed text-[#A3A3A3]">{item.body}</div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}

/**
 * Site Tasarımı v3 + Silahını Seç Sistemi devir metni, Kısım A — YENİ
 * bölüm, kategori ızgarasından (Kydex Koleksiyonu) ÖNCE: "Silahını Seç"
 * akışını tanıtan görsel bir panel. GERÇEK markalar + GERÇEK ürün
 * sayıları (getPublicBrandsWithProductCounts, Kısım A/B için eklendi) —
 * uydurma sayı/marka yok. CANİK (productCount > 0): aktif/tıklanabilir
 * kart, turuncu border, "AKTİF KATALOG" rozeti. SARSILMAZ/GLOCK
 * (productCount === 0, bugünkü gerçek durum): donuk/dashed kart,
 * "Yakında" rozeti, BİLEREK Link DEĞİL (devir metninin kendi "tıklanabilir
 * de olmamalı" tercihi) — düz <div>, tıklanamaz.
 */
export function SilahiniSecBridgeSection({
  storeSlug,
  brands,
  headingFont,
}: {
  storeSlug: string;
  brands: PublicBrandWithCount[];
  headingFont: string;
}) {
  if (brands.length === 0) return null;

  return (
    <div className="bg-[#0A0A0A] py-14">
      <Container>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className={`${HEADING} ${headingFont} text-[26px] text-[#F5F5F5]`}>Silahını Seç</h2>
            <p className="mt-2 text-[13px] text-[#A3A3A3]">Markanı seç, sana tam uyumlu kılıf ve ekipmanı birlikte bulalım.</p>
          </div>
          <Link
            href={`${storeBase(storeSlug)}/silahini-sec`}
            className={`${headingFont} flex items-center gap-1.5 text-xs font-semibold text-[#D95F00] hover:text-[#F26A00]`}
          >
            Tüm Markalar →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {brands.slice(0, 3).map((brand) =>
            brand.productCount > 0 ? (
              <Link
                key={brand.id}
                href={`${storeBase(storeSlug)}/silahini-sec/${brand.slug}`}
                className="group relative overflow-hidden rounded-[14px] border border-[#D95F00]/50 bg-[#171717] p-6 transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#D95F00]"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{ background: "radial-gradient(240px 160px at 85% -10%, rgba(217,95,0,.12), transparent 70%)" }}
                />
                <span
                  className={`${storefrontMonoClasses} relative inline-block rounded-full bg-[#D95F00] px-2.5 py-0.5 text-[10px] font-bold text-[#1A0D00]`}
                >
                  AKTİF KATALOG
                </span>
                <div className="relative mt-4 flex items-center gap-3">
                  <BrandAvatar name={brand.name} logoUrl={brand.logoUrl} />
                  <div>
                    <p className={`${headingFont} text-base font-bold text-[#F5F5F5]`}>{brand.name}</p>
                    <p className={`${storefrontMonoClasses} text-xs text-[#A3A3A3]`}>{brand.productCount} ürün</p>
                  </div>
                </div>
              </Link>
            ) : (
              <div
                key={brand.id}
                className="relative rounded-[14px] border border-dashed border-[#292929] bg-[#171717]/50 p-6 opacity-60"
              >
                <span className="inline-block rounded-full border border-[#3A3A3A] px-2.5 py-0.5 text-[10px] font-semibold text-[#6B6B6B]">
                  Yakında
                </span>
                <div className="mt-4 flex items-center gap-3">
                  <BrandAvatar name={brand.name} logoUrl={brand.logoUrl} />
                  <p className={`${headingFont} text-base font-bold text-[#A3A3A3]`}>{brand.name}</p>
                </div>
              </div>
            ),
          )}
        </div>
      </Container>
    </div>
  );
}

/**
 * Paylaşımlı kategori kartı — gradient overlay + sol-alt etiket. Hem
 * "Kydex Koleksiyonu" (2) hem "Diğer Kategoriler" (7) için AYNI görsel dil
 * (FAZ 7.3 follow-up'un kendi talimatı: "OtherCategoriesSection'ı,
 * KydexCollectionSection'daki AYNI görsel+gradient+etiket düzenine
 * çevir") — iki ayrı JSX kopyası yerine tek, parametreli bileşen.
 */
export function CategoryImageCard({
  storeSlug,
  category,
  headingFont,
  aspect,
}: {
  storeSlug: string;
  category: PublicCategory;
  headingFont: string;
  /** Faz 24 — sabit yükseklik yerine en-boy oranı (ör. "aspect-[4/3]"): geniş ekranda dar kartın yatay fotoğrafı sert kırpmasın. */
  aspect: string;
}) {
  const imageUrl = category.imageUrl ?? CATEGORY_FALLBACK_IMAGES[category.slug] ?? null;
  return (
    <Link
      href={`${storeBase(storeSlug)}/kategori/${category.slug}`}
      className={`group relative block ${aspect} overflow-hidden rounded-[14px] border border-[#292929] bg-[#171717] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg`}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={category.name}
          fill
          // Faz 24 — yerel /images/categories/ dosyaları optimize edilir; DB'deki
          // image_url admin'in serbest metin URL'i (keyfi host, remotePatterns dışı) → unoptimized kalır.
          unoptimized={!imageUrl.startsWith("/")}
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="object-cover object-center opacity-85 transition-transform duration-300 group-hover:scale-105"
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
          {featured.map((category) => (
            <CategoryImageCard
              key={category.id}
              storeSlug={storeSlug}
              category={category}
              headingFont={headingFont}
              aspect="aspect-[4/3]"
            />
          ))}
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
              href={`${storeBase(storeSlug)}/silahini-sec/${brand.slug}`}
              className={`${headingFont} rounded-full px-7 py-3 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5 ${
                index === 0
                  ? "bg-[#D95F00] text-[#1A0D00] hover:bg-[#F26A00]"
                  : "border-[1.5px] border-[#3A3A3A] bg-[#171717] text-[#F5F5F5] hover:border-[#D95F00]"
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

/**
 * 4. Öne Çıkan Kydex Ürünler — gerçek ürünler (page.tsx en fazla 4
 * gönderiyor), yıldız YOK. Ürün yoksa render edilmez.
 *
 * FAZ 7.3 follow-up — `imageUrl` artık page.tsx'te her ürün için ayrıca
 * çözülen gerçek birincil ürün fotoğrafı (getPublicProductImages,
 * product-images bucket'ından imzalı URL) — önceden burada hardcoded boş
 * bir <div> vardı. Görseli olmayan (nadir) bir ürün için sahte bir görsel
 * uydurmak yerine nötr bir ikon (ImageOff) gösteriliyor.
 */
export function FeaturedProductsSection({
  storeSlug,
  products,
  headingFont,
}: {
  storeSlug: string;
  products: (PublicProduct & { imageUrl: string | null })[];
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
              href={`${storeBase(storeSlug)}/urun/${product.slug}`}
              className="group block overflow-hidden rounded-[14px] border border-[#292929] bg-[#171717] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="relative h-[170px] bg-[#1D1D1B]">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageOff size={28} strokeWidth={1.5} className="text-[#4A4A46]" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="p-3.5">
                <div className="text-[13px] font-semibold text-[#F5F5F5]">{product.name}</div>
                <div className={`${storefrontMonoClasses} mt-2 text-[15px] font-bold text-[#D95F00]`}>
                  {formatPrice(product.display.price)} {product.display.from ? <span className="text-[10px] font-normal text-[#A3A3A3]">seçeneğe göre değişir</span> : null}
                </div>
                <div className="mt-2.5 rounded-full border-[1.5px] border-[#3A3A3A] py-2 text-center text-xs font-medium text-[#F5F5F5] transition-colors group-hover:border-[#D95F00]">
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

/**
 * 7. Diğer Kategoriler — Kydex Koleksiyonu'na girmeyen gerçek kategoriler.
 * Hiç yoksa render edilmez.
 *
 * FAZ 7.3 follow-up — düz metin kutucukları yerine artık KydexCollectionSection
 * ile AYNI CategoryImageCard (görsel+gradient+etiket) kullanıyor; giyim/
 * canta/palaska-ve-kemer/kampanyali-urunler için CATEGORY_FALLBACK_IMAGES'taki
 * dosyalar zaten repoda (yeni dosya eklenmedi).
 */
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
            <CategoryImageCard
              key={category.id}
              storeSlug={storeSlug}
              category={category}
              headingFont={headingFont}
              aspect="aspect-[4/3]"
            />
          ))}
          <Link
            href={`${storeBase(storeSlug)}/kategoriler`}
            className="flex aspect-[4/3] items-center justify-center rounded-[14px] border border-[#292929] bg-[#171717] text-xs font-semibold text-[#D95F00] transition-colors hover:border-[#D95F00]"
          >
            Tümünü Gör →
          </Link>
        </div>
      </Container>
    </div>
  );
}

/**
 * Güven rozetleri — teyitsiz sayı yok ("14 gün"/"2-4 iş günü" gibi),
 * sadece teyitli/nötr ifadeler (aynı 4 ifade, duyuru şeridinde de
 * kullanılıyor — iki yerde de BİREBİR aynı metin, birbirinden sapmasın).
 *
 * Devir metni v2 — kanvasta (Main.dc.html) hero'nun ALTINDA, 4 sütun +
 * aralarında ince dikey ayraç olan bir "trust bar" var ("Hızlı Kargo /
 * 2-4 iş günü teslim" gibi başlık+alt metin ikilisi) — bu bölüm ÖNCEDEN
 * sayfanın daha aşağısında (Diğer Kategoriler'den sonra) tek satırlık
 * ikon+etiket olarak duruyordu. Artık hero'nun hemen altına taşındı
 * (bkz. page.tsx) ve kanvasın dikey ayraç düzeni eklendi — ama kanvasın
 * kendi alt metinleri ("2–4 iş günü teslim", "%100 garantili" gibi)
 * TEYİT EDİLMEMİŞ iddialar olduğu için KOPYALANMADI, sadece üstteki 4
 * GERÇEK/onaylı ifade kullanıldı (tek satır başlık, uydurma alt metin
 * yok).
 *
 * Site Tasarımı v3 devir metni — "ince, ikon+metin, ayraç çizgili TEK
 * SATIR" talimatı: önceki 2×2/4 sütunlu GRID (mobilde 2 satır) artık
 * tek bir flex satırı — geniş ekranda hep tek satır, dar ekranda sadece
 * gerektiğinde sarıyor (grid'in zorladığı sabit 2 sütun YOK). Dikey
 * ayraçlar artık ekran genişliğinden bağımsız (sm: öneki kaldırıldı).
 */
const STATIC_TRUST_BADGES = [
  { Icon: ShieldCheck, label: "Güvenli Ödeme" },
  { Icon: RotateCcw, label: "Kolay İade" },
  { Icon: Headphones, label: "Müşteri Desteği" },
];

/** Faz 31 — ücretsiz kargo rozeti mağaza ayarından; iddia yoksa rozet gösterilmez. */
export function TrustBadgesSection({ freeShippingClaim, returnsEnabled }: { freeShippingClaim: string | null; returnsEnabled: boolean }) {
  // Faz 37 Kısım D — "Kolay İade" yalnız iade açıkken (duyuru şeridiyle aynı kural).
  const staticBadges = returnsEnabled ? STATIC_TRUST_BADGES : STATIC_TRUST_BADGES.filter((badge) => badge.label !== "Kolay İade");
  const TRUST_BADGES = freeShippingClaim ? [{ Icon: Truck, label: freeShippingClaim }, ...staticBadges] : staticBadges;
  return (
    <div className="border-b border-[#292929] bg-[#0A0A0A] py-5">
      <Container className="flex flex-wrap items-center justify-center gap-y-3">
        {TRUST_BADGES.map(({ Icon, label }, index) => (
          <div
            key={label}
            className={`flex items-center gap-2.5 px-5 ${index < TRUST_BADGES.length - 1 ? "border-r border-[#292929]" : ""}`}
          >
            <Icon size={18} strokeWidth={1.6} className="shrink-0 text-[#D95F00]" aria-hidden="true" />
            <span className={`${storefrontDisplayClasses} text-xs font-semibold text-[#F5F5F5]`}>{label}</span>
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
          className={`${headingFont} inline-flex items-center gap-2 rounded-full border-[1.5px] border-[#3A3A3A] bg-[#171717] px-6 py-3 text-sm font-semibold text-[#F5F5F5] transition-colors hover:border-[#D95F00] hover:text-[#D95F00]`}
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

/* 10. Footer — Faz 24'te components/commerce/public/store-footer.tsx'e taşındı, layout.tsx'ten site geneli render ediliyor. */
