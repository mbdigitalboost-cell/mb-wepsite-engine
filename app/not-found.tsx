import type { Metadata } from "next";
import "@/app/(public)/petra-fonts.css";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { petraTheme } from "@/lib/theme/petra-theme";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileStickyCta } from "@/components/navigation/mobile-sticky-cta";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { petraNavLinks } from "@/lib/data/petra/navigation";
import { petraSiteName, petraTagline, petraContactInfo, petraSocialLinks } from "@/lib/data/petra/site-config";
import { petraBrandAssets } from "@/lib/data/petra/brand-assets";
import { buildWhatsappHref } from "@/lib/data/petra/whatsapp";

export const metadata: Metadata = {
  title: "Sayfa Bulunamadı",
  robots: { index: false, follow: true },
};

const whatsappHref = buildWhatsappHref(petraContactInfo.whatsapp);

/**
 * Faz 9.9: site-wide 404. Deliberately at `app/not-found.tsx` (root),
 * NOT `app/(public)/not-found.tsx` — a truly unmatched path (e.g. a typo
 * URL) isn't guaranteed to resolve through the `(public)` route group's
 * layout, so this file reuses the SAME components `app/(public)/layout.tsx`
 * composes (`SiteHeader`, `SiteFooter`, `MobileStickyCta`, Petra's
 * `ThemeProvider`) directly, rather than depending on that layout
 * wrapping it. Deliberately skips `TrackingScripts` (a CMS round-trip
 * this error page shouldn't depend on) and stays a plain sync component
 * — every prop below is static Petra data, no network call needed.
 *
 * Like `app/(public)/layout.tsx`, this file is Petra-specific (imports
 * `lib/data/petra/*` directly) rather than engine-neutral — the next
 * Website Engine customer replaces this file the same way they'd replace
 * that layout.
 */
export default function NotFound() {
  return (
    <ThemeProvider theme={petraTheme}>
      <div className="petra-poppins flex min-h-full flex-1 flex-col bg-brand-background text-brand-foreground">
        <SiteHeader
          siteName={petraSiteName}
          logoSrcDark={petraBrandAssets.logoSrcDark}
          logoSrcLight={petraBrandAssets.logoSrcLight}
          navLinks={petraNavLinks}
          phone={petraContactInfo.phone}
          phoneDisplay={petraContactInfo.phoneDisplay}
          ctaLabel="Keşif Talep Et"
          ctaHref="/iletisim"
          whatsappHref={whatsappHref}
        />

        <main className="flex flex-1 items-center pt-20 pb-16 lg:pb-0">
          <Container className="py-20 text-center lg:py-28">
            <span className="text-xs font-medium tracking-[0.2em] text-brand-primary uppercase">Hata 404</span>
            <p className="mt-4 font-[family-name:var(--font-brand-heading)] text-[96px] leading-none font-semibold text-white sm:text-[140px] lg:text-[180px]">
              404
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-brand-heading)] text-[26px] leading-tight font-semibold text-white sm:text-[32px]">
              Aradığınız sayfa bulunamadı.
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base text-brand-muted">
              Bağlantı hatalı olabilir veya sayfa taşınmış olabilir. Ana sayfaya dönebilir ya da doğrudan bizimle
              iletişime geçebilirsiniz.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button href="/" size="lg" showArrow>
                Ana Sayfaya Dön
              </Button>
              <Button
                href="/iletisim"
                size="lg"
                variant="outline"
                className="text-white"
                trackEvent="generate_lead"
                trackPayload={{ source: "404" }}
              >
                İletişime Geç
              </Button>
            </div>
          </Container>
        </main>

        <SiteFooter
          siteName={petraSiteName}
          tagline={petraTagline}
          logoSrcDark={petraBrandAssets.logoSrcDark}
          logoSrcLight={petraBrandAssets.logoSrcLight}
          navLinks={petraNavLinks}
          phone={petraContactInfo.phone}
          phoneDisplay={petraContactInfo.phoneDisplay}
          whatsappHref={whatsappHref}
          email={petraContactInfo.email}
          address={petraContactInfo.address}
          serviceArea={petraContactInfo.serviceArea}
          workingHours={petraContactInfo.workingHours}
          socialLinks={petraSocialLinks}
        />
        <MobileStickyCta phone={petraContactInfo.phone} whatsapp={whatsappHref} quoteHref="/iletisim" />
      </div>
    </ThemeProvider>
  );
}
