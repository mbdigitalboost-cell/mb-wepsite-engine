/**
 * Brand theme contract.
 *
 * Every customer website will eventually be driven by one `BrandTheme`
 * object (today hardcoded to `defaultTheme`, later loaded from Supabase
 * per customer/website). Keeping the shape centralized here means the
 * rendering layer (ThemeProvider, Tailwind CSS variables) never needs to
 * change when a new customer's theme is added — only the data does.
 */

export type ButtonStyle = "solid" | "outline" | "soft";

export interface BrandColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
}

export interface BrandTypography {
  /** CSS font-family stack for headings. */
  headingFont: string;
  /** CSS font-family stack for body text. */
  bodyFont: string;
}

export interface BrandTheme {
  /** Stable identifier, e.g. a customer/website slug. */
  id: string;
  name: string;
  logoUrl: string | null;
  colors: BrandColorPalette;
  typography: BrandTypography;
  /** Tailwind-compatible border radius token, e.g. "0.5rem". */
  radius: string;
  buttonStyle: ButtonStyle;
}
