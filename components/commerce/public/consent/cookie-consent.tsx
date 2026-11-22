"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_DAYS,
  activeTools,
  consentBannerText,
  consentIsCurrent,
  decideTrackers,
  isTrackablePath,
  needsConsentPrompt,
  readConsentCookie,
  serializeConsentCookie,
  trackingCookiesToClear,
  type ConsentChoice,
  type StoreTrackingSettings,
  type TrackerDecision,
} from "@/lib/tracking/store-tracking";
import { flushTrackingQueue, trackPageView } from "@/lib/tracking/store-events";
import { recordCookieConsentAction } from "@/app/store/[storeSlug]/consent-actions";

/** Altbilgideki "Çerez Tercihleri" bağlantısı bu olayı yayar. */
export const OPEN_COOKIE_PREFERENCES_EVENT = "mb:open-cookie-preferences";

/**
 * Faz 35 — çerez bandı, tercih paneli ve betik kapısı (yalnız mağaza vitrini;
 * app/store/[storeSlug]/layout.tsx). KVKK Kurumu Çerez Rehberi:
 *  - Kabul Et ve Reddet ilk ekranda, EŞİT boyut/renk/stil; "Tercihler" ayrı.
 *  - Ön işaretli kutu yok; analitik ve reklam kategorileri kapalı başlar.
 *  - Duvar yok: bant sayfayı kapatmaz. X = seçim yok → betik yüklenmez,
 *    sonraki ziyarette yeniden sorulur.
 *  - Rıza yoksa gtag.js ve fbevents.js HİÇ yüklenmez (decideTrackers).
 *  - Geri alma: altbilgideki "Çerez Tercihleri" → izin azaltılırsa bilinen
 *    çerezler silinir ve sayfa yenilenir (yüklenmiş betik başka türlü durmaz).
 *  - Her seçim cookie_consent_records'a ispat olarak yazılır.
 * Hiçbir araç açık değilse hiçbir şey render etmez ve çerez yazmaz.
 */
export function CookieConsent({ storeSlug, settings, cookiePolicyHref }: { storeSlug: string; settings: StoreTrackingSettings; cookiePolicyHref: string | null }) {
  const tools = activeTools(settings);
  const pathname = usePathname() ?? "/";
  const [consent, setConsent] = useState<ConsentChoice | null>(null);
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [draft, setDraft] = useState({ a: false, m: false });
  const [loadedKey, setLoadedKey] = useState("");
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // Kayıtlı seçimi oku (çerez yalnız tarayıcıda).
  useEffect(() => {
    if (!tools.any) return;
    const stored = readConsentCookie(document.cookie);
    const handle = window.setTimeout(() => {
      setConsent(stored);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(handle);
  }, [tools.any]);

  // Altbilgideki "Çerez Tercihleri".
  useEffect(() => {
    if (!tools.any) return;
    const open = () => {
      const current = readConsentCookie(document.cookie);
      setDraft(consentIsCurrent(settings, current) ? { a: current.a, m: current.m } : { a: false, m: false });
      setPrefsOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, open);
    return () => window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, open);
  }, [tools.any, settings]);

  const trackable = isTrackablePath(pathname);
  const decision = decideTrackers(settings, consent);

  // Betik kapısı: yalnız karar izin veriyorsa ve bir kez.
  useEffect(() => {
    if (!ready || !trackable) return;
    const key = loadTrackers(decision);
    if (key) {
      const handle = window.setTimeout(() => setLoadedKey(key), 0);
      return () => window.clearTimeout(handle);
    }
    // decision nesnesi her render'da yeniden oluşur; kimlikler değişince yeniden değerlendir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, trackable, decision.ga4MeasurementId, decision.metaPixelId, decision.googleAdsId]);

  // PageView: ilk yüklemede ve App Router yol değişiminde bir kez; ardından
  // betik yüklenmeden önce gelen sayfa olayları (ürün görüntüleme vb.).
  useEffect(() => {
    if (!loadedKey || !trackable) return;
    trackPageView(pathname);
    flushTrackingQueue();
  }, [loadedKey, pathname, trackable]);

  useEffect(() => {
    if (!prefsOpen) return;
    panelRef.current?.querySelector<HTMLElement>("input:not([disabled]), button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPrefsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prefsOpen]);

  if (!tools.any || !ready || !trackable) return null;

  function save(a: boolean, m: boolean, action: "accept_all" | "reject_all" | "custom") {
    const previous = consentIsCurrent(settings, consent) ? consent : null;
    const id = consent?.id ?? crypto.randomUUID();
    const choice: ConsentChoice = { v: settings.consentVersion, a: tools.analytics && a, m: tools.marketing && m, id, ts: Date.now() };
    const maxAge = CONSENT_MAX_AGE_DAYS * 24 * 60 * 60;
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(serializeConsentCookie(choice))}; Max-Age=${maxAge}; Path=/; SameSite=Lax; Secure`;
    const reduced = Boolean(previous && ((previous.a && !choice.a) || (previous.m && !choice.m)));
    void recordCookieConsentAction(storeSlug, {
      consentId: id,
      analytics: choice.a,
      marketing: choice.m,
      action: reduced && !choice.a && !choice.m ? "withdraw" : action,
    }).finally(() => {
      if (reduced) {
        // Yüklenmiş betik durdurulamaz: bilinen çerezleri sil, sayfayı yenile.
        clearTrackingCookies();
        window.location.reload();
      }
    });
    setConsent(choice);
    setPrefsOpen(false);
  }

  const showBanner = needsConsentPrompt(settings, consent) && !dismissed;
  const equalButton =
    "min-h-[44px] rounded-full border border-[#3A3A3A] bg-[#262626] px-5 text-sm font-semibold text-[#F5F5F5] hover:border-[#737373] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5F5F5]";

  return (
    <>
      {showBanner ? (
        <section aria-label="Çerez tercihleri" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#292929] bg-[#171717] text-[#F5F5F5] print:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <p className="pr-8 text-sm leading-relaxed text-[#E5E5E5] md:pr-0">
              {consentBannerText(settings)}{" "}
              {cookiePolicyHref ? (
                <Link href={cookiePolicyHref} className="underline underline-offset-2 hover:text-white">
                  Ayrıntı: Çerez Politikası
                </Link>
              ) : null}
            </p>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
              <button type="button" onClick={() => save(true, true, "accept_all")} className={equalButton}>
                Kabul Et
              </button>
              <button type="button" onClick={() => save(false, false, "reject_all")} className={equalButton}>
                Reddet
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft({ a: false, m: false });
                  setPrefsOpen(true);
                }}
                className="min-h-[44px] px-3 text-sm text-[#E5E5E5] underline underline-offset-2 hover:text-white"
              >
                Tercihler
              </button>
            </div>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Bandı kapat (seçim yapılmadı; analitik ve reklam çerezleri yüklenmez)"
              className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center text-[#A3A3A3] hover:text-white md:static md:h-9 md:w-9"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </section>
      ) : null}

      {prefsOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center print:hidden" onClick={() => setPrefsOpen(false)}>
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg rounded-[14px] border border-[#292929] bg-[#171717] p-5 text-[#F5F5F5]"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id={titleId} className="text-base font-semibold">
                Çerez tercihleri
              </h2>
              <button type="button" onClick={() => setPrefsOpen(false)} aria-label="Kapat" className="flex h-11 w-11 items-center justify-center text-[#A3A3A3] hover:text-white">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-3 space-y-3 text-sm">
              <label className="flex items-start gap-3 rounded-md border border-[#292929] p-3">
                <input type="checkbox" checked disabled className="mt-1 h-4 w-4" />
                <span>
                  <span className="font-medium">Zorunlu</span> (her zaman açık)
                  <span className="mt-0.5 block text-xs text-[#A3A3A3]">Sepet, oturum ve bu tercihin hatırlanması için gereklidir; kapatılamaz.</span>
                </span>
              </label>
              {tools.analytics ? (
                <label className="flex items-start gap-3 rounded-md border border-[#292929] p-3">
                  <input type="checkbox" checked={draft.a} onChange={(event) => setDraft((d) => ({ ...d, a: event.target.checked }))} className="mt-1 h-4 w-4" />
                  <span>
                    <span className="font-medium">Analitik</span> (Google Analytics)
                    <span className="mt-0.5 block text-xs text-[#A3A3A3]">Ziyaret istatistikleri. Veriler yurt dışındaki hizmet sağlayıcıya aktarılabilir.</span>
                  </span>
                </label>
              ) : null}
              {tools.marketing ? (
                <label className="flex items-start gap-3 rounded-md border border-[#292929] p-3">
                  <input type="checkbox" checked={draft.m} onChange={(event) => setDraft((d) => ({ ...d, m: event.target.checked }))} className="mt-1 h-4 w-4" />
                  <span>
                    <span className="font-medium">Reklam / pazarlama</span> ({[tools.meta ? "Meta Pixel" : null, tools.ads ? "Google Ads" : null].filter(Boolean).join(", ")})
                    <span className="mt-0.5 block text-xs text-[#A3A3A3]">Reklam ölçümü. Veriler yurt dışındaki hizmet sağlayıcılara aktarılabilir.</span>
                  </span>
                </label>
              ) : null}
            </div>
            {cookiePolicyHref ? (
              <p className="mt-3 text-xs text-[#A3A3A3]">
                Ayrıntılar:{" "}
                <Link href={cookiePolicyHref} className="underline underline-offset-2 hover:text-white" onClick={() => setPrefsOpen(false)}>
                  Çerez Politikası
                </Link>
              </p>
            ) : null}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => save(draft.a, draft.m, "custom")} className={equalButton}>
                Seçimi Kaydet
              </button>
              <button type="button" onClick={() => save(false, false, "reject_all")} className={equalButton}>
                Tümünü Reddet
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Yapılandırılmış kimlikler (aynı sayfada iki kez config/init yok). */
const configured = new Set<string>();

/**
 * Kararın gerektirdiği betikleri yükler (her betik bir kez) ve izin
 * genişlediyse yeni kimlikleri yapılandırır. Yüklenen kümenin anahtarını
 * döner (hiçbiri yoksa ""). İzin daraltılması burada değil, save() içinde
 * sayfa yenilenerek uygulanır.
 */
function loadTrackers(decision: TrackerDecision): string {
  if (!decision.loadGtag && !decision.metaPixelId) return "";
  if (decision.loadGtag) {
    if (!window.gtag) {
      window.dataLayer = window.dataLayer || [];
      // Google'ın gtag tanımı: dataLayer'a "arguments" nesnesi itilir.
      window.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments);
      };
      // Temel consent mode: önce hepsi reddedilmiş.
      window.gtag("consent", "default", { ad_storage: "denied", analytics_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
      window.gtag("js", new Date());
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(decision.ga4MeasurementId ?? decision.googleAdsId ?? "")}`;
      document.head.appendChild(script);
    }
    window.gtag("consent", "update", {
      analytics_storage: decision.ga4MeasurementId ? "granted" : "denied",
      ad_storage: decision.googleAdsId ? "granted" : "denied",
      ad_user_data: decision.googleAdsId ? "granted" : "denied",
      ad_personalization: decision.googleAdsId ? "granted" : "denied",
    });
    if (decision.ga4MeasurementId && !configured.has(decision.ga4MeasurementId)) {
      window.gtag("config", decision.ga4MeasurementId, { send_page_view: false });
      configured.add(decision.ga4MeasurementId);
    }
    if (decision.googleAdsId && !configured.has(decision.googleAdsId)) {
      window.gtag("config", decision.googleAdsId);
      configured.add(decision.googleAdsId);
    }
  }
  if (decision.metaPixelId) {
    if (!window.fbq) {
      // Meta'nın resmî fbevents yükleyicisiyle aynı kuyruk düzeni.
      const fbq = function fbqStub(...args: unknown[]) {
        if (fbq.callMethod) fbq.callMethod(...args);
        else fbq.queue.push(args);
      } as ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[]; loaded: boolean; version: string; push: (...args: unknown[]) => void };
      fbq.queue = [];
      fbq.loaded = true;
      fbq.version = "2.0";
      fbq.push = fbq;
      window.fbq = fbq;
      window._fbq = fbq;
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(script);
    }
    if (!configured.has(decision.metaPixelId) && window.fbq) {
      window.fbq("consent", "grant");
      window.fbq("init", decision.metaPixelId);
      configured.add(decision.metaPixelId);
    }
  }
  window.__mbTracking = {
    ga4MeasurementId: decision.ga4MeasurementId,
    googleAdsId: decision.googleAdsId,
    googleAdsPurchaseLabel: decision.googleAdsPurchaseLabel,
    metaPixelId: decision.metaPixelId,
  };
  return [decision.ga4MeasurementId, decision.googleAdsId, decision.metaPixelId].filter(Boolean).join("|");
}

function clearTrackingCookies() {
  const names = document.cookie.split(";").map((part) => part.trim().split("=")[0]).filter(Boolean);
  const host = window.location.hostname;
  const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const name of trackingCookiesToClear(names)) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/${domain ? `; Domain=${domain}` : ""}`;
    }
  }
}

/** Altbilgi bağlantısı: paneli açar (yalnız en az bir araç açıkken gösterilir). */
export function CookiePreferencesLink({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT))} className={className}>
      Çerez Tercihleri
    </button>
  );
}
