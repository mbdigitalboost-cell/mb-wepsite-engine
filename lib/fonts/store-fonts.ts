import type React from "react";
import localFont from "next/font/local";

/**
 * Mağaza (storefront) fontları — self-hosted, next/font/local.
 *
 * Neden: next/font/google fontları DERLEME anında Google Fonts'tan indirir;
 * indirme düşerse derleme düşer (t46store.com üretim derlemesi iki kez bu
 * yüzden ERROR oldu — "module-not-found ... oswald_*.module.css"). Dosyalar
 * artık repoda (lib/fonts/store/, kaynak ve lisans: lib/fonts/store/README.md),
 * derleme ağa bağlı değil.
 *
 * Google'ın CSS'iyle aynı bölünme: her font için latin ve latin-ext
 * (Türkçe ş/ğ/İ/Ş/Ğ latin-ext'te; ı latin'de), her biri kendi unicode-range'iyle
 * — tarayıcı yalnız gereken dosyayı indirir. declarations bir çağrının TÜM
 * dosyalarına uygulandığı için her font iki localFont çağrısıdır; ikisi
 * aşağıdaki fontStack ile tek yığında birleşir. (font-family'yi declarations
 * ile ortak bir ada zorlamak İŞE YARAMAZ: Turbopack @font-face'e o adı yazar
 * ama sınıf/değişkene JS değişken adını koyar — font hiç uygulanmaz.)
 * latin önceden yüklenir (preload), latin-ext yalnız gerektiğinde.
 *
 * next/font seçenekleri derleme anında okunur: değerler LİTERAL olmalı
 * (sabit/değişken kullanılamaz), bu yüzden aralıklar her çağrıda tekrar yazılı.
 *
 * Oswald ve JetBrains Mono değişken (variable) fontlar: tek dosya tüm
 * kalınlıkları kapsar (Google da aynı dosyayı veriyordu).
 */

// ---- Oswald (başlık / display) — 500–700 ----
const oswaldLatin = localFont({
  src: [{ path: "./store/oswald-latin.woff2", weight: "500 700", style: "normal" }],
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
  variable: "--font-store-display-latin",
  display: "swap",
});
const oswaldLatinExt = localFont({
  src: [{ path: "./store/oswald-latin-ext.woff2", weight: "500 700", style: "normal" }],
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF",
    },
  ],
  variable: "--font-store-display-ext",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

// ---- Barlow (gövde metni) — 400/500/600/700 ----
const barlowLatin = localFont({
  src: [
    { path: "./store/barlow-400-latin.woff2", weight: "400", style: "normal" },
    { path: "./store/barlow-500-latin.woff2", weight: "500", style: "normal" },
    { path: "./store/barlow-600-latin.woff2", weight: "600", style: "normal" },
    { path: "./store/barlow-700-latin.woff2", weight: "700", style: "normal" },
  ],
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
  variable: "--font-store-body-latin",
  display: "swap",
});
const barlowLatinExt = localFont({
  src: [
    { path: "./store/barlow-400-latin-ext.woff2", weight: "400", style: "normal" },
    { path: "./store/barlow-500-latin-ext.woff2", weight: "500", style: "normal" },
    { path: "./store/barlow-600-latin-ext.woff2", weight: "600", style: "normal" },
    { path: "./store/barlow-700-latin-ext.woff2", weight: "700", style: "normal" },
  ],
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF",
    },
  ],
  variable: "--font-store-body-ext",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

// ---- JetBrains Mono (fiyat / etiket) — 500–600 ----
const jetbrainsMonoLatin = localFont({
  src: [{ path: "./store/jetbrains-mono-latin.woff2", weight: "500 600", style: "normal" }],
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
  variable: "--font-store-mono-latin",
  display: "swap",
});
const jetbrainsMonoLatinExt = localFont({
  src: [{ path: "./store/jetbrains-mono-latin-ext.woff2", weight: "500 600", style: "normal" }],
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF",
    },
  ],
  variable: "--font-store-mono-ext",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

// ---- Space Grotesk (hesap / sipariş başlıkları) — 700 ----
const spaceGroteskLatin = localFont({
  src: [{ path: "./store/space-grotesk-700-latin.woff2", weight: "700", style: "normal" }],
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
  variable: "--font-store-grotesk-latin",
  display: "swap",
  // Yalnız hesap/sipariş sayfalarında kullanılıyor; modül layout'ta yüklendiği
  // için preload açık kalsa HER mağaza sayfası bu dosyayı önceden indirirdi.
  preload: false,
});
const spaceGroteskLatinExt = localFont({
  src: [{ path: "./store/space-grotesk-700-latin-ext.woff2", weight: "700", style: "normal" }],
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF",
    },
  ],
  variable: "--font-store-grotesk-ext",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

/** "'a', 'b'" -> ["'a'", "'b'"] (font aile adlarında virgül yok). */
function families(fontFamily: string): string[] {
  return fontFamily
    .split(",")
    .map((family) => family.trim())
    .filter(Boolean);
}

/**
 * Yığın: latin yüzü, latin-ext yüzü, EN SONDA boyutu eşlenmiş yedek (Arial).
 * Yedek latin-ext'ten ÖNCE gelirse tarayıcı ş/ğ/İ'yi Arial'le çizer; bu
 * yüzden next/font'un verdiği sıra (latin, latin Fallback) burada açılıp
 * latin-ext araya alınır. Adlar next/font'un ürettiği adlardır (style.fontFamily),
 * elle yazılmaz — Next sürümü ad üretimini değiştirse de doğru kalır.
 */
function fontStack(latin: { style: { fontFamily: string } }, latinExt: { style: { fontFamily: string } }): string {
  const [primary, ...fallbacks] = families(latin.style.fontFamily);
  return [primary, ...families(latinExt.style.fontFamily), ...fallbacks].join(", ");
}

/**
 * Mağaza ağacını saran öğeye: className (font CSS'inin sayfaya girmesi) +
 * style (Tailwind font-store-display/body/mono ve .store-font-grotesk'in
 * okuduğu değişkenler). Yalnız mağaza ağacında tanımlı — panel/Petra görmez.
 */
export const storeFontClassName = [
  oswaldLatin.variable,
  oswaldLatinExt.variable,
  barlowLatin.variable,
  barlowLatinExt.variable,
  jetbrainsMonoLatin.variable,
  jetbrainsMonoLatinExt.variable,
  spaceGroteskLatin.variable,
  spaceGroteskLatinExt.variable,
].join(" ");

export const storeFontVariables = {
  "--font-store-display": fontStack(oswaldLatin, oswaldLatinExt),
  "--font-store-body": fontStack(barlowLatin, barlowLatinExt),
  "--font-store-mono": fontStack(jetbrainsMonoLatin, jetbrainsMonoLatinExt),
  "--font-store-grotesk": fontStack(spaceGroteskLatin, spaceGroteskLatinExt),
} as React.CSSProperties;

/** Eski `Space_Grotesk({ weight: ["700"] }).className` yerine: aynı aile + 700 (app/globals.css .store-font-grotesk). */
export const spaceGrotesk = { className: "store-font-grotesk" };
