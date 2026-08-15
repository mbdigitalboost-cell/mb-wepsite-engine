/**
 * Real Petra logo files not provided yet. Paths point to where they
 * should land once available (see public/images/petra/README.md) — the
 * `Logo` component already falls back to a text wordmark when these are
 * `null`, so nothing breaks either way and no code changes are needed
 * once real files exist.
 */
export const petraBrandAssets = {
  logoSrcDark: null as string | null, // for use on dark backgrounds, e.g. "/images/petra/brand/petra-logo-white.svg"
  logoSrcLight: null as string | null, // for use on light backgrounds, e.g. "/images/petra/brand/petra-logo.svg"
  symbolSrc: null as string | null, // icon-only mark, e.g. "/images/petra/brand/petra-mark.svg"
  faviconSrc: null as string | null, // favicon-specific mark, e.g. "/images/petra/brand/favicon.svg"
  logoWidth: 132,
  logoHeight: 40,
};
