/**
 * Faz H — anasayfada Mitsubishi Heavy slider'ının hemen altında yer alan,
 * Petra'nın çalıştığı 9 markayı gösteren "Çalıştığımız Markalar" bölümü
 * için merkezi marka listesi.
 *
 * Kaynak: kullanıcının sağladığı
 * `petra_bayilik_markalari_gorsel_paketi.zip`. Kullanıcı, bu 9 markanın
 * (Mitsubishi Heavy dahil) tamamıyla onaylı/belgeli bir bayilik veya
 * satıcı ilişkisi olduğunu doğrulamıştır — bu yüzden gerçek marka
 * logoları burada kullanılıyor. Ancak paketin kendi README'si bu
 * görsellerin "hızlı yerleşim için hazırlanmış referans kart" olduğunu,
 * resmi logo dosyası olarak kabul edilmemesi gerektiğini belirtiyor —
 * bu nedenle üretim ortamına geçmeden önce markaların kendi resmi
 * logo/brand-kit dosyalarıyla değiştirilmesi önerilir (bkz. rapor).
 *
 * Not: Mitsubishi Heavy'nin burada kullanılan "yetkili bayi/servis"
 * olduğuna dair güçlü bir iddia YOKTUR — bu ayrı ve daha güçlü bir hukuki
 * iddia olduğu için hâlâ lib/data/petra/mitsubishi.ts'teki
 * `dealerStatusVerified` bayrağıyla kilitli tutulur. Burada yalnızca
 * nötr "satışını ve kurulumunu gerçekleştirdiği markalardan biri"
 * ifadesi kullanılır.
 *
 * Güncelleme (aynı gün, `klima_logo.rar`): kullanıcı, 4 marka için daha
 * temiz/resmi görünümlü logo dosyaları sağladı — Gree, Hisense, Midea,
 * Systemair görselleri bu yeni dosyalarla değiştirildi. Diğer 5 markanın
 * (Mitsubishi Heavy, Samsung, EuroForm, Haier, Vestel) logosu bu pakette
 * ya hiç yoktu ya da (Samsung'daki gibi) kullanılabilir bir logo değildi
 * (deri dokulu bir "duvar kağıdı" görseliydi, resmi logo değil) — kullanıcının
 * kendi talimatına uygun olarak ("logosu olmayan, şu an sitede aktif olan
 * logoyu kullan") bu 5 marka için önceki görsel aynen korundu.
 */

export interface PetraBrand {
  id: string;
  slug: string;
  name: string;
  image: string;
  shortDescription: string;
  href: string;
}

/** Marka özelinde ayrı bir ürün/detay sayfası henüz olmadığı için tüm kartlar buraya yönlenir. */
const FALLBACK_HREF = "/cozumler";

function neutralDescription(name: string): string {
  return `Petra Mühendislik'in satışını ve kurulumunu gerçekleştirdiği markalardan biri: ${name}.`;
}

export const petraBrands: PetraBrand[] = [
  {
    id: "mitsubishi-heavy",
    slug: "mitsubishi-heavy",
    name: "Mitsubishi Heavy",
    image: "/images/petra/brands/mitsubishi-heavy.png",
    shortDescription: neutralDescription("Mitsubishi Heavy"),
    href: FALLBACK_HREF,
  },
  {
    id: "samsung",
    slug: "samsung",
    name: "Samsung",
    image: "/images/petra/brands/samsung.png",
    shortDescription: neutralDescription("Samsung"),
    href: FALLBACK_HREF,
  },
  {
    id: "gree",
    slug: "gree",
    name: "Gree",
    image: "/images/petra/brands/gree.png",
    shortDescription: neutralDescription("Gree"),
    href: FALLBACK_HREF,
  },
  {
    id: "euroform",
    slug: "euroform",
    name: "EuroForm",
    image: "/images/petra/brands/euroform.png",
    shortDescription: neutralDescription("EuroForm"),
    href: FALLBACK_HREF,
  },
  {
    id: "haier",
    slug: "haier",
    name: "Haier",
    image: "/images/petra/brands/haier.png",
    shortDescription: neutralDescription("Haier"),
    href: FALLBACK_HREF,
  },
  {
    id: "midea",
    slug: "midea",
    name: "Midea",
    image: "/images/petra/brands/midea.png",
    shortDescription: neutralDescription("Midea"),
    href: FALLBACK_HREF,
  },
  {
    id: "hisense",
    slug: "hisense",
    name: "Hisense",
    image: "/images/petra/brands/hisense.png",
    shortDescription: neutralDescription("Hisense"),
    href: FALLBACK_HREF,
  },
  {
    id: "vestel",
    slug: "vestel",
    name: "Vestel",
    image: "/images/petra/brands/vestel.png",
    shortDescription: neutralDescription("Vestel"),
    href: FALLBACK_HREF,
  },
  {
    id: "systemair",
    slug: "systemair",
    name: "Systemair",
    image: "/images/petra/brands/systemair.png",
    shortDescription: neutralDescription("Systemair"),
    href: FALLBACK_HREF,
  },
];
