import Script from "next/script";
import { publicEnv } from "@/lib/config/env";

/**
 * Central place where third-party tracking scripts get injected.
 *
 * Every script here is gated behind its own env var and renders nothing
 * when that var is unset — this foundation ships with all of them empty
 * on purpose. When a customer's GTM container / GA4 stream / Meta Pixel
 * ID is ready, set the corresponding `NEXT_PUBLIC_*` variable for that
 * site's environment; no code changes needed.
 *
 * Mount once in the root layout, inside `<body>`.
 */
export function TrackingScripts() {
  return (
    <>
      {publicEnv.gtmContainerId ? (
        <Script id="gtm-init" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
            var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
            j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${publicEnv.gtmContainerId}');
          `}
        </Script>
      ) : null}

      {!publicEnv.gtmContainerId && publicEnv.ga4MeasurementId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${publicEnv.ga4MeasurementId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){window.dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${publicEnv.ga4MeasurementId}');
            `}
          </Script>
        </>
      ) : null}

      {publicEnv.metaPixelId ? (
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
            fbq('init', '${publicEnv.metaPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      ) : null}
    </>
  );
}
