import { ImageResponse } from "next/og";
import sharp from "sharp";

/**
 * Faz 29 Kısım C — paylaşım görseli (WhatsApp / Instagram / Facebook / X
 * önizlemesi), 1200×630. Ürün görselleri PRIVATE bucket'ta ve imzalı adresler
 * ~1 saatte geçersiz olduğu için og:image'a doğrudan konamıyor; bunun yerine
 * mağazanın kendi domaininden sabit bir adres (/paylasim/...) sunucu tarafında
 * bu görseli üretir.
 *
 * İçerik YALNIZ gerçek veri: mağaza logosu, ürün/kategori adı, gerçek fiyat
 * (indirim varsa gerçek eski fiyat), domain. Yıldız, "son N ürün", teslim
 * süresi gibi uydurma etiket YOK.
 *
 * Fontlar ve public/ görselleri isteğin kendi origin'inden okunur (Google
 * Fonts'a bağımlılık yok — build iki kez orada düştü). Poppins latin +
 * latin-ext (Türkçe ı/ş/ğ/İ) — satori woff2 okumadığı için .woff.
 */

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const;

const BG = "#0A0A0A";
const PANEL = "#171717";
const TEXT = "#F5F5F5";
const MUTED = "#A3A3A3";
const ACCENT = "#D95F00";

type FontWeight = 400 | 700;
const FONT_FILES: Array<{ file: string; weight: FontWeight }> = [
  { file: "poppins-latin-400.woff", weight: 400 },
  { file: "poppins-latin-ext-400.woff", weight: 400 },
  { file: "poppins-latin-700.woff", weight: 700 },
  { file: "poppins-latin-ext-700.woff", weight: 700 },
];

async function loadFonts(origin: string) {
  const loaded = await Promise.all(
    FONT_FILES.map(async ({ file, weight }) => {
      try {
        const response = await fetch(`${origin}/fonts/og/${file}`, { cache: "force-cache" });
        if (!response.ok) return null;
        return { name: "Poppins", data: await response.arrayBuffer(), weight, style: "normal" as const };
      } catch {
        return null;
      }
    }),
  );
  return loaded.filter((font): font is NonNullable<typeof font> => font !== null);
}

/** Uzak/yerel bir görseli data URI olarak getirir; yalnız JPEG/PNG (satori'nin güvenle okuduğu biçimler). Olmazsa null → görselsiz tasarım. */
export async function fetchImageAsDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (type !== "image/jpeg" && type !== "image/png") return null;
    const base64 = Buffer.from(await response.arrayBuffer()).toString("base64");
    return `data:${type};base64,${base64}`;
  } catch {
    return null;
  }
}

export interface ShareImageInput {
  origin: string;
  /** Örn. "t46store.com" */
  domain: string;
  logo: string | null;
  storeName: string;
  title: string;
  /** Sol taraftaki kare fotoğraf (ürün) ya da geniş arka plan (kategori/mağaza). */
  photo: string | null;
  photoLayout: "square" | "background";
  price?: { current: string; previous?: string | null } | null;
}

/** Cache: 1 saat CDN, 1 gün bayat sunum. Fiyat/ad değişince sayfa metadata'sı adrese yeni bir ?v= koyar. */
export const SHARE_IMAGE_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
};

export async function renderShareImage(input: ShareImageInput): Promise<Response> {
  const fonts = await loadFonts(input.origin);
  const title = input.title.length > 90 ? `${input.title.slice(0, 87)}…` : input.title;

  const brandRow = (
    <div style={{ display: "flex", alignItems: "center" }}>
      {input.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={input.logo} alt="" height={56} style={{ height: 56, objectFit: "contain" }} />
      ) : (
        <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: TEXT }}>{input.storeName}</div>
      )}
    </div>
  );

  const footer = (
    <div style={{ display: "flex", alignItems: "center", fontSize: 26, color: MUTED }}>
      <div style={{ display: "flex", width: 12, height: 12, borderRadius: 6, background: ACCENT, marginRight: 14 }} />
      {input.domain}
    </div>
  );

  const priceBlock = input.price ? (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", marginTop: 28 }}>
      <div style={{ display: "flex", fontSize: 50, fontWeight: 700, color: ACCENT, whiteSpace: "nowrap" }}>{input.price.current}</div>
      {input.price.previous ? (
        <div style={{ display: "flex", fontSize: 28, color: MUTED, textDecoration: "line-through", marginLeft: 20, whiteSpace: "nowrap" }}>
          {input.price.previous}
        </div>
      ) : null}
    </div>
  ) : null;

  const body =
    input.photoLayout === "square" ? (
      <div style={{ display: "flex", width: "100%", height: "100%", background: BG }}>
        <div style={{ display: "flex", width: 630, height: 630, background: PANEL, alignItems: "center", justifyContent: "center" }}>
          {input.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={input.photo} alt="" width={630} height={630} style={{ width: 630, height: 630, objectFit: "cover" }} />
          ) : (
            <div style={{ display: "flex", fontSize: 40, color: MUTED }}>{input.storeName}</div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "56px 56px 48px" }}>
          {brandRow}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: TEXT, lineHeight: 1.2 }}>{title}</div>
            {priceBlock}
          </div>
          {footer}
        </div>
      </div>
    ) : (
      <div style={{ display: "flex", width: "100%", height: "100%", background: BG, position: "relative" }}>
        {input.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={input.photo}
            alt=""
            width={1200}
            height={630}
            style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            background: "linear-gradient(90deg, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.75) 55%, rgba(10,10,10,0.2) 100%)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 760, height: 630, padding: "56px 64px 48px", position: "relative" }}>
          {brandRow}
          <div style={{ display: "flex", fontSize: 60, fontWeight: 700, color: TEXT, lineHeight: 1.15 }}>{title}</div>
          {footer}
        </div>
      </div>
    );

  const png = new ImageResponse(body, {
    ...SHARE_IMAGE_SIZE,
    fonts: fonts.length > 0 ? fonts : undefined,
  });

  // ImageResponse yalnız PNG üretir; fotoğraflı bir PNG ~850 KB çıkıyor.
  // WhatsApp önizlemesi ~300 KB üstünde güvenilir değil → JPEG'e çevrilir
  // (sharp, next'in de kullandığı sürüm). Çevrilemezse PNG aynen gider.
  const pngBuffer = Buffer.from(await png.arrayBuffer());
  try {
    const jpeg = await sharp(pngBuffer).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    return new Response(new Uint8Array(jpeg), {
      headers: { "Content-Type": "image/jpeg", "Content-Length": String(jpeg.length), ...SHARE_IMAGE_CACHE_HEADERS },
    });
  } catch (error) {
    console.error("[og] jpeg conversion failed, serving png:", error instanceof Error ? error.message : error);
    return new Response(new Uint8Array(pngBuffer), { headers: { "Content-Type": "image/png", ...SHARE_IMAGE_CACHE_HEADERS } });
  }
}

/** Mağazanın logosu: profil (DB) → repo yedeği; göreli adresler origin'e bağlanır. */
export function absoluteAsset(origin: string, path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
}
