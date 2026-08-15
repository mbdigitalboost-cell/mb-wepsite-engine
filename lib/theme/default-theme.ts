import type { BrandTheme } from "@/lib/theme/types";

/**
 * Neutral placeholder theme for the Website Engine foundation itself
 * (dashboard UI, marketing shell, etc.). Deliberately generic — no
 * customer branding lives here. A real customer site will supply its own
 * `BrandTheme` (colors, fonts, radius, logo) fetched from Supabase and
 * passed into `ThemeProvider`.
 */
export const defaultTheme: BrandTheme = {
  id: "default",
  name: "MB Digital Boost",
  logoUrl: null,
  colors: {
    primary: "#171717",
    secondary: "#404040",
    accent: "#2563eb",
    background: "#ffffff",
    foreground: "#171717",
    muted: "#f5f5f5",
  },
  typography: {
    headingFont: "var(--font-sans)",
    bodyFont: "var(--font-sans)",
  },
  radius: "0.5rem",
  buttonStyle: "solid",
};
