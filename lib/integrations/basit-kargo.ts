import "server-only";

import { serverEnv } from "@/lib/config/env";

/**
 * Faz 20 — Basit Kargo (basitkargo.com) API istemcisi. Resmî doküman
 * (https://basitkargo.com/api) bu turda yeniden okundu; devir metninin
 * özetinden sapan iki nokta doğrudan dokümana göre uygulandı:
 *
 *  1. `POST /v2/order/barcode` gövdesinde ödeme bilgisi için belgelenen
 *     alanlar `orderPaymentType` (COLLECT_ON_DELIVERY/CREDIT_CARD/
 *     BANK_TRANSFER/OTHER) ve `orderPaymentStatus` (PAID/PENDING/UNPAID).
 *     `collect` (kapıda tahsil edilecek tutar) örnek gövdede var;
 *     `collectOnDeliveryType` (CASH/CREDIT_CARD) yalnızca `POST /v2/order`
 *     örneğinde geçiyor — aynı sipariş modeli olduğu için kapıda ödemede
 *     ikisi birden gönderiliyor (alan tanınmazsa görmezden gelinmesi
 *     beklenir; tahsilat TİPİNİN eksik gitmesinden daha güvenli).
 *  2. `Idempotency-Key`: doküman "sipariş oluşmadan hata olursa anahtar
 *     serbest kalır, tekrar eden istek 200 + Idempotency-Replayed döner,
 *     24 saat saklanır" diyor. Bu yüzden rastgele UUID DEĞİL, siparişin
 *     KENDİ uuid'si anahtar olarak kullanılıyor: aynı siparişe ikinci bir
 *     "Kargoya Hazırla" tıklaması ikinci bir kargo + ikinci ücret kesintisi
 *     yaratmaz, aynı barkodu geri alır; başarısız bir deneme (bakiye yok
 *     vb.) anahtarı serbest bıraktığı için düzeltme sonrası tekrar
 *     denemek de çalışır.
 *
 * Token (`BASIT_KARGO_API_TOKEN`) henüz tanımlı değil — her fonksiyon
 * token yoksa BasitKargoConfigError fırlatır, çağıran action bunu admin'e
 * net bir mesaj olarak gösterir; panel çökmez.
 */

const BASE_URL = "https://basitkargo.com/api";
/** Dokümanın önerdiği istemci zaman aşımı (Idempotency bölümü): 90 sn. */
const REQUEST_TIMEOUT_MS = 90_000;
const HANDLERS_CACHE_SECONDS = 3600;

export class BasitKargoConfigError extends Error {
  constructor() {
    super("Kargo API anahtarı henüz tanımlanmamış — ortam değişkenleri ayarlarından BASIT_KARGO_API_TOKEN ekleyin.");
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
 * firmayı kendisi hesaplar. Admin dropdown'unda GET /handlers'ın dinamik
 * listesinin üstünde gösterilir.
 */
export const BASIT_KARGO_STRATEGY_HANDLERS: readonly BasitKargoHandler[] = [
  { code: "ECONOMIC", name: "En Ucuz Firma (otomatik)" },
  { code: "FAST", name: "En Hızlı Firma (otomatik)" },
];

export function isBasitKargoConfigured(): boolean {
  return Boolean(serverEnv.basitKargoApiToken);
}

function requireToken(): string {
  const token = serverEnv.basitKargoApiToken;
  if (!token) throw new BasitKargoConfigError();
  return token;
}

async function readErrorMessage(response: Response): Promise<string> {
  // Doküman genel bir hata şeması belgelemiyor — `message`/`error` alanı
  // varsa onu, yoksa ham gövdeyi, o da yoksa HTTP durumunu admin'e AYNEN
  // gösteriyoruz (devir metni: "hata sessizce yutulmasın").
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
  if (response.status === 429) return "İstek limiti aşıldı (429), biraz sonra tekrar deneyin.";
  return `Basit Kargo HTTP ${response.status}`;
}

async function basitKargoFetch(
  path: string,
  init: RequestInit & { next?: { revalidate: number } } = {},
): Promise<Response> {
  const token = requireToken();
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
export async function getHandlers(): Promise<BasitKargoHandler[]> {
  const response = await basitKargoFetch("/handlers", { method: "GET", next: { revalidate: HANDLERS_CACHE_SECONDS } });
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
}

export interface CreateShipmentInput {
  order: ShippableOrder;
  handlerCode: string;
  /** Parti geneli tek değer (bkz. devir metni "Açık karar #1") — hem kg hem desi olarak gönderilir. */
  desiKg: number;
}

export interface CreateShipmentResult {
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
 * bir küp (kenar = ∛(değer×3000)) — böylece hesaplanan desi de aynı
 * değere çıkar.
 */
function packageFromDesiKg(desiKg: number) {
  const side = Math.max(1, Math.round(Math.cbrt(desiKg * 3000) * 10) / 10);
  return { height: side, width: side, depth: side, weight: desiKg };
}

/** "0555...", "555...", "+90 555..." → "05XXXXXXXXX" (son 10 hane, başına 0). 10 haneden kısaysa rakamları olduğu gibi gönder. */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return digits;
  return `0${digits.slice(-10)}`;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * POST /v2/order/barcode — sipariş oluşturur VE anında barkod üretir.
 *
 * Kapıda ödeme ayrımı (devir metninin en kritik maddesi — yanlış
 * ayarlanırsa müşteriden fazla/eksik tahsilat): `collect` SADECE
 * `payment_status='unpaid'` VE `payment_method` Kapıda Nakit/Kapıda Kart
 * ise gönderilir. Zaten `paid` olan siparişte (online/havale ya da admin'in
 * elle "ödendi" işaretlediği) `collect` HİÇ gönderilmez.
 */
export async function createShipment({ order, handlerCode, desiKg }: CreateShipmentInput): Promise<CreateShipmentResult> {
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
    handlerCode,
    orderTotal: total,
    orderPaymentType,
    orderPaymentStatus: order.payment_status === "paid" ? "PAID" : "UNPAID",
    content: {
      name: `Sipariş #${order.order_number}`,
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

  const response = await basitKargoFetch("/v2/order/barcode", {
    method: "POST",
    headers: { "Idempotency-Key": order.id },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await response.json()) as {
    id?: unknown;
    barcode?: unknown;
    shipmentInfo?: { handler?: { name?: unknown }; handlerShipmentCode?: unknown };
  };

  if (typeof data.id !== "string" || typeof data.barcode !== "string" || !data.barcode) {
    throw new BasitKargoApiError(response.status, "Basit Kargo yanıtında barkod yok — sipariş oluşmamış olabilir.");
  }

  const handlerName = data.shipmentInfo?.handler?.name;
  const handlerShipmentCode = data.shipmentInfo?.handlerShipmentCode;

  return {
    basitKargoOrderId: data.id,
    barcode: data.barcode,
    handlerName: typeof handlerName === "string" ? handlerName : null,
    handlerShipmentCode: typeof handlerShipmentCode === "string" ? handlerShipmentCode : null,
  };
}

/**
 * GET /label/svg/{id} — etiket SVG'si. Bu fazda UI'a BAĞLANMADI (devir
 * metninde opsiyonel): Basit Kargo sipariş id'si için `orders`'ta kolon
 * yok (sadece barkod `tracking_number`'da), id gerekirse
 * `GET /v2/order/barcode/{barcode}` ile çözülmeli — ayrı küçük takip
 * maddesi. Fonksiyon, o gün için hazır.
 */
export async function getLabelSvg(basitKargoOrderId: string): Promise<string> {
  const response = await basitKargoFetch(`/label/svg/${encodeURIComponent(basitKargoOrderId)}`, {
    method: "GET",
    cache: "no-store",
  });
  return response.text();
}
