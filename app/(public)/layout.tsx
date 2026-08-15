import type { Metadata } from "next";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { petraTheme } from "@/lib/theme/petra-theme";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileStickyCta } from "@/components/navigation/mobile-sticky-cta";
import { petraNavLinks } from "@/lib/data/petra/navigation";
import { petraSiteName, petraTagline, petraContactInfo, petraSocialLinks } from "@/lib/data/petra/site-config";
import { petraBrandAssets } from "@/lib/data/petra/brand-assets";
import { buildWhatsappHref } from "@/lib/data/petra/whatsapp";

const whatsappHref = buildWhatsappHref(petraContactInfo.whatsapp);

// Resets the title template for this subtree (root layout's is the
// engine-neutral "%s | MB Digital Boost") to Petra's own branding. Child
// pages that set a plain string `title` are wrapped by this template;
// the homepage relies on `default` instead of repeating it.
export const metadata: Metadata = {
  title: {
    default: "Petra Mühendislik — İklimlendirmede Mühendislik ve Güven",
    template: "%s | Petra Mühendislik",
  },
  description:
    "Konut ve ticari alanlar için profesyonel iklimlendirme çözümleri: split, multi-split, VRF, ısı pompası ve sıcak su sistemleri.",
};

/**
 * Layout for Petra Mühendislik's public site (route group `(public)` —
 * doesn't affect the URL). Applies Petra's `BrandTheme` on top of the
 * engine-neutral one set in the root layout — nested `ThemeProvider`s
 * simply override the `--color-brand-*` variables for this subtree, no
 * change to the theme mechanism itself. This is also the pattern the next
 * customer's `(public)` layout will follow with their own theme object.
 */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <ThemeProvider theme={petraTheme}>
      <div className="flex min-h-full flex-1 flex-col bg-brand-background text-brand-foreground">
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
        {/*
          pt-20 offsets the `fixed` header's height (h-20) for every page.
          Hero (the homepage's first section) negates this with `-mt-20`
          so it can extend full-bleed behind the transparent header —
          every other page's content starts safely below it.
        */}
        <main className="flex-1 pt-20 pb-16 lg:pb-0">{children}</main>
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
        <MobileStickyCta
          phone={petraContactInfo.phone}
          whatsapp={whatsappHref}
          quoteHref="/iletisim"
        />
      </div>
    </ThemeProvider>
  );
}
