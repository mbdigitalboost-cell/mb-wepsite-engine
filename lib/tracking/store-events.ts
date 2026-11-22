/**
 * Faz 35 Kısım D — vitrin olayları (istemci). Yalnız rıza verilip betik
 * yüklendiyse gönderilir: window.__mbTracking yalnız CookieConsent betikleri
 * yüklediğinde dolar; yoksa her fonksiyon sessizce hiçbir şey yapmaz.
 * HİÇBİR olaya kişisel veri (ad, e-posta, telefon, adres) eklenmez; yalnız
 * ürün/sipariş kimliği, ürün adı, adet ve tutar (TRY).
 */

export interface LoadedTracking {
  ga4MeasurementId: string | null;
  googleAdsId: string | null;
  googleAdsPurchaseLabel: string | null;
  metaPixelId: string | null;
}

type Fn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Fn;
    fbq?: Fn & { callMethod?: Fn; queue?: unknown[]; loaded?: boolean; version?: string; push?: Fn };
    _fbq?: unknown;
    __mbTracking?: LoadedTracking;
    /** Betik yüklenmeden (henüz rıza yokken ya da yükleniyorken) gelen olaylar; yalnız rıza + yükleme sonrası gönderilir. */
    __mbTrackingQueue?: Array<() => void>;
  }
}

const QUEUE_LIMIT = 20;

/**
 * Betik henüz yüklenmediyse olayı kuyruğa alır (en fazla 20). Kuyruk YALNIZ
 * CookieConsent rıza sonrası betikleri yüklediğinde boşaltılır
 * (flushTrackingQueue); rıza hiç verilmezse hiçbir şey gönderilmez.
 */
function whenLoaded(send: () => void) {
  if (typeof window === "undefined") return;
  if (window.__mbTracking) {
    send();
    return;
  }
  const queue = (window.__mbTrackingQueue ??= []);
  if (queue.length < QUEUE_LIMIT) queue.push(send);
}

export function flushTrackingQueue() {
  if (typeof window === "undefined" || !window.__mbTracking) return;
  const queue = window.__mbTrackingQueue ?? [];
  window.__mbTrackingQueue = [];
  for (const send of queue) send();
}

export interface TrackedItem {
  id: string;
  name: string;
  variant?: string | null;
  price: number;
  quantity?: number;
}

const CURRENCY = "TRY";

function loaded(): LoadedTracking | null {
  return typeof window !== "undefined" && window.__mbTracking ? window.__mbTracking : null;
}

function ga(event: string, params: Record<string, unknown>) {
  const t = loaded();
  if (t?.ga4MeasurementId && window.gtag) window.gtag("event", event, { ...params, send_to: t.ga4MeasurementId });
}

function meta(event: string, params: Record<string, unknown>, options?: Record<string, unknown>) {
  if (loaded()?.metaPixelId && window.fbq) {
    if (options) window.fbq("track", event, params, options);
    else window.fbq("track", event, params);
  }
}

function gaItems(items: TrackedItem[]) {
  return items.map((item) => ({
    item_id: item.id,
    item_name: item.name,
    ...(item.variant ? { item_variant: item.variant } : {}),
    price: item.price,
    quantity: item.quantity ?? 1,
  }));
}

export function trackPageView(path: string) {
  const t = loaded();
  if (!t) return;
  if (t.ga4MeasurementId && window.gtag) window.gtag("event", "page_view", { page_path: path, page_location: window.location.href, send_to: t.ga4MeasurementId });
  if (t.metaPixelId && window.fbq) window.fbq("track", "PageView");
}

export function trackViewItem(item: TrackedItem) {
  whenLoaded(() => {
    ga("view_item", { currency: CURRENCY, value: item.price, items: gaItems([item]) });
    meta("ViewContent", { content_ids: [item.id], content_type: "product", content_name: item.name, value: item.price, currency: CURRENCY });
  });
}

export function trackAddToCart(item: TrackedItem) {
  const value = item.price * (item.quantity ?? 1);
  whenLoaded(() => {
    ga("add_to_cart", { currency: CURRENCY, value, items: gaItems([item]) });
    meta("AddToCart", { content_ids: [item.id], content_type: "product", value, currency: CURRENCY });
  });
}

export function trackBeginCheckout(value: number, items: TrackedItem[]) {
  whenLoaded(() => {
    ga("begin_checkout", { currency: CURRENCY, value, items: gaItems(items) });
    meta("InitiateCheckout", { content_ids: items.map((item) => item.id), content_type: "product", value, currency: CURRENCY, num_items: items.reduce((sum, item) => sum + (item.quantity ?? 1), 0) });
  });
}

/** Aynı sipariş için Purchase bir kez (sayfa yenilense de). Saf karar — testli. */
export function purchaseOnceKey(orderId: string): string {
  return `mb_purchase_${orderId}`;
}

export function shouldSendPurchase(storage: Pick<Storage, "getItem"> | null, orderId: string): boolean {
  if (!orderId) return false;
  try {
    return storage?.getItem(purchaseOnceKey(orderId)) !== "1";
  } catch {
    return true;
  }
}

/** Sipariş başarı ekranı: value = sunucunun hesapladığı genel toplam; kimlik = sipariş id. */
export function trackPurchase(orderId: string, value: number, items: TrackedItem[] = []) {
  if (!orderId) return;
  whenLoaded(() => sendPurchase(orderId, value, items));
}

function sendPurchase(orderId: string, value: number, items: TrackedItem[]) {
  const t = loaded();
  if (!t) return;
  let storage: Storage | null = null;
  try {
    storage = window.sessionStorage;
  } catch {
    storage = null;
  }
  if (!shouldSendPurchase(storage, orderId)) return;
  ga("purchase", { transaction_id: orderId, currency: CURRENCY, value, items: gaItems(items) });
  meta("Purchase", { value, currency: CURRENCY, content_ids: items.map((item) => item.id), content_type: "product" }, { eventID: orderId });
  if (t.googleAdsId && t.googleAdsPurchaseLabel && window.gtag) {
    window.gtag("event", "conversion", { send_to: `${t.googleAdsId}/${t.googleAdsPurchaseLabel}`, value, currency: CURRENCY, transaction_id: orderId });
  }
  try {
    storage?.setItem(purchaseOnceKey(orderId), "1");
  } catch {
    // depolama kapalı: tek seferlik koruma bu sekmede çalışmaz; sunucu tarafı tekilleştirme yok (eventID/transaction_id sağlayıcıda tekilleştirir).
  }
}
