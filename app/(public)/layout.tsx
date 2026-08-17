import type { Metadata } from "next";
import "./petra-fonts.css";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { petraTheme } from "@/lib/theme/petra-theme";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileStickyCta } from "@/components/navigation/mobile-sticky-cta";
import { FloatingWhatsappButton } from "@/components/navigation/floating-whatsapp-button";
import { TrackingScripts } from "@/lib/tracking/tracking-scripts";
import { petraNavLinks, petraLegalLinks } from "@/lib/data/petra/navigation";
import { petraSiteName, petraTagline, petraContactInfo, petraSocialLinks } from "@/lib/data/petra/site-config";
import { petraBrandAssets } from "@/lib/data/petra/brand-assets";
import { buildWhatsappHref } from "@/lib/data/petra/whatsapp";
import { getTrackingPublicSettings } from "@/lib/cms/adapters";
import { resolveSiteWideSeo, applyLayoutSeoOverrides } from "@/lib/seo/build-metadata";

const whatsappHref = buildWhatsappHref(petraContactInfo.whatsapp);
const PETRA_CONNECTION_KEY = "PETRA";

const petraDefaultTitle = "Petra Mühendislik — İklimlendirmede Mühendislik ve Güven";
const petraDefaultDescription =
  "Konut ve ticari alanlar için profesyonel iklimlendirme çözümleri: split, multi-split, VRF, ısı pompası ve sıcak su sistemleri.";

/**
 * Faz 10: sayfa bazlı `openGraph`/`twitter` tanımlamayan route'lar
 * (hizmetler, projeler, kampanyalar, hakkımızda, iletişim, cozumler
 * listesi) bu layout seviyesindeki varsayılanı miras alır — hiçbiri
 * uydurulmuş içerik değil, zaten onaylı başlık/açıklama metninin
 * tekrarı. Homepage ve `/cozumler/[slug]` kendi `openGraph`'ını
 * tanımlayarak bunun üzerine yazıyor (Next.js metadata birleştirme
 * kuralı: child'da tanımlı openGraph, parent'ınkini bütünüyle
 * override eder).
 */
const staticMetadata: Metadata = {
  title: {
    default: petraDefaultTitle,
    template: "%s | Petra Mühendislik",
  },
  description: petraDefaultDescription,
  openGraph: {
    siteName: petraSiteName,
    locale: "tr_TR",
    type: "website",
    title: petraDefaultTitle,
    description: petraDefaultDescription,
  },
  twitter: {
    card: "summary",
    title: petraDefaultTitle,
    description: petraDefaultDescription,
  },
};

// Resets the title template for this subtree (root layout's is the
// engine-neutral "%s | MB Digital Boost") to Petra's own branding. Child
// pages that set a plain string `title` are wrapped by this template;
// the homepage relies on `default` instead of repeating it.
//
// Phase 9.3: CMS-first, static `staticMetadata` as fallback — see
// lib/seo/build-metadata.ts's `applyLayoutSeoOverrides` for exactly
// which fields a site-wide `seo_settings` row can and cannot touch here.
export async function generateMetadata(): Promise<Metadata> {
  const seo = await resolveSiteWideSeo(PETRA_CONNECTION_KEY);
  return applyLayoutSeoOverrides(staticMetadata, seo);
}

/**
 * Layout for Petra Mühendislik's public site (route group `(public)` —
 * doesn't affect the URL). Applies Petra's `BrandTheme` on top of the
 * engine-neutral one set in the root layout — nested `ThemeProvider`s
 * simply override the `--color-brand-*` variables for this subtree, no
 * change to the theme mechanism itself. This is also the pattern the next
 * customer's `(public)` layout will follow with their own theme object.
 */
export default async function PublicLayout({ children }: LayoutProps<"/">) {
  // Phase 9.3: CMS-first, static env-var fallback (see
  // lib/tracking/tracking-scripts.tsx's default props). Only reads the
  // public-safe `tracking_public_settings` view — never the
  // `tracking_settings` base table, never `meta_capi_token` (that field
  // doesn't even exist on this view — see lib/cms/adapters/tracking.ts).
  const trackingResult = await getTrackingPublicSettings(PETRA_CONNECTION_KEY, null);

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
          legalLinks={petraLegalLinks}
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
        <FloatingWhatsappButton whatsappHref={whatsappHref} />
        <TrackingScripts
          gtmId={trackingResult?.gtm_id ?? undefined}
          ga4Id={trackingResult?.ga4_id ?? undefined}
          metaPixelId={trackingResult?.meta_pixel_id ?? undefined}
        />
      </div>
    </ThemeProvider>
  );
}
