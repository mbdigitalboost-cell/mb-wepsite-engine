/**
 * Faz 13 — Mitsubishi Heavy ürün vitrini için merkezi model listesi.
 *
 * Kaynak: kullanıcının sağladığı MITSUBISHI_HEAVY_MODELLERI_GORSELLER.zip
 * (6 gerçek görsel, public/images/petra/mitsubishi/ altına orijinal
 * dosya adlarıyla kopyalandı). `type` alanı doğrudan dosya adından
 * (kullanıcının kendi adlandırdığı seri/tip bilgisi) türetildi — uydurma
 * teknik özellik, kapasite, fiyat, garanti veya model kodu YOKTUR.
 *
 * Bu tabloda gerçek ürün detay sayfası/route'u henüz mevcut olmadığı
 * için (bkz. PHASE_13_RAPOR.md §3) her kaydın `href` alanı, sitede
 * zaten var olan ve markayla ilgili en uygun mevcut sayfaya
 * (mitsubishi-section.tsx'in kendi "Ürünleri İncele" CTA'sıyla aynı
 * hedef: /cozumler) yönlendirir — kırık link veya uydurma ürün detay
 * sayfası oluşturulmamıştır. CMS'de bir ürün tablosu eklendiğinde bu
 * dosya, aynı `id/slug/name/type/image/shortDescription/href` şeklini
 * koruyarak CMS'den okunan veriyle değiştirilebilir.
 */

export interface MitsubishiModel {
  id: string;
  slug: string;
  name: string;
  /** Görseldeki/dosya adındaki seri tipi — uydurma teknik özellik değildir. */
  type: string;
  image: string;
  shortDescription: string;
  href: string;
}

/** Ürün detay CMS/route'u henüz olmadığı için tüm kartlar buraya yönlenir. */
const FALLBACK_HREF = "/cozumler";

export const petraMitsubishiModels: MitsubishiModel[] = [
  {
    id: "fdts",
    slug: "fdts-serisi-kanal-tipi",
    name: "FDTS Serisi",
    type: "Kanal Tipi",
    image: "/images/petra/mitsubishi/01_fdts_serisi_kanal_tipi.jpg",
    shortDescription: "Asma tavan içine gizlenen, kanal bağlantılı iç ünite tipi.",
    href: FALLBACK_HREF,
  },
  {
    id: "fdtc",
    slug: "fdtc-serisi-gommeli-tavan",
    name: "FDTC Serisi",
    type: "Gömmeli Tavan Tipi",
    image: "/images/petra/mitsubishi/02_fdtc_serisi_gommeli_tavan.jpg",
    shortDescription: "Tavana gömülü, ince profilli iç ünite tipi.",
    href: FALLBACK_HREF,
  },
  {
    id: "fde",
    slug: "fde-serisi-dik-tip",
    name: "FDE Serisi",
    type: "Dik Tip",
    image: "/images/petra/mitsubishi/03_fde_serisi_dik_tip.jpg",
    shortDescription: "Zemine yerleştirilen, dikey duruşlu iç ünite tipi.",
    href: FALLBACK_HREF,
  },
  {
    id: "fdf",
    slug: "fdf-serisi-kaset-tipi",
    name: "FDF Serisi",
    type: "Kaset Tipi",
    image: "/images/petra/mitsubishi/04_fdf_serisi_kaset_tipi.jpg",
    shortDescription: "Tavana gömülü, dört yönlü üfleme yapan kaset tipi iç ünite.",
    href: FALLBACK_HREF,
  },
  {
    id: "fdk",
    slug: "fdk-serisi-duvar-tipi",
    name: "FDK Serisi",
    type: "Duvar Tipi",
    image: "/images/petra/mitsubishi/05_fdk_serisi_duvar_tipi.jpg",
    shortDescription: "Duvara monte edilen, yaygın kullanılan iç ünite tipi.",
    href: FALLBACK_HREF,
  },
  {
    id: "fdc",
    slug: "fdc-serisi-dis-unite",
    name: "FDC Serisi",
    type: "Dış Ünite",
    image: "/images/petra/mitsubishi/06_fdc_serisi_dis_unite.jpg",
    shortDescription: "Sistemin dış mekâna kurulan ana ünitesi.",
    href: FALLBACK_HREF,
  },
];
