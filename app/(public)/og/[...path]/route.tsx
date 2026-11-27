import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { petraTheme } from "@/lib/theme/petra-theme";
import { resolvePetraSolutions } from "@/lib/cms/petra/resolve-solutions";
import {
  PETRA_SHARE_IMAGE_HEIGHT,
  PETRA_SHARE_IMAGE_WIDTH,
  resolvePetraShareImageTarget,
} from "@/lib/seo/petra-share-image";

/**
 * Petra SEO iyileştirme — paylaşım görseli (WhatsApp / Instagram /
 * Facebook / X önizlemesi). 1200×630 PNG, Petra'nın kendi alan adından:
 *   /og/ana-sayfa, /og/hizmetler, /og/cozumler/vrf-sistemleri …
 * Hangi sayfanın hangi adresi kullandığı: lib/seo/petra-share-image.ts.
 *
 * NEDEN ROTA (statik dosya ya da opengraph-image dosya kuralı değil):
 *  - Çözüm adları CMS'ten gelir; yeni/yeniden adlandırılan bir çözümün
 *    görseli kod değişmeden doğru çıkar. 19 ayrı statik PNG elle
 *    güncellenmek zorunda kalırdı.
 *  - Bu sitede her sayfa kendi `openGraph` nesnesini verir; Next'te bu,
 *    üst segmentin opengraph-image dosyasını devre dışı bırakır. Görsel
 *    adresini metadata'ya açıkça yazmak (CMS görseli önceliğiyle) tek
 *    öngörülebilir yol.
 *
 * İÇERİK — uydurma yok: sitedeki marka işareti (app/icon.png, favicon ile
 * aynı dosya), başlıktaki "PETRA / MÜHENDİSLİK" yazısı (site başlığındaki
 * logo yazısının aynısı), sayfa başlığı ve alan adı. Fotoğraf, rozet,
 * kampanya ya da puan YOK. Renkler lib/theme/petra-theme.ts'ten.
 *
 * FONT — derleme ya da çalışma anında Google Fonts'a GİDİLMEZ. Sitenin
 * kendi Poppins dosyaları (public/fonts/petra, .woff — satori woff2
 * okuyamaz) diskten okunur. Türkçe: ş ğ İ latin-ext dosyasında, ı ç ö ü
 * latin'de. İki dosya AYRI aile adıyla verilir ve yığın "Poppins,
 * PoppinsExt" yazılır: satori aynı adlı iki dosyadan yalnız birini seçer,
 * ayrı adlarla harf harf doğru dosyaya düşer.
 *
 * Bilinmeyen adres 404: başlık yalnız sabit listeden ya da gerçek bir
 * çözümden gelir; adresle görsele serbest metin yazdırılamaz.
 */

export const runtime = "nodejs";

interface ShareImageAssets {
  fonts: Array<{ name: string; data: Buffer; weight: 500 | 600; style: "normal" }>;
  markDataUri: string;
}

let assetsPromise: Promise<ShareImageAssets> | null = null;

// Yollar tek tek, sabit metin olarak yazılı: Next'in dosya izleme adımı
// (output file tracing) bu kalıbı görüp dosyaları sunucu paketine ekler.
async function readAssets(): Promise<ShareImageAssets> {
  const [latin500, ext500, latin600, ext600, mark] = await Promise.all([
    readFile(path.join(process.cwd(), "public/fonts/petra/poppins-latin-500.woff")),
    readFile(path.join(process.cwd(), "public/fonts/petra/poppins-latin-ext-500.woff")),
    readFile(path.join(process.cwd(), "public/fonts/petra/poppins-latin-600.woff")),
    readFile(path.join(process.cwd(), "public/fonts/petra/poppins-latin-ext-600.woff")),
    readFile(path.join(process.cwd(), "app/icon.png")),
  ]);
  return {
    fonts: [
      { name: "Poppins", data: latin500, weight: 500, style: "normal" },
      { name: "PoppinsExt", data: ext500, weight: 500, style: "normal" },
      { name: "Poppins", data: latin600, weight: 600, style: "normal" },
      { name: "PoppinsExt", data: ext600, weight: 600, style: "normal" },
    ],
    markDataUri: `data:image/png;base64,${mark.toString("base64")}`,
  };
}

/** Dosyalar süreç başına bir kez okunur; okuma hata verirse sonraki istek yeniden dener. */
function loadAssets(): Promise<ShareImageAssets> {
  if (!assetsPromise) {
    assetsPromise = readAssets().catch((error: unknown) => {
      assetsPromise = null;
      throw error;
    });
  }
  return assetsPromise;
}

async function resolveTitle(segments: string[]): Promise<string | null> {
  const target = resolvePetraShareImageTarget(segments);
  if (!target) return null;
  if (target.kind === "static") return target.title;
  const solutions = await resolvePetraSolutions();
  return solutions.find((solution) => solution.slug === target.slug)?.title ?? null;
}

/** Uzun başlık (ör. CMS'ten gelen uzun bir çözüm adı) taşmasın diye kademeli punto. */
function titleFontSize(title: string): number {
  if (title.length <= 22) return 92;
  if (title.length <= 40) return 76;
  if (title.length <= 64) return 60;
  return 48;
}

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await context.params;
  const title = await resolveTitle(segments);
  if (!title) return new Response("Not found", { status: 404 });

  const { fonts, markDataUri } = await loadAssets();
  const { colors } = petraTheme;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: colors.background,
          color: colors.foreground,
          fontFamily: "Poppins, PoppinsExt",
          padding: "64px 76px 56px 76px",
          borderTop: `10px solid ${colors.primary}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- next/og (satori) yalnız düz <img> çizer */}
          <img src={markDataUri} width={84} height={84} alt="" style={{ borderRadius: 14 }} />
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 24 }}>
            <div style={{ fontSize: 40, fontWeight: 600, lineHeight: 1, letterSpacing: -0.5 }}>PETRA</div>
            <div style={{ fontSize: 17, fontWeight: 500, lineHeight: 1, letterSpacing: 7, marginTop: 10, color: colors.muted }}>
              MÜHENDİSLİK
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ width: 96, height: 6, backgroundColor: colors.primary, marginBottom: 30 }} />
          <div
            style={{
              display: "flex",
              fontSize: titleFontSize(title),
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: -1.5,
              maxWidth: 1040,
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            borderTop: "1px solid rgba(255, 255, 255, 0.14)",
            paddingTop: 26,
            fontSize: 28,
            fontWeight: 500,
            color: colors.muted,
          }}
        >
          petramuhendislik.com
        </div>
      </div>
    ),
    {
      width: PETRA_SHARE_IMAGE_WIDTH,
      height: PETRA_SHARE_IMAGE_HEIGHT,
      fonts,
      headers: {
        // next/og varsayılanı 1 yıl "immutable"; adres sabit, çözüm adı CMS'ten
        // değişebildiği için kısa tutuldu (CDN 1 gün, arkada tazeleme).
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
