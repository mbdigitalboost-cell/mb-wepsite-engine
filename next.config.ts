import type { NextConfig } from "next";

// Güvenlik sertleştirmesi (2026-08-22): temel, düşük riskli HTTP güvenlik
// header'ları. Bilinçli olarak bir Content-Security-Policy EKLEMEDİM —
// bu sayfa `dangerouslySetInnerHTML` ile JSON-LD `<script>` etiketleri
// (bkz. app/(public)/page.tsx) ve Next'in kendi hydration/inline
// script'lerini kullanıyor; bunları kırmadan doğru bir CSP kurmak
// (nonce tabanlı bir middleware gerektirir) ayrı, dikkatli test
// edilmesi gereken bir iştir — burada uydurma/test edilmemiş bir CSP
// eklemek yerine bu maddeyi açık bırakmayı tercih ettim.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Faz 4E: `next/image` varsayılan olarak hiçbir harici host'a izin
  // vermez — bu blok yokken, admin'den yüklenen ve customer Supabase
  // Storage'ında yaşayan HER görsel (ör. Ürün Yelpazesi kartları)
  // optimizer'dan 400 dönüyordu (ham dosyanın kendisi sağlamdı, sorun
  // buradaydı). Wildcard `*.supabase.co` seçildi, tek bir müşterinin
  // (Petra'nın `wahbjfhvizalenyxjywb`) host'unu sabitlemek yerine —
  // platform mimarisi her müşteriye ayrı bir Supabase projesi
  // (`<proje-ref>.supabase.co`) veriyor (bkz. lib/cms/connection.ts),
  // tek host'u yazmak bir sonraki müşteride aynı hataya düşerdi.
  // `pathname`, Supabase Storage'ın public URL şemasıyla sınırlı —
  // aynı host'taki başka bir path'e izin vermiyor.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Faz 4F: Server Actions'ın varsayılan istek gövdesi limiti 1MB —
  // `lib/media/upload-customer-image.ts`/`MAX_MEDIA_FILE_SIZE_BYTES`
  // (lib/media/constants.ts) admin arayüzünde "en fazla 5 MB" diyor ve
  // `ImageUploadField` gerçek bir `File`'ı `FormData` ile doğrudan bir
  // Server Action'a (`uploadInlineImageAction`) gönderiyor (base64 YOK,
  // encoding şişmesi yok — gerçek multipart). Next'in kendi belgesi
  // (node_modules/next/dist/docs/.../serverActions.md — bu depoya kurulu
  // 16.3.3 sürümünden, tahmin değil): "multipart/form-data boundary/header
  // ek yükü için 10–20 KB makul bir kural" diyor. Hesap: 5 MiB
  // (5.242.880 bayt, uygulamanın kendi sınırı) + 20 KB ek yük ≈ 5,02 MB
  // minimum gerekli — "6mb" bu minimumun üzerinde rahat bir pay bırakıyor
  // (string birimi hangi tabanla yorumlanırsa yorumlansın, 1000 ya da 1024
  // tabanlı, yeterli). Next 16.3.3'te bu ayar hâlâ `experimental` altında
  // (config-shared.d.ts: `ExperimentalConfig.serverActions.bodySizeLimit`
  // — kaynak dosyadan doğrulandı, tahmin edilmedi).
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
