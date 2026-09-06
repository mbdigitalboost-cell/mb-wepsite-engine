/**
 * Faz 6F-4A-3.2 — sabit, kod-içi statik sayfa SEO registry'si. `pages`
 * tablosu bilinçli olarak aktifleştirilmediği için (bkz.
 * claude/FAZ6F4A_PAGE_LEVEL_SEO_ARCHITECTURE.md) bu liste DB'den değil,
 * bu dosyadan geliyor — `lib/media/constants.ts`'in `MEDIA_FOLDERS`'ı ve
 * `components/navigation/customer-cms-nav.tsx`'in `CONTENT_LINKS`'i ile
 * AYNI, bu codebase'in zaten kullandığı desen.
 *
 * Her `key`, `seo_settings.route_key` kolonuna YAZILAN değerle VE
 * `app/(public)/<key>/page.tsx` route segmentiyle birebir aynı olmalı —
 * bu, admin'in seçtiği sayfa ile public route arasındaki TEK, dolaylı
 * olmayan eşleme mekanizması.
 *
 * KAPSAM DIŞI (bilinçli, Faz 6F-4A-3.2 pre-flight'ta gerekçelendirildi):
 *   - "/" (homepage) — BURAYA EKLENMEZ, site-wide zaten `route_key IS NULL`
 *     ile temsil ediliyor, ayrı bir "/" kaydı ikinci, çakışan bir
 *     site-wide mekanizması yaratır.
 *   - "sss" — `/sss` bugün repoda gerçek bir route DEĞİL (SSS sadece ana
 *     sayfada bir bölüm, dedike sayfası yok) — eklenirse admin'in girdiği
 *     title/description'ı okuyacak hiçbir generateMetadata() olmaz,
 *     sessizce etkisiz/yanıltıcı bir seçenek olurdu. Gerçek bir `/sss`
 *     route'u eklendiğinde bu listeye eklenmeli.
 *   - Dynamic route'lar (`/cozumler/[slug]` vb.) — kendi content
 *     satırlarının alanlarını kullanıyor, route_key'e hiç girmiyor.
 *   - Legal sayfalar (KVKK/Gizlilik/Çerez/Kullanım Şartları) — içerikleri
 *     zaten hardcoded (Faz 6F'de DEFER edildi), bu FAZ'ın onaylanan
 *     kapsamına dahil değil.
 */

export interface StaticSeoRoute {
  /** `seo_settings.route_key` değeri VE `app/(public)/<key>` segmenti. */
  key: string;
  /** Admin dropdown'ında gösterilen etiket. */
  label: string;
  /** Gerçek public path — revalidation hedefini hesaplamak için. */
  path: string;
}

export const STATIC_SEO_ROUTES: readonly StaticSeoRoute[] = [
  { key: "hakkimizda", label: "Hakkımızda", path: "/hakkimizda" },
  { key: "cozumler", label: "Çözümler", path: "/cozumler" },
  { key: "hizmetler", label: "Hizmetler", path: "/hizmetler" },
  { key: "projeler", label: "Projeler", path: "/projeler" },
  { key: "kampanyalar", label: "Kampanyalar", path: "/kampanyalar" },
  { key: "referanslar", label: "Referanslar", path: "/referanslar" },
  { key: "iletisim", label: "İletişim", path: "/iletisim" },
  { key: "btu-hesaplama", label: "BTU Hesaplama", path: "/btu-hesaplama" },
];

const STATIC_SEO_ROUTE_KEYS = STATIC_SEO_ROUTES.map((route) => route.key);

export function isStaticSeoRouteKey(value: string | null | undefined): boolean {
  return typeof value === "string" && STATIC_SEO_ROUTE_KEYS.includes(value);
}

export function getStaticSeoRoutePath(key: string): string | null {
  return STATIC_SEO_ROUTES.find((route) => route.key === key)?.path ?? null;
}
