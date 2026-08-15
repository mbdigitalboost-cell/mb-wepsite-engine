import type { CSSProperties } from "react";
import type { BrandTheme } from "@/lib/theme/types";

/**
 * Applies a `BrandTheme` to its subtree by setting CSS custom properties.
 * Tailwind utilities and `globals.css` read these variables (see
 * `--color-brand-*` in `app/globals.css`), so swapping the `theme` prop is
 * enough to re-skin everything underneath — no per-customer Tailwind
 * config or rebuild required.
 *
 * This is a Server Component (no client JS needed just to set CSS
 * variables), so it can wrap Server Component trees for free.
 */
export function ThemeProvider({
  theme,
  children,
}: {
  theme: BrandTheme;
  children: React.ReactNode;
}) {
  const style = {
    "--color-brand-primary": theme.colors.primary,
    "--color-brand-secondary": theme.colors.secondary,
    "--color-brand-accent": theme.colors.accent,
    "--color-brand-background": theme.colors.background,
    "--color-brand-foreground": theme.colors.foreground,
    "--color-brand-muted": theme.colors.muted,
    "--font-brand-heading": theme.typography.headingFont,
    "--font-brand-body": theme.typography.bodyFont,
    "--radius-brand": theme.radius,
  } as CSSProperties;

  return (
    // `contents` keeps this wrapper out of layout (flex/grid children of
    // the parent still see straight through it) while CSS custom
    // properties still cascade normally to descendants.
    <div data-theme={theme.id} style={style} className="contents">
      {children}
    </div>
  );
}
