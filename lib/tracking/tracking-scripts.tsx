import Script from "next/script";
import { publicEnv } from "@/lib/config/env";

interface TrackingScriptsProps {
  /**
   * Optional CMS-sourced overrides — default to the static
   * `NEXT_PUBLIC_*` env vars when omitted/undefined, so a customer with
   * no CMS `tracking_settings` row (or no CMS connection at all) renders
   * exactly as before Phase 9.3. See app/(public)/layout.tsx: it fetches
   * the public-safe `tracking_public_settings` view (never the
   * `meta_capi_token`-bearing base table) and passes a field through
   * ONLY when that field is a non-empty CMS value — an explicit
   * `undefined` is passed otherwise so this component's own default
   * (the static env var) applies. This component itself never touches
   * Supabase — it only ever receives already-resolved, already-public
   * string values as props.
   */
  gtmId?: string;
  ga4Id?: string;
  metaPixelId?: string;
}

/**
 * Central place where third-party tracking scripts get injected.
 *
 * Every script here is gated behind its own ID and renders nothing when
 * that ID is empty — this foundation ships with all of them empty on
 * purpose. A customer's GTM container / GA4 stream / Meta Pixel ID can
 * come from either the CMS (`tracking_settings`, via the public-safe
 * `tracking_public_settings` view — see the props above) or, absent a
 * CMS connection/row, the corresponding `NEXT_PUBLIC_*` env var — no
 * code change needed either way.
 *
 * Mounted in the Petra-specific `(public)` layout (not the engine-neutral
 * root layout) as of Phase 9.3 — see app/(public)/layout.tsx — so it (a)
 * can be CMS-connection-aware without the root layout needing to know
 * about any specific customer's connectionKey, and (b) no longer fires
 * on `/dashboard` or `/login`, which it previously did as a side effect
 * of being mounted in the shared root layout.
 */
export function TrackingScripts({
  gtmId = publicEnv.gtmContainerId,
  ga4Id = publicEnv.ga4MeasurementId,
  metaPixelId = publicEnv.metaPixelId,
}: TrackingScriptsProps) {
  return (
    <>
      {gtmId ? (
        <Script id="gtm-init" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
            var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
            j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `}
        </Script>
      ) : null}

      {!gtmId && ga4Id ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){window.dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ga4Id}');
            `}
          </Script>
        </>
      ) : null}

      {metaPixelId ? (
        <Script id="meta-pixel-init" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${metaPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      ) : null}
    </>
  );
}
