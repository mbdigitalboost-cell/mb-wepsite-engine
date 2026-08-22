/**
 * "Sahadaki Çalışmalarımız" — kullanıcının sağladığı
 * `petra_referans_premium_16foto_5video.zip` paketindeki GERÇEK saha/
 * kurulum fotoğraf ve videoları. Bunlar Petra'nın kendi ekibinin çektiği,
 * düzenlenmemiş (AI ile üretilmemiş, üzerine yazı/logo eklenmemiş) ham
 * saha görüntüleridir.
 *
 * Doğrulama notları:
 * - Paket "16 foto" olarak adlandırılmış ama `proje-14.webp` ve
 *   `proje-16.webp` birebir aynı dosya (md5 eşleşti) — tekrar eden
 *   kopya burada listelenmedi, 15 benzersiz görsel kullanıldı (proje-16
 *   atlandı, proje-14 tek kopya olarak `saha-14` adıyla kullanıldı).
 * - Paket "5 video" olarak adlandırılmış ama içeride yalnızca 3 video
 *   dosyası vardı (`saha-video-01/02/03.mp4`) — eksik olan 2 video
 *   burada var gibi gösterilmedi.
 * - Hiçbir görsel/video kırpılıp yeniden çizilmedi, üzerine metin/logo/
 *   CTA eklenmedi, filtre uygulanmadı. `caption` alanları yalnızca
 *   fotoğrafta GÖRÜNEN şeyi anlatır (örn. "Haier MRV5 dış ünite sırası")
 *   — asla kapasite/tarih/metrekare uydurulmadı. Her görsel bu dosyayı
 *   yazmadan önce tek tek tekrar açılıp içerik doğrulandı.
 * - Müşteri/proje adı EŞLEŞTİRMESİ: kullanıcının onayladığı referans
 *   listesi (Orkis Termal Otel, Adanis Park Termal Otel, Dögele Termal
 *   Oteller, Grand Maraş Termal Otel, Karbak Metal, Eslon Mutfak
 *   Eşyaları, HG Hospital, Doğa Koleji, Bahçeşehir Koleji, KSÜ Tıp
 *   Fakültesi Onkoloji Bölümü) ile bu paketteki hiçbir görsel arasında
 *   KESİN bir eşleşme kurulamadı — bu yüzden `projectLabel` alanı hepsi
 *   için `null` (bileşen bunun yerine genel "Petra Mühendislik
 *   Uygulaması" ifadesini gösterir). `saha-01.webp`'de duvarda gerçek
 *   ve okunaklı bir "TÜRKMEN ŞİRKETLER GRUBU" tabelası görünüyor — bu
 *   fotoğrafa sonradan eklenmiş bir şey değil, kadrajın içinde zaten var
 *   olan bir tabela — ama bu isim kullanıcının onayladığı referans
 *   listesinde YOK, bu yüzden proje adı olarak yazılmadı (tahmin
 *   edilmedi). Kullanıcı bu ismi de referans olarak eklemek isterse
 *   ayrıca teyit alınmalı.
 * - Bazı görsellerde/videolarda marka logosu (Mitsubishi Heavy, Haier,
 *   Gree) görünüyor — bunlar montaj edilen GERÇEK ürünlerin üzerindeki
 *   kendi etiketleri, siteye sonradan eklenmiş bir marka iddiası değil;
 *   olduğu gibi bırakıldı.
 */

export type PetraSiteWorkMediaType = "photo" | "video";

export interface PetraSiteWork {
  id: string;
  type: PetraSiteWorkMediaType;
  /** Görsel (photo) ya da video poster karesi (video) — her ikisi de gösterim için gerekli. */
  image: string;
  /** Yalnızca type: "video" için — gerçek video dosyası. */
  videoSrc?: string;
  /** Orijinal dosyanın gerçek piksel oranı — lightbox/crop hesaplarında kullanılır. */
  aspect: "portrait" | "landscape";
  /** Görünen içeriğin sade açıklaması — asla uydurma teknik detay içermez. */
  caption: string;
  /** Kesin olarak bilinen proje/müşteri adı — yoksa null (bkz. dosya başı not). */
  projectLabel: string | null;
}

/**
 * Ana sayfadaki "Sahadaki Çalışmalarımız" bölümü için seçilen 6 öğe —
 * en yüksek görsel kalitede olan ve en çeşitli çalışma türlerini
 * (dış ünite montajı, ekip çalışması, marka ürün detayı, video) gösteren
 * seçki. Geri kalan tüm görsel/videolar `/projeler` sayfasındaki tam
 * galeride yer alıyor (bkz. petraSiteWorksFull).
 */
export const petraSiteWorksFeatured: PetraSiteWork[] = [
  {
    id: "saha-09",
    type: "photo",
    image: "/images/petra/site-works/saha-09.webp",
    aspect: "landscape",
    caption: "Ticari bina cephesinde VRF dış ünite kurulumu.",
    projectLabel: null,
  },
  {
    id: "saha-08",
    type: "photo",
    image: "/images/petra/site-works/saha-08.webp",
    aspect: "portrait",
    caption: "Haier MRV5 dış ünitelerinde boru montajı ve lehim işlemi.",
    projectLabel: null,
  },
  {
    id: "saha-14",
    type: "photo",
    image: "/images/petra/site-works/saha-14.webp",
    aspect: "portrait",
    caption: "Mitsubishi Heavy dış ünite bağlantı ve boru tesisatı.",
    projectLabel: null,
  },
  {
    id: "saha-video-03",
    type: "video",
    image: "/images/petra/site-works/saha-video-03-poster.webp",
    videoSrc: "/videos/petra/site-works/saha-video-03.mp4",
    aspect: "portrait",
    caption: "Tavan tipi kaset klima bakım/kurulum çalışması.",
    projectLabel: null,
  },
  {
    id: "saha-10",
    type: "photo",
    image: "/images/petra/site-works/saha-10.webp",
    aspect: "landscape",
    caption: "Çok katlı ticari bina cephesinde Haier MRV5 dış ünite sırası.",
    projectLabel: null,
  },
];

/** Tam galeri (`/projeler`) — homepage'deki 5 öğe + geri kalan tüm gerçek saha görselleri/videoları. */
export const petraSiteWorksFull: PetraSiteWork[] = [
  ...petraSiteWorksFeatured,
  {
    id: "saha-01",
    type: "photo",
    image: "/images/petra/site-works/saha-01.webp",
    aspect: "landscape",
    caption: "Tavan tipi kaset klima montajı.",
    projectLabel: null,
  },
  {
    id: "saha-video-02",
    type: "video",
    image: "/images/petra/site-works/saha-video-02-poster.webp",
    videoSrc: "/videos/petra/site-works/saha-video-02.mp4",
    aspect: "landscape",
    caption: "Ticari bina cephesi ve VRF dış ünite sırası (video).",
    projectLabel: null,
  },
  {
    id: "saha-video-01",
    type: "video",
    image: "/images/petra/site-works/saha-video-01-poster.webp",
    videoSrc: "/videos/petra/site-works/saha-video-01.mp4",
    aspect: "portrait",
    caption: "Yalıtımlı tesisat boruları — saha detayı (video).",
    projectLabel: null,
  },
  {
    id: "saha-07",
    type: "photo",
    image: "/images/petra/site-works/saha-07.webp",
    aspect: "landscape",
    caption: "Haier MRV5 dış ünite sırası — toplu ticari bina kurulumu.",
    projectLabel: null,
  },
  {
    id: "saha-05",
    type: "photo",
    image: "/images/petra/site-works/saha-05.webp",
    aspect: "portrait",
    caption: "Haier MRV5 dış ünite sırası.",
    projectLabel: null,
  },
  {
    id: "saha-06",
    type: "photo",
    image: "/images/petra/site-works/saha-06.webp",
    aspect: "portrait",
    caption: "Haier MRV5 dış ünite kurulumu.",
    projectLabel: null,
  },
  {
    id: "saha-04",
    type: "photo",
    image: "/images/petra/site-works/saha-04.webp",
    aspect: "portrait",
    caption: "Tavan tipi kaset klima montajı.",
    projectLabel: null,
  },
  {
    id: "saha-02",
    type: "photo",
    image: "/images/petra/site-works/saha-02.webp",
    aspect: "portrait",
    caption: "Kanal tipi klima ünitesi montajı.",
    projectLabel: null,
  },
  {
    id: "saha-03",
    type: "photo",
    image: "/images/petra/site-works/saha-03.webp",
    aspect: "portrait",
    caption: "İnşaat aşamasında bir villa projesi.",
    projectLabel: null,
  },
  {
    id: "saha-15",
    type: "photo",
    image: "/images/petra/site-works/saha-15.webp",
    aspect: "portrait",
    caption: "Gree dış ünite bakım/servis çalışması.",
    projectLabel: null,
  },
  {
    id: "saha-12",
    type: "photo",
    image: "/images/petra/site-works/saha-12.webp",
    aspect: "portrait",
    caption: "Tavan tipi kaset klima elektrik bağlantısı.",
    projectLabel: null,
  },
  {
    id: "saha-13",
    type: "photo",
    image: "/images/petra/site-works/saha-13.webp",
    aspect: "portrait",
    caption: "Dış ünite teslimat ve montaj öncesi hazırlık.",
    projectLabel: null,
  },
  {
    id: "saha-11",
    type: "photo",
    image: "/images/petra/site-works/saha-11.webp",
    aspect: "portrait",
    caption: "Tesisat kablolama çalışması — tavan arası.",
    projectLabel: null,
  },
];
