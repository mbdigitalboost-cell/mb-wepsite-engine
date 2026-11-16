"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_DAYS,
  allowedTrackers,
  readConsentFromCookieHeader,
  serializeConsent,
  shouldShowConsentBanner,
  type ConsentState,
  type TrackerDefinition,
} from "@/lib/legal/consent";

/**
 * Faz 33 — vitrinin takip betiği kapısı (lib/legal/consent.ts).
 * `trackers` boşsa (bugünkü durum) HİÇBİR ŞEY render etmez: banner yok,
 * çerez yazılmaz. Bir mağazaya ileride GTM/GA4/Pixel eklenirse betik bu
 * bileşene `trackers` olarak verilir — doğrudan layout'a <Script> eklenmez.
 */
export function ConsentGate({ trackers, cookiePolicyHref }: { trackers: TrackerDefinition[]; cookiePolicyHref: string | null }) {
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (trackers.length === 0) return;
    // Çerez yalnız tarayıcıda okunabilir; ilk boyamadan sonra senkronize edilir.
    const stored = readConsentFromCookieHeader(document.cookie);
    const handle = window.setTimeout(() => {
      setConsent(stored);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(handle);
  }, [trackers.length]);

  if (trackers.length === 0 || !ready) return null;

  function decide(state: ConsentState) {
    const maxAge = CONSENT_MAX_AGE_DAYS * 24 * 60 * 60;
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(serializeConsent(state))}; Max-Age=${maxAge}; Path=/; SameSite=Lax; Secure`;
    setConsent(state);
  }

  return (
    <>
      {allowedTrackers(trackers, consent).map((tracker) =>
        tracker.src ? (
          <Script key={tracker.id} id={tracker.id} src={tracker.src} strategy="afterInteractive" />
        ) : tracker.inline ? (
          <Script key={tracker.id} id={tracker.id} strategy="afterInteractive">
            {tracker.inline}
          </Script>
        ) : null,
      )}
      {shouldShowConsentBanner(trackers, consent) ? (
        <div role="dialog" aria-label="Çerez tercihleri" className="fixed inset-x-0 bottom-0 z-50 border-t border-[#292929] bg-[#111111] p-4 text-sm text-[#C9C9C9] print:hidden">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Sitenin çalışması için zorunlu çerezlerin yanında, onay verirseniz analiz ve pazarlama çerezleri de kullanılır.{" "}
              {cookiePolicyHref ? (
                <Link href={cookiePolicyHref} className="text-[#D95F00] underline underline-offset-2">
                  Çerez Politikası
                </Link>
              ) : null}
            </p>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => decide({ analytics: false, marketing: false })} className="rounded-full border border-[#3A3A3A] px-4 py-2 text-xs text-[#F5F5F5] hover:border-[#D95F00]">
                Yalnız zorunlu
              </button>
              <button type="button" onClick={() => decide({ analytics: true, marketing: true })} className="rounded-full bg-[#D95F00] px-4 py-2 text-xs font-semibold text-[#1A0D00] hover:bg-[#F26A00]">
                Tümünü kabul et
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
