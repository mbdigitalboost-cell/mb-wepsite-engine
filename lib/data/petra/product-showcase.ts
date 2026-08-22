/**
 * Faz H-devam — kullanıcının isteği: "Mitsubishi Heavy" bölümünde
 * (MitsubishiSection) sadece Mitsubishi ürün fotoğrafları kullanılıyordu;
 * kullanıcı diğer 8 markanın (EuroForm, Gree, Haier, Hisense, Midea,
 * Samsung, Systemair, Vestel) da aynı şekilde, gerçek ürün fotoğraflarıyla
 * gösterilmesini istedi ("bunları da kullanalım, bahsettiğim yer burası").
 *
 * Kaynak: kullanıcının sağladığı `klima_logo.rar`. Bu pakette her marka
 * için birden fazla görsel vardı (bazıları düz katalog/stüdyo fotoğrafı,
 * bazıları "6 YIL GARANTİ", "BREEZELESS E 7.0 SEER", "EASY SMART 48.000
 * BTU - WİFİ" gibi Petra'nın doğrulamadığı spesifik garanti/kapasite/model
 * iddiaları içeren reklam bannerlarıydı). Petra'nın gerçekte hangi model/
 * kapasiteyi sattığı/hangi garanti süresini verdiği doğrulanmadığı için,
 * BU TÜR SPESİFİK İDDİA İÇEREN GÖRSELLER KULLANILMADI — her marka için
 * yalnızca düz, reklam metni/garanti/kapasite iddiası İÇERMEYEN en temiz
 * katalog/ürün fotoğrafı seçildi (yalnızca R32/Inverter/enerji sınıfı gibi
 * standart/düzenleyici etiketler kabul edildi, bunlar Petra'nın kendi
 * iddiası değil, ürünün kendi standart etiketidir).
 *
 * `type` alanı bilinçli olarak GENERİK tutuldu ("Klima Çözümü" vb.) —
 * görselden kesin bir model adı/seri kodu çıkarılamadığı için spesifik bir
 * model adı UYDURULMADI. Mitsubishi Heavy'nin kendi 6 modeli (gerçek,
 * müşteri onaylı isimlerle) ayrı olarak lib/data/petra/mitsubishi-models.ts
 * içinde kalmaya devam ediyor — bu dosya SADECE diğer 8 markayı kapsar.
 */

export interface PetraShowcaseProduct {
  id: string;
  slug: string;
  brand: string;
  /** Görselden net biçimde anlaşılan genel kategori — uydurma model/seri adı değildir. */
  type: string;
  image: string;
  shortDescription: string;
  href: string;
}

/** Marka özelinde ayrı bir ürün detay sayfası henüz olmadığı için tüm kartlar buraya yönlenir. */
const FALLBACK_HREF = "/cozumler";

function neutralDescription(brand: string): string {
  return `Petra Mühendislik'in sunduğu ${brand} ürünlerinden biri.`;
}

export const petraProductShowcase: PetraShowcaseProduct[] = [
  {
    id: "euroform",
    slug: "euroform-klima",
    brand: "EuroForm",
    type: "Klima Çözümü",
    image: "/images/petra/products/euroform.jpg",
    shortDescription: neutralDescription("EuroForm"),
    href: FALLBACK_HREF,
  },
  {
    id: "samsung",
    slug: "samsung-klima",
    brand: "Samsung",
    type: "Klima Çözümü",
    image: "/images/petra/products/samsung.jpg",
    shortDescription: neutralDescription("Samsung"),
    href: FALLBACK_HREF,
  },
  {
    id: "gree",
    slug: "gree-klima",
    brand: "Gree",
    type: "Klima Çözümü",
    image: "/images/petra/products/gree.webp",
    shortDescription: neutralDescription("Gree"),
    href: FALLBACK_HREF,
  },
  {
    id: "haier",
    slug: "haier-klima",
    brand: "Haier",
    type: "Klima Çözümü",
    image: "/images/petra/products/haier.webp",
    shortDescription: neutralDescription("Haier"),
    href: FALLBACK_HREF,
  },
  {
    id: "midea",
    slug: "midea-klima",
    brand: "Midea",
    type: "Klima Çözümü",
    image: "/images/petra/products/midea.webp",
    shortDescription: neutralDescription("Midea"),
    href: FALLBACK_HREF,
  },
  {
    id: "hisense",
    slug: "hisense-klima",
    brand: "Hisense",
    type: "Klima Çözümü",
    image: "/images/petra/products/hisense.webp",
    shortDescription: neutralDescription("Hisense"),
    href: FALLBACK_HREF,
  },
  {
    id: "vestel",
    slug: "vestel-klima",
    brand: "Vestel",
    type: "Dış Ünite",
    image: "/images/petra/products/vestel.webp",
    shortDescription: neutralDescription("Vestel"),
    href: FALLBACK_HREF,
  },
  {
    id: "systemair",
    slug: "systemair-havalandirma",
    brand: "Systemair",
    type: "Endüstriyel Havalandırma",
    image: "/images/petra/products/systemair.jpg",
    shortDescription: neutralDescription("Systemair"),
    href: FALLBACK_HREF,
  },
];
