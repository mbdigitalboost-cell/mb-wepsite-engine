import type { Metadata } from "next";
import { cache } from "react";
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
import { getTrackingPublicSettings, getNavigation, getSiteSettings } from "@/lib/cms/adapters";
import { mapSiteSettingsContactInfo } from "@/lib/cms/petra/mappers";
import { resolveSiteWideSeo, applyLayoutSeoOverrides } from "@/lib/seo/build-metadata";
import type { SiteSettingsRow } from "@/lib/cms/customer-types";
import type { BrandTheme } from "@/lib/theme/types";

const PETRA_CONNECTION_KEY = "PETRA";

/**
 * Faz 6F-2: `generateMetadata()` and `PublicLayout`'s own body both need
 * `site_settings` (metadata needs `favicon`; the body already needed
 * company_name/logo/colors) — Next.js runs these as separate function
 * invocations that share no scope, so without `cache()` this would issue
 * the exact same `getSiteSettings` query twice per request. `cache()` is
 * React's per-request memoization primitive (official Next.js pattern for
 * this exact "metadata + page need the same fetch" case) — both call
 * sites below now share one query instead of duplicating it.
 */
const getSiteSettingsCached = cache((connectionKey: string) =>
  getSiteSettings<SiteSettingsRow | null>(connectionKey, null),
);

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
  const [seo, siteSettings] = await Promise.all([
    resolveSiteWideSeo(PETRA_CONNECTION_KEY),
    getSiteSettingsCached(PETRA_CONNECTION_KEY),
  ]);
  const metadata = applyLayoutSeoOverrides(staticMetadata, seo);
  // Faz 6F-2: `getSiteSettings` (fetchPublishedSingle) already filters to
  // `status='published'` — a draft site_settings row never reaches this
  // point at all, so no separate draft check is needed here. `favicon`
  // null/empty leaves `icons` unset, which keeps the existing
  // app/favicon.ico file-convention fallback exactly as it works today.
  if (siteSettings?.favicon) {
    metadata.icons = { icon: siteSettings.favicon };
  }
  return metadata;
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
  const navLinks = await getNavigation(PETRA_CONNECTION_KEY, petraNavLinks);
  // BTU hesaplama sayfası CMS'in navigation_items tablosunda yönetilmiyor —
  // header'da her zaman görünür, CMS bağlantısı/içeriği ne olursa olsun.
  const headerNavLinks = [...navLinks, { href: "/btu-hesaplama", label: "BTU Hesaplama" }];

  // Faz 4B: site_settings → public bağlantısı. `siteSettings` null ise
  // (bağlantı yok, satır yok veya hata) her aşağıdaki `resolved*`/`contactInfo`
  // değeri sessizce statik fallback'e düşer — sayfa asla boş kalmaz. Satır
  // varsa bile, boş bırakılan HER alan kendi statik karşılığına düşer
  // (bkz. dashboard/customers/[customerId]/settings/page.tsx'in kendi
  // metni: "burada girilmeyen bir değer public sitede uydurulmaz").
  const siteSettings = await getSiteSettingsCached(PETRA_CONNECTION_KEY);
  const contactInfo = siteSettings ? mapSiteSettingsContactInfo(siteSettings, petraContactInfo) : petraContactInfo;
  const resolvedSiteName = siteSettings?.company_name ?? petraSiteName;
  // site_settings'teki "logo" (normal, açık zemin için) / "logo_white"
  // (beyaz, koyu zemin için) adlandırması, Logo bileşeninin
  // logoSrcLight/logoSrcDark ayrımıyla aynı anlama gelir — bkz.
  // lib/data/petra/brand-assets.ts'in kendi yorumu.
  const resolvedLogoSrcDark = siteSettings?.logo_white ?? petraBrandAssets.logoSrcDark;
  const resolvedLogoSrcLight = siteSettings?.logo ?? petraBrandAssets.logoSrcLight;
  const whatsappHref = buildWhatsappHref(contactInfo.whatsapp);
  // Sadece primary_color/secondary_color/radius bağlandı — ikisi de
  // BrandTheme'de düz `string`. `button_style` BİLİNÇLİ OLARAK DIŞARIDA
  // BIRAKILDI: admin formunda serbest metin (herhangi bir değer
  // girilebilir) ama BrandTheme.buttonStyle sıkı bir union tipi
  // ("solid"|"outline"|"soft") — DB'den doğrulanmamış bir string'i buraya
  // basmak ya tip güvenliğini bir `as` ile kırar ya da sessizce geçersiz
  // bir değer üretir. Bu, faz talimatının "kapsamlı mimari değişiklik
  // gerekiyorsa dur ve raporla" maddesine giriyor — ayrı bir karar/doğrulama
  // katmanı gerektirir, bu fazda YAPILMADI (bkz. rapor).
  const theme: BrandTheme = {
    ...petraTheme,
    colors: {
      ...petraTheme.colors,
      primary: siteSettings?.primary_color ?? petraTheme.colors.primary,
      secondary: siteSettings?.secondary_color ?? petraTheme.colors.secondary,
    },
    radius: siteSettings?.radius ?? petraTheme.radius,
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="petra-poppins flex min-h-full flex-1 flex-col bg-brand-background text-brand-foreground">
        <SiteHeader
          siteName={resolvedSiteName}
          logoSrcDark={resolvedLogoSrcDark}
          logoSrcLight={resolvedLogoSrcLight}
          navLinks={headerNavLinks}
          phone={contactInfo.phone}
          phoneDisplay={contactInfo.phoneDisplay}
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
          siteName={resolvedSiteName}
          tagline={petraTagline}
          logoSrcDark={resolvedLogoSrcDark}
          logoSrcLight={resolvedLogoSrcLight}
          navLinks={headerNavLinks}
          legalLinks={petraLegalLinks}
          phone={contactInfo.phone}
          phoneDisplay={contactInfo.phoneDisplay}
          whatsappHref={whatsappHref}
          email={contactInfo.email}
          address={contactInfo.address}
          serviceArea={contactInfo.serviceArea}
          workingHours={contactInfo.workingHours}
          mapUrl={contactInfo.mapUrl}
          socialLinks={petraSocialLinks}
        />
        <MobileStickyCta
          phone={contactInfo.phone}
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
