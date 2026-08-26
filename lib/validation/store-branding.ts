import { z } from "zod";

/**
 * PHASE 2 — Store Branding (store_editor+, is_store_editor_member).
 * ONLY color/typography/button TOKENS — never raw CSS/HTML (2026-08-25
 * karar madde 5). `themeConfig` is a fixed, small key set for now (not
 * arbitrary jsonb passthrough) so this schema stays the actual gate, not
 * just a suggestion the UI happens to follow.
 */
const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const STORE_BUTTON_STYLES = ["rounded", "square", "pill"] as const;
export const STORE_COLOR_MODES = ["light", "dark", "system"] as const;

export const storeThemeConfigSchema = z.object({
  /** e.g. a secondary/hover accent that isn't one of the three named colors. */
  hoverColor: z.string().trim().regex(hexColorRegex, "Geçerli bir hex renk kodu girin (ör. #1a2b3c).").optional().or(z.literal("")),
});

export const storeBrandingFormSchema = z.object({
  primaryColor: z.string().trim().regex(hexColorRegex, "Geçerli bir hex renk kodu girin (ör. #1a2b3c).").optional().or(z.literal("")),
  secondaryColor: z.string().trim().regex(hexColorRegex, "Geçerli bir hex renk kodu girin (ör. #1a2b3c).").optional().or(z.literal("")),
  accentColor: z.string().trim().regex(hexColorRegex, "Geçerli bir hex renk kodu girin (ör. #1a2b3c).").optional().or(z.literal("")),
  buttonStyle: z.enum(STORE_BUTTON_STYLES, { message: "Geçerli bir buton stili seçin." }).optional(),
  typography: z.string().trim().max(100).optional().or(z.literal("")),
  colorMode: z.enum(STORE_COLOR_MODES, { message: "Geçerli bir tema modu seçin." }),
  themeConfig: storeThemeConfigSchema,
});
