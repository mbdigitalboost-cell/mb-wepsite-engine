/**
 * Faz 35 — MAĞAZA BAŞINA TAKİP / REKLAM ARAÇLARI VE ÇEREZ RIZASI (saf;
 * tests/store-tracking.test.ts). Ayar: store_tracking_settings (migration
 * 0051). Platform env'lerindeki GTM/GA4/Pixel kimlikleri vitrinde
 * KULLANILMAZ (Petra'nın TrackingScripts yolu ayrı ve dokunulmadı).
 *
 * KVKK Kurumu "Çerez Uygulamaları Hakkında Rehber": analitik ve reklam
 * çerezleri açık rızaya tabidir; rıza önceden işaretli/varsayılan olamaz;
 * Kabul ve Reddet eşit; rıza verilmeden betik yüklenmez; kolayca geri alınır.
 */

export interface StoreTrackingSettings {
  metaPixelId: string | null;
  metaEnabled: boolean;
  ga4MeasurementId: string | null;
  ga4Enabled: boolean;
  googleAdsId: string | null;
  googleAdsPurchaseLabel: string | null;
  googleAdsEnabled: boolean;
  consentVersion: number;
}

export const NO_TRACKING: StoreTrackingSettings = {
  metaPixelId: null,
  metaEnabled: false,
  ga4MeasurementId: null,
  ga4Enabled: false,
  googleAdsId: null,
  googleAdsPurchaseLabel: null,
  googleAdsEnabled: false,
  consentVersion: 1,
};

/** Biçimler (DB CHECK ile aynı). */
export const META_PIXEL_ID_PATTERN = /^[0-9]{10,20}$/;
export const GA4_ID_PATTERN = /^G-[A-Z0-9]{4,20}$/;
export const GOOGLE_ADS_ID_PATTERN = /^AW-[0-9]{6,15}$/;
export const GOOGLE_ADS_LABEL_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

export interface ActiveTools {
  ga4: boolean;
  meta: boolean;
  ads: boolean;
  /** Analitik kategorisi (GA4) gösterilsin mi. */
  analytics: boolean;
  /** Reklam/pazarlama kategorisi (Meta Pixel, Google Ads) gösterilsin mi. */
  marketing: boolean;
  any: boolean;
}

export function activeTools(settings: StoreTrackingSettings): ActiveTools {
  const ga4 = settings.ga4Enabled && Boolean(settings.ga4MeasurementId && GA4_ID_PATTERN.test(settings.ga4MeasurementId));
  const meta = settings.metaEnabled && Boolean(settings.metaPixelId && META_PIXEL_ID_PATTERN.test(settings.metaPixelId));
  const ads = settings.googleAdsEnabled && Boolean(settings.googleAdsId && GOOGLE_ADS_ID_PATTERN.test(settings.googleAdsId));
  return { ga4, meta, ads, analytics: ga4, marketing: meta || ads, any: ga4 || meta || ads };
}

/** Etkin araç kümesinin imzası — değişirse consent_version artırılır. */
export function activeToolsSignature(settings: StoreTrackingSettings): string {
  const tools = activeTools(settings);
  return [tools.ga4 ? "ga4" : "", tools.meta ? "meta" : "", tools.ads ? "ads" : ""].filter(Boolean).join(",");
}

// --- Tercih çerezi ------------------------------------------------------------

export const CONSENT_COOKIE = "mb_consent";
export const CONSENT_MAX_AGE_DAYS = 180;

export interface ConsentChoice {
  /** Rızanın verildiği consent_version. */
  v: number;
  /** Analitik izni. */
  a: boolean;
  /** Reklam/pazarlama izni. */
  m: boolean;
  /** Tarayıcıda üretilen rastgele kimlik (kişiye bağlanmaz; ispat kaydını eşler). */
  id: string;
  /** Seçim zamanı (ms). */
  ts: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function serializeConsentCookie(choice: ConsentChoice): string {
  return `v${choice.v}.a${choice.a ? 1 : 0}.m${choice.m ? 1 : 0}.${choice.id}.${choice.ts}`;
}

export function parseConsentCookie(raw: string | null | undefined): ConsentChoice | null {
  if (!raw) return null;
  const match = /^v(\d{1,6})\.a([01])\.m([01])\.([0-9a-f-]{36})\.(\d{1,15})$/i.exec(raw.trim());
  if (!match || !UUID.test(match[4])) return null;
  return { v: Number(match[1]), a: match[2] === "1", m: match[3] === "1", id: match[4], ts: Number(match[5]) };
}

export function readConsentCookie(cookieHeader: string): ConsentChoice | null {
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === CONSENT_COOKIE) {
      try {
        return parseConsentCookie(decodeURIComponent(rest.join("=")));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Kayıtlı seçim bu araç kümesi için geçerli mi (sürüm aynı)? */
export function consentIsCurrent(settings: StoreTrackingSettings, consent: ConsentChoice | null): consent is ConsentChoice {
  return consent !== null && consent.v === settings.consentVersion;
}

/** Bant gösterilsin mi: en az bir araç açık VE geçerli bir seçim yok. */
export function needsConsentPrompt(settings: StoreTrackingSettings, consent: ConsentChoice | null): boolean {
  return activeTools(settings).any && !consentIsCurrent(settings, consent);
}

export interface TrackerDecision {
  ga4MeasurementId: string | null;
  metaPixelId: string | null;
  googleAdsId: string | null;
  googleAdsPurchaseLabel: string | null;
  /** gtag.js yüklenmeli mi (GA4 ya da Ads). */
  loadGtag: boolean;
}

/**
 * EN KRİTİK KURAL: rıza yoksa (ya da eski sürümse) HİÇBİR betik.
 * Analitik izni → GA4. Pazarlama izni → Meta Pixel + Google Ads.
 * Araç kapalıysa izin olsa da yüklenmez.
 */
export function decideTrackers(settings: StoreTrackingSettings, consent: ConsentChoice | null): TrackerDecision {
  const none: TrackerDecision = { ga4MeasurementId: null, metaPixelId: null, googleAdsId: null, googleAdsPurchaseLabel: null, loadGtag: false };
  if (!consentIsCurrent(settings, consent)) return none;
  const tools = activeTools(settings);
  const ga4MeasurementId = tools.ga4 && consent.a ? settings.ga4MeasurementId : null;
  const metaPixelId = tools.meta && consent.m ? settings.metaPixelId : null;
  const googleAdsId = tools.ads && consent.m ? settings.googleAdsId : null;
  const googleAdsPurchaseLabel = googleAdsId && settings.googleAdsPurchaseLabel ? settings.googleAdsPurchaseLabel : null;
  return { ga4MeasurementId, metaPixelId, googleAdsId, googleAdsPurchaseLabel, loadGtag: Boolean(ga4MeasurementId || googleAdsId) };
}

/** Betik ve bant yalnız vitrin sayfalarında; görsel rotaları, API, panel yolları asla. */
export function isTrackablePath(pathname: string): boolean {
  const blocked = ["/api", "/paylasim", "/dashboard", "/login", "/mfa-challenge", "/auth"];
  if (blocked.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return false;
  return !/\/store\/[^/]+\/paylasim(\/|$)/.test(pathname);
}

// --- İzin geri alındığında silinecek çerezler (resmî adlar) ---------------------

/** Google: _ga, _ga_<container-id>, _gcl_*; Meta: _fbp, _fbc. */
export function trackingCookiesToClear(cookieNames: readonly string[]): string[] {
  return cookieNames.filter((name) => name === "_ga" || name.startsWith("_ga_") || name.startsWith("_gcl_") || name === "_fbp" || name === "_fbc");
}

// --- Metinler -----------------------------------------------------------------

/** Bant metninde yalnız AÇIK araçlar sayılır. */
export function consentBannerText(settings: StoreTrackingSettings): string {
  const tools = activeTools(settings);
  const purposes: string[] = [];
  if (tools.analytics) purposes.push("ziyaret istatistikleri (Google Analytics)");
  if (tools.marketing) {
    const names = [tools.meta ? "Meta" : null, tools.ads ? "Google Ads" : null].filter(Boolean).join(", ");
    purposes.push(`reklam ölçümü (${names})`);
  }
  const list = purposes.length > 1 ? `${purposes.slice(0, -1).join(", ")} ve ${purposes[purposes.length - 1]}` : (purposes[0] ?? "");
  return `Sitemizde zorunlu çerezlerin yanında, izin verirseniz ${list} için çerezler kullanılır. Bu araçlarla veriler yurt dışındaki hizmet sağlayıcılara aktarılabilir.`;
}

/**
 * Çerez Politikası "{{cerez.ucuncu_taraf}}" bölümü — mağazanın GERÇEK ayarından.
 * Çerez adları/süreleri: Google Analytics Yardım "[GA4] Cookie usage on
 * websites" (_ga, _ga_<container-id>: 2 yıl); Google "How Google uses cookies"
 * (_gcl_: 90 gün); Meta "ClickID and the fbp and fbc Parameters" (_fbc: 90 gün;
 * _fbp süresi belirtilmiyor).
 */
export function thirdPartyCookieSection(settings: StoreTrackingSettings): string {
  const tools = activeTools(settings);
  if (!tools.any) {
    return "Sitemizde bugün analitik, reklam veya pazarlama amaçlı üçüncü taraf çerezi kullanılmamaktadır. Bu tür araçlar kullanılmaya başlanırsa bu politika güncellenir ve ilgili çerezler yalnız açık onayınızdan sonra çalıştırılır.";
  }
  const lines: string[] = [
    "Aşağıdaki araçlar yalnız sitemizin altındaki çerez bandında ya da \"Çerez Tercihleri\" panelinde **izin verirseniz** yüklenir; izin vermezseniz hiçbiri çalışmaz ve siteyi kullanmaya devam edebilirsiniz.",
    "",
  ];
  if (tools.ga4) {
    lines.push(
      "- **Google Analytics 4** (Google LLC / Google Ireland Limited) — amaç: ziyaret istatistikleri (analitik izni). Çerezler: **_ga** (ziyaretçileri ayırt eder, 2 yıl), **_ga_<kimlik>** (oturum durumunu tutar, 2 yıl).",
    );
  }
  if (tools.ads) {
    lines.push("- **Google Ads dönüşüm ölçümü** (Google) — amaç: reklam ölçümü (reklam/pazarlama izni). Çerezler: **_gcl_** ile başlayan çerezler (reklam tıklamasından sonraki işlemleri ölçer, 90 gün).");
  }
  if (tools.meta) {
    lines.push(
      "- **Meta Pixel** (Meta Platforms Ireland Limited / Meta Platforms, Inc.) — amaç: reklam ölçümü (reklam/pazarlama izni). Çerezler: **_fbp** (ziyaretçi tarayıcısını ayırt eder; süresi Meta'nın çerez politikasında belirtilir), **_fbc** (reklam tıklama kimliği, 90 gün).",
    );
  }
  lines.push(
    "",
    "Bu araçlara ad, telefon, e-posta veya adres gibi kişisel bilgileriniz gönderilmez; yalnız sayfa görüntüleme, ürün görüntüleme, sepete ekleme ve sipariş (tutar ve sipariş kimliği) gibi olaylar iletilir. Bu sağlayıcıların sunucuları yurt dışında bulunduğundan veriler yurt dışına aktarılabilir; aktarım, KVKK'nın 9. maddesi kapsamında verdiğiniz açık rızaya dayanır.",
    "",
    "Tercihinizi istediğiniz zaman sayfanın altındaki **Çerez Tercihleri** bağlantısından değiştirebilir veya geri alabilirsiniz; izninizi geri aldığınızda bu araçlar durdurulur ve sitemizin alan adındaki ilgili çerezler silinir.",
  );
  return lines.join("\n");
}
