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
   * cropping evenly from both sides. Only actually applied at `lg`+ — see
   * `backgroundObjectPositionMobile` below and components/sections/
   * hero-background.tsx's `objectPosition` prop doc.
   */
  backgroundObjectPosition: "22% center",
  /**
   * Faz 13 (mobil düzeltme): this banner's baked-in text (logo, headline,
   * subtext, 4 trust icons, 6-icon category row) is spread across its
   * FULL width — on a narrow portrait phone, object-cover's horizontal
   * sliver can only ever show a fraction of that width, so no crop value
   * keeps the baked text legible on mobile (verified: every candidate
   * position cuts the headline mid-word). Below `lg`, this image is
   * treated as pure atmospheric background instead — cropped to the
   * rooftop AC units on the right side (the most visually interesting,
   * text-free part of the frame) — and the REAL, properly-sized H1/
   * subtext render on top instead of relying on the baked text (see
   * components/sections/hero.tsx). `backgroundObjectPosition` above is
   * only applied at `lg`+, where the wide desktop crop keeps the baked
   * text intact and legible.
   */
  backgroundObjectPositionMobile: "75% center" as string | undefined,
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
   * With `backgroundHasEmbeddedHeadline` true, the real H1/subtext is
   * visually hidden (`lg:sr-only` / `lg:hidden`) only at `lg`+, where the
   * baked-in image text is legible and takes its place — the CTA buttons'
   * normal `mt-10` there would ride up over that baked-in subtext, so
   * this replaces the gap with enough room to clear it. Scoped to `lg`+
   * only (see components/sections/hero.tsx) — below `lg` the real,
   * visible subtext renders normally above the buttons with the plain
   * `mt-10` gap, same as any other page.
   */
  ctaTopOffset: "8.5rem" as string | undefined,
};
