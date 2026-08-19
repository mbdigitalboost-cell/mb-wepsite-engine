/**
 * Petra Mühendislik — Referanslar (Premium Project References).
 *
 * Kaynak: kullanıcının sağladığı `Petra_Referans_Logolari_25_Paket.zip`
 * (bkz. `/public/images/petra/references/` — dosyalar orijinal adlarıyla
 * kopyalandı, `REFERANS_LISTESI.tsv` ve `SOURCES_AND_USAGE.txt` bu
 * dosyanın tek kaynağıdır).
 *
 * GERÇEK LOGO (logoType: "real") — yalnızca 2 kayıt:
 * - Bahçeşehir Koleji
 * - KSÜ Tıp Fakültesi Onkoloji Bölümü
 * Bu ikisi paket içinde gerçek logo dosyası olarak işaretlenmiş
 * (`SOURCES_AND_USAGE.txt`), diğer 23 kayıt `FALLBACK` olarak işaretli.
 *
 * FALLBACK (logoType: "fallback") — kalan 23 kayıt için paketteki SVG'ler
 * gerçek marka logosu DEĞİLDİR; daire + kurum baş harfleri + kurum adı +
 * "REFERANS" etiketi içeren nötr, tasarlanmış referans işaretleridir
 * (`SOURCES_AND_USAGE.txt`: "bu paketteki SVG'ler gerçek marka logosu
 * olarak sunulmaz"). Bu dosya bu ayrımı asla bulanıklaştırmaz —
 * component'ler `logoType === "fallback"` olan kayıtları gerçek logo gibi
 * sunmamalıdır (ör. "Resmi Logo" gibi bir etiket eklenemez).
 *
 * KATEGORİLER — kullanıcının kendi gruplandırması, birebir:
 * Kamu & Sağlık, Turizm & Konaklama, Ticari & Endüstriyel, Eğitim,
 * Diğer Projeler. Gerçek proje detayı/adres/kapasite/tarih gibi hiçbir
 * bilgi mevcut değil ve BURADA UYDURULMAMIŞTIR — her kayıt yalnızca
 * kurum adı + kategori + logo/fallback görseli taşır.
 *
 * `href` her kayıtta `null`: gerçek proje detay sayfası/URL'i yok, bu
 * yüzden sahte bir link üretilmedi (bkz. brief'in "PROJE BİLGİSİ UYDURMA"
 * ve "ETKİLEŞİM" bölümleri). Showcase/list bileşenleri bu alanı yalnızca
 * ileride gerçek detay sayfaları eklendiğinde kullanılabilecek şekilde
 * taşır; şu an hiçbir yerde `<a href>` olarak render edilmez.
 *
 * `featured: true` — anasayfa teaser'ında gösterilecek 8 kayıt. Seçim
 * kriteri: her 5 kategoriden en az bir örnek + 2 gerçek logolu kaydın
 * ikisi de dahil (görsel çeşitlilik için) — içerik/öncelik anlamında bir
 * iddia taşımaz, sırf teaser'ın kategori çeşitliliği göstermesi içindir.
 */

export type PetraReferenceCategory =
  | "Kamu & Sağlık"
  | "Turizm & Konaklama"
  | "Ticari & Endüstriyel"
  | "Eğitim"
  | "Diğer Projeler";

export interface PetraReference {
  id: string;
  name: string;
  category: PetraReferenceCategory;
  /** Relative to /public. */
  logo: string;
  logoType: "real" | "fallback";
  /** Gerçek detay sayfası olmadığı için şu an her zaman null — bkz. dosya başlığı. */
  href: string | null;
  featured: boolean;
  order: number;
}

const LOGO_BASE = "/images/petra/references";

export const petraReferences: PetraReference[] = [
  // Kamu & Sağlık
  {
    id: "elbistan-ilce-saglik",
    name: "Elbistan İlçe Sağlık",
    category: "Kamu & Sağlık",
    logo: `${LOGO_BASE}/elbistan-ilce-saglik.svg`,
    logoType: "fallback",
    href: null,
    featured: true,
    order: 1,
  },
  {
    id: "turkoglu-hukumet-konagi",
    name: "Türkoğlu Hükümet Konağı",
    category: "Kamu & Sağlık",
    logo: `${LOGO_BASE}/turkoglu-hukumet-konagi.svg`,
    logoType: "fallback",
    href: null,
    featured: false,
    order: 2,
  },
  {
    id: "beyoglu-asm",
    name: "Beyoğlu ASM",
    category: "Kamu & Sağlık",
    logo: `${LOGO_BASE}/beyoglu-asm.svg`,
    logoType: "fallback",
    href: null,
    featured: false,
    order: 3,
  },
  {
    id: "sekeroba-asm",
    name: "Şekeroba ASM",
    category: "Kamu & Sağlık",
    logo: `${LOGO_BASE}/sekeroba-asm.svg`,
    logoType: "fallback",
    href: null,
    featured: false,
    order: 4,
  },
  {
    id: "ksu-tip-fakultesi-onkoloji",
    name: "KSÜ Tıp Fakültesi Onkoloji Bölümü",
    category: "Kamu & Sağlık",
    logo: `${LOGO_BASE}/ksu-tip-fakultesi.png`,
    logoType: "real",
    href: null,
    featured: true,
    order: 5,
  },
  {
    id: "ksu-fen-edebiyat-fakultesi",
    name: "KSÜ Fen Edebiyat Fakültesi",
    category: "Kamu & Sağlık",
    logo: `${LOGO_BASE}/ksu-fen-edebiyat-fakultesi.svg`,
    logoType: "fallback",
    href: null,
    featured: false,
    order: 6,
  },
  {
    id: "ksu-muhendislik-fakultesi",
    name: "KSÜ Mühendislik Fakültesi",
    category: "Kamu & Sağlık",
    logo: `${LOGO_BASE}/ksu-muhendislik-fakultesi.svg`,
    logoType: "fallback",
    href: null,
    featured: false,
    order: 7,
  },

  // Turizm & Konaklama
  {
    id: "orkis-termal-otel",
    name: "Orkis Termal Otel",
    category: "Turizm & Konaklama",
    logo: `${LOGO_BASE}/orkis-termal-otel.svg`,
    logoType: "fallback",
    href: null,
    featured: true,
    order: 8,
  },
  {
    id: "adanis-park-termal-otel",
    name: "Adanis Park Termal Otel",
    category: "Turizm & Konaklama",
    logo: `${LOGO_BASE}/adanis-park-termal-otel.svg`,
    logoType: "fallback",
    href: null,
    featured: false,
    order: 9,
  },
  {
    id: "dogele-termal-oteller",
    name: "Dögele Termal Oteller",
    category: "Turizm & Konaklama",
    logo: `${LOGO_BASE}/dogele-termal-oteller.svg`,
    logoType: "fallback",
    href: null,
    featured: false,
    order: 10,
  },
  {
    id: "grand-maras-termal-otel",
    name: "Grand Maraş Termal Otel",
    category: "Turizm & Konaklama",
    logo: `${LOGO_BASE}/grand-maras-termal-otel.svg`,
    logoType: "fallback",
    href: null,
    featured: true,
    order: 11,
  },

  // Ticari & Endüstriyel
  {
    id: "karbak-metal",
    name: "Karbak Metal",
    category: "Ticari & Endüstriyel",
    logo: `${LOGO_BASE}/karbak-metal.svg`,
    logoType: "fallback",
    href: null,
    featured: true,
    order: 12,
  },
  {
    id: "eslon-mutfak-esyalari",
    name: "Eslon Mutfak Eşyaları",
    category: "Ticari & Endüstriyel",
    logo: `${LOGO_BASE}/eslon-mutfak-esyalari.svg`,
    logoType: "fallback",
    href: null,
    featured: false,
    order: 13,
  },

  // Eğitim
  {
    id: "doga-koleji",
    name: "Doğa Koleji",
    category: "Eğitim",
    logo: `${LOGO_BASE}/doga-koleji.svg`,
    logoType: "fallback",
    href: null,
    featured: false,
    order: 14,
  },
  {
    id: "bahcesehir-koleji",
    name: "Bahçeşehir Koleji",
    category: "Eğitim",
    logo: `${LOGO_BASE}/bahcesehir-koleji.jpg`,
    logoType: "real",
    href: null,
    featured: true,
    order: 15,
  },
  {
    id: "ozel-atk-koleji",
    name: "Özel ATK Koleji",
    category: "Eğitim",
    logo: `${LOGO_BASE}/ozel-atk-koleji.svg`,
    logoType: "fallback",
    href: null,
    featured: false,
    order: 16,
  },

  // Diğer Projeler
  {
    id: "ckc-hukuk-burosu",
    name: "CKC Hukuk Bürosu",
    category: "Diğer Projeler",
    logo: `${LOGO_BASE}/ckc-hukuk-burosu.svg`,
    logoType: "fallback",
    href: null,
    featured: true,
    order: 17,
  },
  {
    id: "ckc-villa",
    name: "CKC Villa",
    category: "Diğer Projeler",
    logo: `${LOGO_BASE}/ckc-villa.svg`,
    logoType: "fallback",
    href: null,
    featured: false,
    order: 18,
  },
  {
    id: "karacasu-taziye-evi",
    name: "Karacasu Taziye Evi",
    category: "Diğer Projeler",
    logo: `${LOGO_BASE}/karacasu-taziye-evi.svg`,
    logoType: "fallback",
    href: null,
    featured: false,
    order: 19,
  },
  {
    id: "kumcati-taziye-evi",
    name: "Kumçatı Taziye Evi",
    category: "Diğer Projeler",
    logo: `${LOGO_BASE}/kumcati-taziye-evi.svg`,
    logoType: "fallback",
    href: null,
    featured: false,
    order: 20,
  },
  {
    id: "altinsehir-eskikale-gold",
    name: "Altınşehir Eskikale Gold",
    category: "Diğer Projeler",
    logo: `${LOGO_BASE}/altinsehir-eskikale-gold.svg`,
    logoType: "fallback",
    href: null,
    featured: false,
    order: 21,
  },
  {
    id: "altinsehir-akben-kuyumculuk",
    name: "Altınşehir Akben Kuyumculuk",
    category: "Diğer Projeler",
    logo: `${LOGO_BASE}/altinsehir-akben-kuyumculuk.svg`,
    logoType: "fallback",
    href: null,
    featured: false,
    order: 22,
  },
  {
    id: "altinsehir-ari-kuyumculuk",
    name: "Altınşehir Arı Kuyumculuk",
    category: "Diğer Projeler",
    logo: `${LOGO_BASE}/altinsehir-ari-kuyumculuk.svg`,
    logoType: "fallback",
    href: null,
    featured: false,
    order: 23,
  },
  {
    id: "altinsehir-ari-kuyumculuk-2",
    name: "Altınşehir Arı Kuyumculuk 2",
    category: "Diğer Projeler",
    logo: `${LOGO_BASE}/altinsehir-ari-kuyumculuk-2.svg`,
    logoType: "fallback",
    href: null,
    featured: false,
    order: 24,
  },
  {
    id: "hg-hospital",
    name: "HG Hospital",
    category: "Diğer Projeler",
    logo: `${LOGO_BASE}/hg-hospital.svg`,
    logoType: "fallback",
    href: null,
    featured: false,
    order: 25,
  },
];

export const petraReferenceCategories: PetraReferenceCategory[] = [
  "Kamu & Sağlık",
  "Turizm & Konaklama",
  "Ticari & Endüstriyel",
  "Eğitim",
  "Diğer Projeler",
];
