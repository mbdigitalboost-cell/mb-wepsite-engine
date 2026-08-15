import type { Metadata } from "next";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { defaultTheme } from "@/lib/theme/default-theme";
import { TrackingScripts } from "@/lib/tracking/tracking-scripts";
import { publicEnv } from "@/lib/config/env";
import "./globals.css";

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
        <TrackingScripts />
      </body>
    </html>
  );
}
