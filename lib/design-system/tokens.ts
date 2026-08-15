/**
 * Engine-level design tokens: grid, spacing, motion timing, breakpoints.
 *
 * These are deliberately separate from `lib/theme/types.ts` (`BrandTheme`).
 * `BrandTheme` holds what changes PER CUSTOMER (colors, typography, radius,
 * button style). This file holds what stays constant ACROSS every customer
 * site built on the Website Engine — the editorial grid, spacing scale, and
 * motion durations that make every site *feel* like a Website Engine
 * production, regardless of brand. Do not put customer-specific values
 * here; do not put engine-wide layout constants in `BrandTheme`.
 */

export const GRID = {
  /** Max content width for editorial/desktop layouts. */
  maxWidth: "1440px",
  columns: 12,
  /** Horizontal padding by breakpoint. */
  paddingMobile: "20px",
  paddingTablet: "32px",
  paddingDesktop: "48px",
} as const;

export const BREAKPOINTS = {
  sm: 390,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1440,
} as const;

/** Spacing scale used for section rhythm (padding-block on sections, etc). */
export const SECTION_SPACING = {
  sm: "4rem", // 64px — mobile section padding
  md: "6rem", // 96px — tablet
  lg: "8rem", // 128px — desktop
} as const;

/** Motion durations in ms — kept short/subtle per brief (300–800ms range). */
export const MOTION_DURATION = {
  fast: 300,
  base: 500,
  slow: 800,
} as const;

/** Standard easing curve for reveal/hover transitions. */
export const MOTION_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";

/** Stagger delay between siblings in a revealed group (ms). */
export const MOTION_STAGGER_STEP = 90;
