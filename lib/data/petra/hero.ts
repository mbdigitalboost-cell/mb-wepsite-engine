export const petraHero = {
  headingLines: ["İKLİMLENDİRMEDE", "MÜHENDİSLİK", "VE GÜVEN."],
  /** Index into headingLines that renders in the brand accent color. */
  accentLineIndex: 1,
  subtext: "Konut ve ticari alanlar için profesyonel iklimlendirme çözümleri.",
  ctaPrimaryLabel: "Keşif Talep Et",
  ctaPrimaryHref: "/iletisim",
  ctaSecondaryLabel: "WhatsApp'tan Ulaş",
  /**
   * Faz 9.9 revizyon: customer-provided AI-generated visual pack (see
   * public/images/petra/README.md's "Faz 9.9" note). This crop's own
   * left half already has a baked-in headline/subtext/badge/logo overlay
   * — `backgroundHasEmbeddedHeadline` tells <Hero> to suppress its own
   * H1/subtext block on top of it (avoids duplicate/clashing text) while
   * keeping the real, functional CTA buttons and trust-info line, which
   * are NOT baked into the image and must stay interactive.
   */
  backgroundImage: "/images/petra/hero/09_hero_main_v2.jpg" as string | null,
  backgroundHasEmbeddedHeadline: true,
  /** Confirmed by the customer's stated service scope — see brief §4. */
  trustInfo: ["Satış", "Kurulum", "Servis"],
};
