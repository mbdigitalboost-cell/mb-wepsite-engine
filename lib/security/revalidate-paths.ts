import "server-only";

/**
 * Faz 6 — `/api/revalidate` strict path allowlist.
 *
 * Sadece repoda BUGÜN gerçekten var olan ve `triggerRemoteRevalidation`
 * çağıranlarının (content/[type]/actions.ts, seo/actions.ts,
 * content/hero/actions.ts, tracking/actions.ts, navigation/actions.ts,
 * settings/actions.ts) fiilen gönderdiği path'leri kapsar — kaynağı
 * `lib/seo/route-registry.ts`'in STATIC_SEO_ROUTES'u VE
 * `content/[type]/actions.ts`'in PUBLIC_LIST_PATHS'i/
 * PUBLIC_DETAIL_PATH_TEMPLATES'i. `/sss` gibi repoda dedike bir route'u
 * OLMAYAN bir path buraya BİLEREK eklenmedi (bkz. route-registry.ts'in
 * kendi "KAPSAM DIŞI" notu).
 */

const STATIC_ALLOWED_PATHS: ReadonlySet<string> = new Set([
  "/",
  "/hakkimizda",
  "/iletisim",
  "/cozumler",
  "/hizmetler",
  "/projeler",
  "/kampanyalar",
  "/referanslar",
  "/btu-hesaplama",
]);

/**
 * Tek dinamik detay hedefi: `/cozumler/[slug]` (solutions). Slug deseni
 * `lib/validation/content.ts`'teki `slugRegex` ile BİREBİR aynı olmak
 * ZORUNDA — aksi halde admin'in kaydettiği geçerli bir slug burada
 * reddedilebilir (yanlış negatif) ya da izin verilen desen gereğinden
 * geniş olabilir (güvenlik açığı).
 */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 150;
const DYNAMIC_PREFIX = "/cozumler/";

export const MAX_REVALIDATE_PATHS = 20;
export const MAX_REVALIDATE_PATH_LENGTH = 200;

/**
 * Tek path için strict allowlist kontrolü. Protokol/şema (`://`), `//`
 * ile başlama, path traversal (`..`), query/hash (`?`/`#`), yüzde-encode
 * (`%`), ters slash ve boşluk/kontrol karakteri içeren HER path
 * reddedilir — bilinen gerçek path'lerin hiçbirinde bunlara ihtiyaç yok,
 * yani bu kontroller mevcut hiçbir çağıranı etkilemez.
 */
export function isAllowedRevalidatePath(path: string): boolean {
  if (typeof path !== "string") return false;
  if (path.length === 0 || path.length > MAX_REVALIDATE_PATH_LENGTH) return false;
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (/[\s?#%\\]/.test(path)) return false;
  if (path.includes("..")) return false;
  if (path.includes("://")) return false;

  if (STATIC_ALLOWED_PATHS.has(path)) return true;

  if (path.startsWith(DYNAMIC_PREFIX)) {
    const slug = path.slice(DYNAMIC_PREFIX.length);
    return slug.length > 0 && slug.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(slug);
  }

  return false;
}
