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
   * cropping evenly from both sides. See components/sections/
   * hero-background.tsx's `objectPosition` prop doc.
   */
  backgroundObjectPosition: "22% center",
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
   * With `backgroundHasEmbeddedHeadline` true, the real (visible) H1/
   * subtext block is replaced by a zero-height `sr-only` heading (see
   * components/sections/hero.tsx), so the CTA buttons' normal `mt-10`
   * — sized to sit below that visible block — leaves them riding up over
   * this image's own baked-in subtext ("...çözümler üretiyoruz." gets
   * covered by the "Keşif Talep Et" button). This replaces that spacing
   * with enough room to clear the baked text instead.
   */
  ctaTopOffset: "8.5rem" as string | undefined,
};
