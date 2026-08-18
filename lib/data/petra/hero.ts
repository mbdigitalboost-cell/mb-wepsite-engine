export const petraHero = {
  headingLines: ["İKLİMLENDİRMEDE", "MÜHENDİSLİK", "VE GÜVEN."],
  /** Index into headingLines that renders in the brand accent color. */
  accentLineIndex: 1,
  subtext: "Konut ve ticari alanlar için profesyonel iklimlendirme çözümleri.",
  ctaPrimaryLabel: "Keşif Talep Et",
  ctaPrimaryHref: "/iletisim",
  ctaSecondaryLabel: "WhatsApp'tan Ulaş",
  /**
   * Faz 12 revizyon: customer-provided AI-generated hero banner (source:
   * ChatGPT_Image_16_A_u_2026_18_59_30.png, provided 2026-08-16). Same
   * pattern as the v2 crop it replaces — left half has a baked-in
   * headline/subtext/logo/trust-icon overlay, so `backgroundHasEmbeddedHeadline`
   * suppresses <Hero>'s own H1/subtext on top of it. The source image
   * also had two baked-in, non-functional button graphics ("KEŞİF TALEP
   * ET" / "WHATSAPP") — these were removed (background-gradient-matched
   * fill, no content-aware guessing beyond extending the existing flat
   * gradient) so the real, functional CTA buttons rendered below by
   * <Hero> are the only clickable buttons in that area, with nothing
   * baked-in to visually clash with them.
   */
  backgroundImage: "/images/petra/hero/10_hero_main_v3.jpg" as string | null,
  backgroundHasEmbeddedHeadline: true,
  /**
   * This image's baked-in content (logo/headline/buttons area) sits in
   * the left ~45% — object-cover's default centered crop clips it on
   * narrower viewports, so this shifts the visible crop left instead of
   * cropping evenly from both sides. Only actually applied at `lg`+ (a
   * separate, purpose-built portrait image is used below `lg` — see
   * `backgroundImageMobile`) — see components/sections/
   * hero-background.tsx's `objectPosition` prop doc.
   */
  backgroundObjectPosition: "22% center",
  /**
   * Faz 13 revizyon 2: dedicated portrait hero banner for below `lg`
   * (source: ChatGPT_Image_18_A_u_2026_15_16_48.png, customer-provided
   * 2026-08-18) — replaces the earlier fix's approach of cropping the
   * wide desktop banner and overlaying real text on mobile. This image
   * was actually composed for a phone aspect ratio (864×1821 ≈ most
   * phones' portrait ratio, so object-cover only trims a few px off each
   * side, no meaningful crop) with its own legible baked-in headline/
   * subtext/logo + a 4-item "why us" icon row, so `backgroundHasEmbeddedHeadlineMobile`
   * suppresses the real H1/subtext/trustInfo below `lg` the same way
   * `backgroundHasEmbeddedHeadline` does at `lg`+ for the desktop image
   * — see components/sections/hero.tsx. `null` falls back to
   * `backgroundImage` at every width (any hero without a dedicated
   * mobile crop).
   */
  backgroundImageMobile: "/images/petra/hero/10_hero_mobile_v1.jpg" as string | null,
  backgroundHasEmbeddedHeadlineMobile: true,
  /**
   * On narrow phones this crops almost nothing (image's ratio is already
   * close to a phone screen's). Wider portrait viewports still under
   * `lg` (tablets, ~768-1023px) DO need real vertical cropping though —
   * "top" makes sure that crop always comes off the BOTTOM (the icon
   * row, least critical) instead of the top (logo + headline, most
   * critical) — verified at 820px width: centered cropping there cut the
   * baked-in logo off entirely.
   */
  backgroundObjectPositionMobile: "center top" as string | undefined,
  /** Confirmed by the customer's stated service scope — see brief §4. */
  trustInfo: ["Satış", "Kurulum", "Servis"],
  /**
   * This image's baked-in icon-caption row ("Mühendislik Yaklaşımı" /
   * "Yüksek Verimlilik" / ...) sits at the exact same height as the real
   * trustInfo line below the CTA buttons, so without an offset the two
   * directly overlap. Shifts the real line right, clear of that row, on
   * desktop widths (lg+) where both are visible at once — see
   * components/sections/hero.tsx's `trustInfoOffset` usage.
   */
  trustInfoOffset: "44%" as string | undefined,
  /**
   * With `backgroundHasEmbeddedHeadline` true, the real H1/subtext/
   * trustInfo are visually hidden (`lg:sr-only` / `lg:hidden`) only at
   * `lg`+, where the baked-in image text is legible and takes its place
   * — the CTA buttons' normal `mt-10` there would ride up over that
   * baked-in subtext, so this replaces the gap with enough room to clear
   * it. Scoped to `lg`+ only (see components/sections/hero.tsx) — below
   * `lg`, `ctaTopOffsetMobile` (next) does the equivalent job for the
   * mobile image instead.
   */
  ctaTopOffset: "8.5rem" as string | undefined,
  /**
   * Unlike `ctaTopOffset` above, this stays `undefined` for now: this
   * mobile image's baked-in text block ends around 36% down the frame
   * and its icon row only starts around 87% — the CTA buttons' natural
   * vertically-centered position (~50%, see hero.tsx's `items-center`
   * for `backgroundHasEmbeddedHeadlineMobile`) already lands comfortably
   * inside that gap without needing an extra push. Kept as a field (same
   * mechanism as `ctaTopOffset`) in case a future mobile image needs
   * fine-tuning.
   */
  ctaTopOffsetMobile: undefined as string | undefined,
};
