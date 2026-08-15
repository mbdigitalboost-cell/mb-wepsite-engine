import type { Metadata } from "next";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { defaultTheme } from "@/lib/theme/default-theme";
import { publicEnv } from "@/lib/config/env";
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
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: "MB Digital Boost",
    template: "%s | MB Digital Boost",
  },
  description: "MB Digital Boost Website Engine",
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
