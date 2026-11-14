import type { Metadata } from "next";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { defaultTheme } from "@/lib/theme/default-theme";
import { getCurrentSite } from "@/lib/sites/current";
import "./globals.css";

// Phase 9.3: `TrackingScripts` moved OUT of this engine-neutral root
// layout into the Petra-specific `app/(public)/layout.tsx`. Two reasons:
// (1) this root layout also wraps `/dashboard` and `/login` — mounting
// analytics/ad-pixel scripts there was firing them on internal admin
// traffic, never intentional; (2) CMS-sourced tracking IDs need a
// connectionKey ("PETRA"), which is customer-specific and has no place
// in this generic root layout. See app/(public)/layout.tsx and
// PHASE_9_3_RAPOR.md.

// Deliberately no next/font/google here: the foundation should build and
// render without depending on network access to Google Fonts, and
// per-customer typography will come from that customer's `BrandTheme`
// (see lib/theme) rather than a single font baked into the root layout.
// Swap in next/font/local (self-hosted) or next/font/google per site when
// a brief specifies a typeface.

export const metadata: Metadata = {
  // Faz 28 — sitenin kendi kanonik adresi (registry); önceden
  // publicEnv.siteUrl'di ve mağaza projesinde localhost'a düşüyordu.
  metadataBase: new URL(getCurrentSite().canonicalOrigin),
  title: {
    default: "MB Digital Boost",
    template: "%s | MB Digital Boost",
  },
  description: "MB Digital Boost Website Engine",
  /**
   * Faz 24 — panel/Petra ikonları. Önceden app/favicon.ico, app/icon.png,
   * app/apple-icon.png dosya konvansiyonuyla geliyordu; o konvansiyon kök
   * favicon'u HER rotaya (mağaza dahil) zorla ekliyor ve segment metadata'sı
   * onu ezemiyor — mağaza sekmesinde 16x16 eşitliğinde panel ikonu
   * kazanabiliyordu. Aynı üç dosya BYTE-BYTE aynı (sha1 doğrulandı)
   * public/'e taşındı ve burada aynı boyut/tiplerle bildiriliyor: panelin
   * gördüğü ikon değişmiyor, app/store/[storeSlug]/layout.tsx'in `icons`
   * alanı ise artık bunları EKLEMEK yerine DEĞİŞTİRİYOR.
   */
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16", type: "image/x-icon" },
      { url: "/icon.png", sizes: "180x180", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider theme={defaultTheme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
