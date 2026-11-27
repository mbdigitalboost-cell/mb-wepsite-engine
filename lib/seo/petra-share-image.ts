import type { Metadata } from "next";

/**
 * Petra SEO iyileştirme — paylaşım görseli (og:image / twitter:image).
 *
 * Bu dosya SAFtır (çalışma zamanı import'u yok): metadata birleştirme
 * kuralı ve görsel adresleri burada, testler de doğrudan bunu çalıştırır.
 * Görselin kendisini app/(public)/og/[...path]/route.tsx üretir.
 *
 * GÖRSEL ÖNCELİĞİ (her sayfa için ayrı ayrı):
 *   1. O sayfaya özel CMS görseli (statik sayfada `route_key`'li SEO
 *      satırının og_image'ı; çözüm sayfasında çözümün seo_og_image'ı),
 *   2. site geneli CMS görseli (`seo_settings.og_image`, route_key'siz satır),
 *   3. buradaki varsayılan: Petra'nın kendi alan adından sunulan, sayfa
 *      başlığını taşıyan 1200×630 görsel.
 * CMS'e hiçbir şey yazılmaz; bu yalnız okuma sırasıdır.
 *
 * Adresler GÖRECELİ döner ("/og/..."); mutlak hâle Next'in `metadataBase`'i
 * (app/layout.tsx → NEXT_PUBLIC_SITE_URL) çevirir — canonical ile aynı
 * mekanizma, alan adı burada elle yazılmaz.
 */

export const PETRA_SHARE_IMAGE_WIDTH = 1200;
export const PETRA_SHARE_IMAGE_HEIGHT = 630;
export const PETRA_SHARE_IMAGE_BASE_PATH = "/og";
export const PETRA_SHARE_IMAGE_HOME_KEY = "ana-sayfa";
export const PETRA_SHARE_IMAGE_SOLUTIONS_SEGMENT = "cozumler";

/**
 * Görselin üstünde yazan başlık — sayfaların kendi (yayındaki) başlıkları.
 * Çözüm sayfaları burada YOK: başlıkları çözümün kendi adından gelir
 * (CMS'ten ya da statik listeden), bkz. resolvePetraShareImageTarget.
 */
export const PETRA_SHARE_IMAGE_STATIC_TITLES: Readonly<Record<string, string>> = {
  [PETRA_SHARE_IMAGE_HOME_KEY]: "Kahramanmaraş İklimlendirme Çözümleri",
  hakkimizda: "Hakkımızda",
  cozumler: "Çözümler",
  hizmetler: "Hizmetler",
  projeler: "Projeler",
  kampanyalar: "Kampanyalar",
  referanslar: "Referanslarımız",
  iletisim: "İletişim",
  "btu-hesaplama": "Klima BTU Hesaplama",
  "kvkk-aydinlatma-metni": "KVKK Aydınlatma Metni",
  "gizlilik-politikasi": "Gizlilik Politikası",
  "cerez-politikasi": "Çerez Politikası",
  "kullanim-sartlari": "Kullanım Şartları",
};

/** Sayfa yolu → o sayfanın varsayılan paylaşım görselinin (göreceli) adresi. "/" → "/og/ana-sayfa". */
export function petraShareImagePath(pagePath: string): string {
  const clean = pagePath.replace(/^\/+|\/+$/g, "");
  return `${PETRA_SHARE_IMAGE_BASE_PATH}/${clean === "" ? PETRA_SHARE_IMAGE_HOME_KEY : clean}`;
}

export type PetraShareImageTarget = { kind: "static"; title: string } | { kind: "solution"; slug: string };

/**
 * Görsel rotasının yol parçaları → ne çizilecek. Bilinmeyen her şey null
 * (rota 404 döner): başlık yalnız sabit listeden ya da gerçek bir
 * çözümden gelir, adresle serbest metin yazdırılamaz.
 */
export function resolvePetraShareImageTarget(segments: readonly string[]): PetraShareImageTarget | null {
  if (segments.length === 1) {
    const key = segments[0];
    return Object.prototype.hasOwnProperty.call(PETRA_SHARE_IMAGE_STATIC_TITLES, key)
      ? { kind: "static", title: PETRA_SHARE_IMAGE_STATIC_TITLES[key] }
      : null;
  }
  if (segments.length === 2 && segments[0] === PETRA_SHARE_IMAGE_SOLUTIONS_SEGMENT && segments[1] !== "") {
    return { kind: "solution", slug: segments[1] };
  }
  return null;
}

function hasImages(images: unknown): boolean {
  return Array.isArray(images) ? images.length > 0 : Boolean(images);
}

export interface PetraShareImageOptions {
  /** Sayfanın site içi yolu, ör. "/hizmetler" ya da "/cozumler/vrf-sistemleri". */
  pagePath: string;
  /** og:site_name (sayfa kendi openGraph'ında vermediyse). */
  siteName: string;
  /** Site geneli CMS görseli (varsa). */
  siteWideOgImage?: string | null;
}

/**
 * Sayfanın metadata'sına paylaşım görselini ekler (yukarıdaki öncelikle)
 * ve twitter kartını büyük görselli yapar.
 *
 * Next'te bir sayfanın `openGraph`/`twitter` nesnesi üst layout'unkinin
 * YERİNE geçer (alan alan birleşmez). Bu yüzden:
 *  - siteName/locale/type burada da verilir (layout'takiyle aynı değerler),
 *  - twitter'da başlık/açıklama YAZILMAZ: Next bunları sayfanın kendi
 *    başlık ve açıklamasından doldurur → og:description ve
 *    twitter:description sayfanın meta description'ıyla aynı olur.
 *    (Önceden statik sayfalar twitter açıklamasını layout'un site geneli
 *    varsayılanından alıyordu.) Sayfa twitter başlık/açıklamasını kendi
 *    veriyorsa (ana sayfa, çözüm sayfaları) o değerler korunur.
 */
export function applyPetraShareImage(metadata: Metadata, options: PetraShareImageOptions): Metadata {
  const openGraph = (metadata.openGraph ?? {}) as Record<string, unknown>;
  const images = hasImages(openGraph.images)
    ? openGraph.images
    : options.siteWideOgImage
      ? [{ url: options.siteWideOgImage }]
      : [
          {
            url: petraShareImagePath(options.pagePath),
            width: PETRA_SHARE_IMAGE_WIDTH,
            height: PETRA_SHARE_IMAGE_HEIGHT,
            type: "image/png",
          },
        ];

  return {
    ...metadata,
    openGraph: {
      siteName: options.siteName,
      locale: "tr_TR",
      type: "website",
      ...openGraph,
      images,
    } as Metadata["openGraph"],
    twitter: {
      ...((metadata.twitter ?? {}) as Record<string, unknown>),
      card: "summary_large_image",
      images,
    } as Metadata["twitter"],
  };
}
