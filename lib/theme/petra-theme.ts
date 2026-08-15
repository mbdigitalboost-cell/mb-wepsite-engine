import type { BrandTheme } from "@/lib/theme/types";

/**
 * Petra Mühendislik's `BrandTheme`. This is the ONLY place Petra's colors
 * live — every component reads them through `ThemeProvider`'s CSS
 * variables (`bg-brand-primary`, `text-brand-secondary`, ...), never as a
 * literal hex value. Swapping this object (or building an equivalent one
 * for the next customer) is the entire re-branding surface.
 *
 * Typography intentionally references `--font-poppins` with a
 * `--font-sans` fallback: Poppins is not wired in yet (no font files in
 * the repo — see lib/fonts/README.md). Once it is, this file does not
 * need to change.
 */
export const petraTheme: BrandTheme = {
  id: "petra-muhendislik",
  name: "Petra Mühendislik",
  logoUrl: null, // set once a real SVG logo file is provided — see components/ui/logo.tsx
  colors: {
    primary: "#E31E24", // Petra Red — accent only, ~10% of the UI
    secondary: "#15191D", // Dark Secondary
    accent: "#E31E24",
    background: "#0B0D0F", // Dark
    foreground: "#F5F5F3", // Light
    muted: "#8D9398", // Secondary Text
  },
  typography: {
    headingFont: "var(--font-poppins, var(--font-sans))",
    bodyFont: "var(--font-poppins, var(--font-sans))",
  },
  radius: "0.25rem", // sharp, technical — not the soft/rounded look the brief explicitly avoids
  buttonStyle: "solid",
};
