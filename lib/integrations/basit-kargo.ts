import "server-only";

/**
 * Basit Kargo (basitkargo.com) API istemcisi — Faz 20'de yazıldı, Faz 21'de
 * token MAĞAZA BAZLI oldu: her fonksiyon token'ı parametre olarak alır
 * (store_shipping_integrations.api_token, service-role ile okunur — bkz.
 * lib/integrations/store-shipping-integration.ts). Env fallback'i YOK:
 * panel çok kiracılı, tek bir env token'ı başka bir mağazanın siparişinde
 * kullanılabilirdi.
 *
 * Resmî doküman (https://basitkargo.com/api) Faz 21'de yeniden okundu;
 * kullanılan uçlar ve belgelenen alanlar:
 *  - GET  /handlers                      → [{ name, code, logo }]
 *  - POST /v2/order                      → barkodsuz sipariş; yanıt { id, barcode, type, status, validationFailed, createdTime }
 *  - POST /v2/order/{id}/barcode         → var olan siparişe barkod; gövde { handlerCode } (zorunlu); yanıt shipmentInfo{handler{name,code},handlerShipmentCode}
 *  - POST /v2/order/barcode              → oluştur + barkod tek çağrı
 *  - DELETE /order/{id}                  → sipariş sil (/v2 öneki YOK, dokümandaki gibi)
 *  - GET  /label/svg/{id}                → etiket SVG
 *
 * Idempotency-Key SADECE üç POST ucunda destekleniyor; doküman "aynı
 * anahtar farklı uç/gövdeyle → 422" dediği için her uç için siparişe bağlı
 * AYRI anahtar: `${orderId}:push` / `${orderId}:ship` / `${orderId}:barcode`.
 * Doküman: sipariş oluşmadan hata olursa anahtar serbest kalır (tekrar
 * deneme çalışır), 24 saat saklanır (çift tıklama ikinci sipariş yaratmaz).
 */

const BASE_URL = "https://basitkargo.com/api";
/** Dokümanın önerdiği istemci zaman aşımı (Idempotency bölümü): 90 sn. */
const REQUEST_TIMEOUT_MS = 90_000;
const HANDLERS_CACHE_SECONDS = 3600;

export class BasitKargoConfigError extends Error {
  constructor() {
    super("Kargo entegrasyonu kurulmadı — Mağaza → Kargo Entegrasyonu sayfasından Basit Kargo API anahtarını girin.");
    this.name = "BasitKargoConfigError";
  }
}

export class BasitKargoApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "BasitKargoApiError";
    this.status = status;
  }
}

export interface BasitKargoHandler {
  name: string;
  code: string;
  logo?: string;
}

/**
 * Dokümandaki iki özel `handlerCode` değeri — firma listesinden değil,
 * stratejiden seçim: Basit Kargo her sipariş için en ucuz/en hızlı
 * firmayı kendisi hesaplar.
 */
export const BASIT_KARGO_STRATEGY_HANDLERS: readonly BasitKargoHandler[] = [
  { code: "ECONOMIC", name: "En Ucuz Firma (otomatik)" },
  { code: "FAST", name: "En Hızlı Firma (otomatik)" },
];

async function readErrorMessage(response: Response): Promise<string> {
  // Doküman genel bir hata şeması belgelemiyor — `message`/`error` alanı
  // varsa onu, yoksa ham gövdeyi, o da yoksa HTTP durumunu admin'e AYNEN
  // gösteriyoruz (sessizce yutulmaz).
  const text = await response.text().catch(() => "");
  if (text) {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const candidate = parsed.message ?? parsed.error ?? parsed.detail;
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    } catch {
      // JSON değil — ham metni kullan.
    }
    return text.slice(0, 300);
  }
  if (response.status === 401) return "Basit Kargo API anahtarı reddedildi (401) — anahtarı kontrol edin.";
  if (response.status === 429) return "İstek limiti aşıldı (429), biraz sonra tekrar deneyin.";
  return `Basit Kargo HTTP ${response.status}`;
}

async function basitKargoFetch(
  token: string,
  path: string,
  init: RequestInit & { next?: { revalidate: number } } = {},
): Promise<Response> {
  if (!token) throw new BasitKargoConfigError();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new BasitKargoApiError(response.status, await readErrorMessage(response));
  }
  return response;
}

/** GET /handlers — hesaba açık firmalar (koda sabit liste YAZILMADI). 1 saat önbellek. */
export async function getHandlers(token: string): Promise<BasitKargoHandler[]> {
  const response = await basitKargoFetch(token, "/handlers", {
    method: "GET",
    next: { revalidate: HANDLERS_CACHE_SECONDS },
  });
  const data = (await response.json()) as unknown;
  if (!Array.isArray(data)) return [];
  return data
    .filter((item): item is BasitKargoHandler => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Record<string, unknown>;
      return typeof candidate.code === "string" && typeof candidate.name === "string";
    })
    .map((item) => ({ code: item.code, name: item.name, logo: typeof item.logo === "string" ? item.logo : undefined }));
}

/** `orders` satırının kargo için gereken alt kümesi — bkz. lib/supabase/types.ts `orders.Row`. */
export interface ShippableOrder {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  address_city: string;
  address_district: string;
  address_neighborhood: string | null;
  address_line: string;
  subtotal: number;
  discount_amount: number;
  payment_method: string | null;
  payment_status: string;
  /** Faz 25 — ürün + renk özeti ("Kılıf (Coyote (Çöl)) ×1"); varsa içerik adına eklenir. */
  content_summary?: string | null;
}

export interface ShipmentResult {
  basitKargoOrderId: string;
  barcode: string;
  handlerName: string | null;
  handlerShipmentCode: string | null;
}

const COD_PAYMENT_METHODS: Record<string, "CASH" | "CREDIT_CARD"> = {
  "Kapıda Nakit": "CASH",
  "Kapıda Kart": "CREDIT_CARD",
};

/**
 * Türkiye'de kargo faturası max(ağırlık, desi) üzerinden kesilir; desi =
 * (en×boy×yükseklik)/3000. Tek bir "desi/kg" değerini dürüstçe temsil
 * etmek için ağırlık = değer kg, boyutlar ise hacmi değer×3000 cm³ olan
 * bir küp — böylece hesaplanan desi de aynı değere çıkar.
 */
function packageFromDesiKg(desiKg: number) {
  const side = Math.max(1, Math.round(Math.cbrt(desiKg * 3000) * 10) / 10);
  return { height: side, width: side, depth: side, weight: desiKg };
}

/** "0555...", "555...", "+90 555..." → "05XXXXXXXXX" (son 10 hane, başına 0). */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return digits;
  return `0${digits.slice(-10)}`;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Ortak sipariş gövdesi (POST /v2/order ve POST /v2/order/barcode aynı
 * modeli alır; ikincisi ek olarak handlerCode ister).
 *
 * Kapıda ödeme ayrımı (en kritik kural — yanlış ayarlanırsa müşteriden
 * fazla/eksik tahsilat): `collect` + `collectOnDeliveryType` SADECE
 * `payment_status='unpaid'` VE `payment_method` Kapıda Nakit/Kapıda Kart
 * ise gönderilir. Zaten `paid` olan siparişte `collect` HİÇ gönderilmez.
 */
function buildOrderBody(order: ShippableOrder, desiKg: number): Record<string, unknown> {
  const total = roundMoney(Number(order.subtotal) - Number(order.discount_amount ?? 0));
  const codType = order.payment_method ? COD_PAYMENT_METHODS[order.payment_method] : undefined;
  const isCashOnDelivery = order.payment_status === "unpaid" && Boolean(codType);

  const orderPaymentType = isCashOnDelivery
    ? "COLLECT_ON_DELIVERY"
    : order.payment_method === "Havale-EFT"
      ? "BANK_TRANSFER"
      : codType === "CREDIT_CARD"
        ? "CREDIT_CARD"
        : "OTHER";

  const body: Record<string, unknown> = {
    type: "OUTGOING",
    orderTotal: total,
    orderPaymentType,
    orderPaymentStatus: order.payment_status === "paid" ? "PAID" : "UNPAID",
    content: {
      // Faz 25 — kargo etiketinde/panelinde ürün adının yanında renk görünsün.
      name: order.content_summary ? `#${order.order_number} ${order.content_summary}`.slice(0, 200) : `Sipariş #${order.order_number}`,
      // Webhook payload'ındaki `orderNumber` bu değerle geri gelir (doküman).
      code: `#${order.order_number}`,
      packages: [packageFromDesiKg(desiKg)],
    },
    client: {
      name: order.customer_name,
      phone: normalizePhone(order.customer_phone),
      ...(order.customer_email ? { email: order.customer_email } : {}),
      city: order.address_city,
      town: order.address_district,
      address: [order.address_neighborhood, order.address_line].filter(Boolean).join(" "),
    },
  };

  if (isCashOnDelivery && codType) {
    body.collect = total;
    body.collectOnDeliveryType = codType;
  }

  return body;
}

function parseShipmentResponse(data: unknown, status: number): ShipmentResult {
  const record = (data ?? {}) as {
    id?: unknown;
    barcode?: unknown;
    shipmentInfo?: { handler?: { name?: unknown }; handlerShipmentCode?: unknown };
  };
  if (typeof record.id !== "string" || typeof record.barcode !== "string" || !record.barcode) {
    throw new BasitKargoApiError(status, "Basit Kargo yanıtında barkod yok — kargo kodu üretilmemiş olabilir.");
  }
  const handlerName = record.shipmentInfo?.handler?.name;
  const handlerShipmentCode = record.shipmentInfo?.handlerShipmentCode;
  return {
    basitKargoOrderId: record.id,
    barcode: record.barcode,
    handlerName: typeof handlerName === "string" ? handlerName : null,
    handlerShipmentCode: typeof handlerShipmentCode === "string" ? handlerShipmentCode : null,
  };
}

/**
 * Faz 21 — POST /v2/order: BARKODSUZ sipariş oluşturur (onaylanınca
 * otomatik gönderim). Firma/barkod sonra "Kargoya Hazırla" ile
 * (generateBarcode). Yanıttan sadece Basit Kargo sipariş id'si kullanılır.
 */
export async function createOrder(token: string, order: ShippableOrder, desiKg: number): Promise<{ basitKargoOrderId: string }> {
  const response = await basitKargoFetch(token, "/v2/order", {
    method: "POST",
    headers: { "Idempotency-Key": `${order.id}:push` },
    body: JSON.stringify(buildOrderBody(order, desiKg)),
    cache: "no-store",
  });
  const data = (await response.json()) as { id?: unknown };
  if (typeof data.id !== "string" || !data.id) {
    throw new BasitKargoApiError(response.status, "Basit Kargo yanıtında sipariş id'si yok.");
  }
  return { basitKargoOrderId: data.id };
}

/**
 * Faz 21 — POST /v2/order/{id}/barcode: Basit Kargo'da ZATEN var olan
 * (otomatik gönderilmiş) sipariş için barkod üretir. Doküman: gövde
 * yalnızca { handlerCode } (zorunlu).
 */
export async function generateBarcode(
  token: string,
  order: Pick<ShippableOrder, "id">,
  basitKargoOrderId: string,
  handlerCode: string,
): Promise<ShipmentResult> {
  const response = await basitKargoFetch(token, `/v2/order/${encodeURIComponent(basitKargoOrderId)}/barcode`, {
    method: "POST",
    headers: { "Idempotency-Key": `${order.id}:barcode` },
    body: JSON.stringify({ handlerCode }),
    cache: "no-store",
  });
  return parseShipmentResponse(await response.json(), response.status);
}

/** POST /v2/order/barcode — oluştur + barkod tek çağrı (Basit Kargo'da henüz kaydı olmayan sipariş için). */
export async function createShipment(
  token: string,
  { order, handlerCode, desiKg }: { order: ShippableOrder; handlerCode: string; desiKg: number },
): Promise<ShipmentResult> {
  const response = await basitKargoFetch(token, "/v2/order/barcode", {
    method: "POST",
    headers: { "Idempotency-Key": `${order.id}:ship` },
    body: JSON.stringify({ handlerCode, ...buildOrderBody(order, desiKg) }),
    cache: "no-store",
  });
  return parseShipmentResponse(await response.json(), response.status);
}

/** DELETE /order/{id} — "Sipariş Sil" (dokümanda /v2 öneki YOK). Barkodu olmayan, iptal edilen siparişler için. */
export async function cancelOrder(token: string, basitKargoOrderId: string): Promise<void> {
  await basitKargoFetch(token, `/order/${encodeURIComponent(basitKargoOrderId)}`, {
    method: "DELETE",
    cache: "no-store",
  });
}

/** GET /label/svg/{id} — etiket SVG'si (sipariş detayındaki "Etiketi İndir"). */
export async function getLabelSvg(token: string, basitKargoOrderId: string): Promise<string> {
  const response = await basitKargoFetch(token, `/label/svg/${encodeURIComponent(basitKargoOrderId)}`, {
    method: "GET",
    cache: "no-store",
  });
  return response.text();
}
