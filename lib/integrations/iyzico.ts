import "server-only";

import {
  buildIyzicoAuthorizationHeader,
  computeCheckoutFormInitializeSignature,
  computeCheckoutFormRetrieveSignature,
  generateIyzicoRandomKey,
  signaturesMatch,
} from "@/lib/integrations/iyzico-signature";
import type { PaymentIntegrationMode } from "@/lib/supabase/types";

/**
 * Faz 22 — iyzico Checkout Form (CF) ince istemcisi. Kart verisi BU
 * SUNUCUYA HİÇ DEĞMEZ: formu iyzico kendi iframe'inde çizer, biz sadece
 * (1) formu başlatır, (2) sonucu token'la sorgular, (3) imzayı doğrularız.
 *
 * Doküman (docs.iyzico.com, 2026-11-13'te doğrulandı):
 *  - Host: sandbox https://sandbox-api.iyzipay.com, canlı https://api.iyzipay.com
 *  - Başlatma: POST /payment/iyzipos/checkoutform/initialize/auth/ecom —
 *    zorunlu price, paidPrice, currency, callbackUrl (SSL), buyer,
 *    billingAddress, basketItems; fiziksel üründe shippingAddress.
 *    Yanıt: token, checkoutFormContent, paymentPageUrl, signature
 *    (imza sırası conversationId:token).
 *  - Sorgulama: POST /payment/iyzipos/checkoutform/auth/ecom/detail {token}
 *    → status, paymentStatus, paymentId, paidPrice, price, basketId,
 *    conversationId, currency, signature (sıra paymentStatus:paymentId:
 *    currency:basketId:conversationId:paidPrice:price:token), fraudStatus.
 *  - Bağlantı testi: POST /payment/bin/check {binNumber} — kimlik doğrulama
 *    gerektiren, para hareketi olmayan en hafif uç nokta (resmî paketin
 *    BinNumber kaynağı). Yanlış anahtar → status "failure" + errorCode.
 *  - Kimlik: IYZWSv2 (lib/integrations/iyzico-signature.ts).
 *
 * Resmî `iyzipay` npm paketi KULLANILMADI: 2.0.x hâlâ `postman-request`
 * (eski, callback tabanlı) bağımlı; Next.js sunucu ortamında fetch yeterli,
 * devir metni "yoksa imzayı kendin üret" dedi.
 */

export const IYZICO_HOSTS: Record<PaymentIntegrationMode, string> = {
  sandbox: "https://sandbox-api.iyzipay.com",
  live: "https://api.iyzipay.com",
};

/** Kart ödemesinde orders.payment_method değeri — lib/validation/order.ts'teki CARD_PAYMENT_METHOD ile aynı metin. */
export const IYZICO_LOCALE = "tr";

export interface IyzicoCredentials {
  apiKey: string;
  secretKey: string;
  mode: PaymentIntegrationMode;
}

export class IyzicoApiError extends Error {
  constructor(
    readonly errorCode: string | null,
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = "IyzicoApiError";
  }
}

export class IyzicoSignatureError extends Error {
  constructor(message = "iyzico yanıt imzası doğrulanamadı.") {
    super(message);
    this.name = "IyzicoSignatureError";
  }
}

interface IyzicoBaseResponse {
  status?: string;
  errorCode?: string;
  errorMessage?: string;
  errorGroup?: string;
  locale?: string;
  systemTime?: number;
  conversationId?: string;
}

async function iyzicoPost<T extends IyzicoBaseResponse>(
  credentials: IyzicoCredentials,
  uriPath: string,
  body: Record<string, unknown>,
): Promise<T> {
  const bodyText = JSON.stringify(body);
  const randomKey = generateIyzicoRandomKey();
  const authorization = buildIyzicoAuthorizationHeader({
    apiKey: credentials.apiKey,
    secretKey: credentials.secretKey,
    uriPath,
    body: bodyText,
    randomKey,
  });

  let response: Response;
  try {
    response = await fetch(`${IYZICO_HOSTS[credentials.mode]}${uriPath}`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "x-iyzi-rnd": randomKey,
        "x-iyzi-client-version": "mb-website-engine-1.0",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: bodyText,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "bilinmeyen hata";
    throw new IyzicoApiError(null, `iyzico'ya ulaşılamadı: ${reason}`, 0);
  }

  let json: T;
  try {
    json = (await response.json()) as T;
  } catch {
    throw new IyzicoApiError(null, `iyzico beklenmeyen yanıt döndü (HTTP ${response.status}).`, response.status);
  }

  if (json.status !== "success") {
    const message = json.errorMessage?.trim() || `iyzico isteği reddetti (HTTP ${response.status}).`;
    throw new IyzicoApiError(json.errorCode ?? null, message, response.status);
  }
  return json;
}

/** Bağlantı testi — anahtar çifti + mod doğru mu? Para hareketi yok. */
export async function testIyzicoConnection(credentials: IyzicoCredentials): Promise<void> {
  await iyzicoPost(credentials, "/payment/bin/check", {
    locale: IYZICO_LOCALE,
    conversationId: `conn-test-${Date.now()}`,
    // Dokümandaki örnek BIN (552608) — iyzico'nun kendi sandbox test kartı
    // serisi; gerçek bir karta ait değil.
    binNumber: "552608",
  });
}

export interface IyzicoAddress {
  contactName: string;
  city: string;
  country: string;
  address: string;
  zipCode?: string;
}

export interface IyzicoBuyer {
  id: string;
  name: string;
  surname: string;
  identityNumber: string;
  email: string;
  gsmNumber?: string;
  registrationAddress: string;
  city: string;
  country: string;
  ip: string;
  zipCode?: string;
}

export interface IyzicoBasketItem {
  id: string;
  name: string;
  category1: string;
  category2?: string;
  itemType: "PHYSICAL" | "VIRTUAL";
  /** 2 ondalık, string — sepet satırlarının toplamı `price`'a eşit olmalı. */
  price: string;
}

export interface CheckoutFormInitializeRequest {
  conversationId: string;
  basketId: string;
  /** Sepet toplamı (basketItems toplamı). */
  price: string;
  /** Çekilecek tutar — biz indirimli toplamı satırlara dağıttığımız için price ile aynı. */
  paidPrice: string;
  currency: "TRY";
  callbackUrl: string;
  buyer: IyzicoBuyer;
  shippingAddress: IyzicoAddress;
  billingAddress: IyzicoAddress;
  basketItems: IyzicoBasketItem[];
  enabledInstallments?: number[];
}

export interface CheckoutFormInitializeResult {
  token: string;
  checkoutFormContent: string;
  paymentPageUrl: string | null;
  tokenExpireTime: number | null;
}

interface CheckoutFormInitializeResponse extends IyzicoBaseResponse {
  token?: string;
  checkoutFormContent?: string;
  paymentPageUrl?: string;
  tokenExpireTime?: number;
  signature?: string;
}

/** POST /payment/iyzipos/checkoutform/initialize/auth/ecom — yanıt imzası (conversationId:token) doğrulanır. */
export async function initializeCheckoutForm(
  credentials: IyzicoCredentials,
  request: CheckoutFormInitializeRequest,
): Promise<CheckoutFormInitializeResult> {
  const response = await iyzicoPost<CheckoutFormInitializeResponse>(
    credentials,
    "/payment/iyzipos/checkoutform/initialize/auth/ecom",
    {
      locale: IYZICO_LOCALE,
      paymentGroup: "PRODUCT",
      enabledInstallments: request.enabledInstallments ?? [1],
      ...request,
    },
  );

  if (!response.token || !response.checkoutFormContent) {
    throw new IyzicoApiError(null, "iyzico ödeme formu token'ı döndürmedi.", 200);
  }
  if (response.signature) {
    const expected = computeCheckoutFormInitializeSignature(credentials.secretKey, request.conversationId, response.token);
    if (!signaturesMatch(expected, response.signature)) {
      throw new IyzicoSignatureError("iyzico başlatma yanıtının imzası doğrulanamadı.");
    }
  }

  return {
    token: response.token,
    checkoutFormContent: response.checkoutFormContent,
    paymentPageUrl: response.paymentPageUrl ?? null,
    tokenExpireTime: response.tokenExpireTime ?? null,
  };
}

export interface CheckoutFormRetrieveResult {
  token: string;
  conversationId: string;
  basketId: string;
  paymentId: string;
  paymentStatus: string;
  /** iyzico'nun çektiği tutar (sayı). */
  paidPrice: number;
  price: number;
  currency: string;
  fraudStatus: number | null;
  installment: number | null;
  cardAssociation: string | null;
  lastFourDigits: string | null;
  errorMessage: string | null;
  errorCode: string | null;
  /** İmza yanıtta vardı ve doğrulandı. (Yanıtta imza yoksa false — çağıran tarafın kararı.) */
  signatureVerified: boolean;
}

interface CheckoutFormRetrieveResponse extends IyzicoBaseResponse {
  token?: string;
  basketId?: string;
  paymentId?: string | number;
  paymentStatus?: string;
  paidPrice?: number | string;
  price?: number | string;
  currency?: string;
  fraudStatus?: number;
  installment?: number;
  cardAssociation?: string;
  lastFourDigits?: string;
  signature?: string;
}

/**
 * POST /payment/iyzipos/checkoutform/auth/ecom/detail — ödeme sonucu.
 * Başarısız ödemede iyzico status "failure" + errorMessage döner; bu
 * fonksiyon onu FIRLATMAZ, `paymentStatus: "FAILURE"` + errorMessage ile
 * döner ki çağıran taraf siparişe hatayı yazabilsin. Sadece ağ/kimlik
 * hataları (anahtar yanlış vb.) IyzicoApiError fırlatır.
 */
export async function retrieveCheckoutForm(
  credentials: IyzicoCredentials,
  token: string,
  conversationId?: string,
): Promise<CheckoutFormRetrieveResult> {
  const body: Record<string, unknown> = { locale: IYZICO_LOCALE, token };
  if (conversationId) body.conversationId = conversationId;

  let response: CheckoutFormRetrieveResponse;
  try {
    response = await iyzicoPost<CheckoutFormRetrieveResponse>(credentials, "/payment/iyzipos/checkoutform/auth/ecom/detail", body);
  } catch (error) {
    // Kimlik/ağ hatası ile "ödeme başarısız" farklı şeyler: iyzico, ödeme
    // başarısızsa da status=failure döndürür ama errorGroup/paymentStatus
    // ile. Burada ayrım: errorCode 1000-serisi (kimlik/istek) → fırlat;
    // diğerleri → başarısız ödeme olarak dön.
    if (error instanceof IyzicoApiError && (error.httpStatus === 401 || error.httpStatus === 0 || /^(1000|1001|1002|1003|1004|1005|1006|1007|1008|1009|1010|1011|1012|1013)$/.test(error.errorCode ?? ""))) {
      throw error;
    }
    const failure = error instanceof IyzicoApiError ? error : null;
    return {
      token,
      conversationId: conversationId ?? "",
      basketId: "",
      paymentId: "",
      paymentStatus: "FAILURE",
      paidPrice: 0,
      price: 0,
      currency: "TRY",
      fraudStatus: null,
      installment: null,
      cardAssociation: null,
      lastFourDigits: null,
      errorMessage: failure?.message ?? "Ödeme tamamlanamadı.",
      errorCode: failure?.errorCode ?? null,
      signatureVerified: false,
    };
  }

  const result: CheckoutFormRetrieveResult = {
    token: response.token ?? token,
    conversationId: response.conversationId ?? conversationId ?? "",
    basketId: response.basketId ?? "",
    paymentId: response.paymentId !== undefined ? String(response.paymentId) : "",
    paymentStatus: (response.paymentStatus ?? "").toUpperCase(),
    paidPrice: Number(response.paidPrice ?? 0),
    price: Number(response.price ?? 0),
    currency: response.currency ?? "TRY",
    fraudStatus: typeof response.fraudStatus === "number" ? response.fraudStatus : null,
    installment: typeof response.installment === "number" ? response.installment : null,
    cardAssociation: response.cardAssociation ?? null,
    lastFourDigits: response.lastFourDigits ?? null,
    errorMessage: response.errorMessage ?? null,
    errorCode: response.errorCode ?? null,
    signatureVerified: false,
  };

  if (response.signature) {
    const expected = computeCheckoutFormRetrieveSignature(credentials.secretKey, {
      paymentStatus: response.paymentStatus ?? "",
      paymentId: response.paymentId ?? "",
      currency: response.currency ?? "",
      basketId: response.basketId ?? "",
      conversationId: response.conversationId ?? "",
      paidPrice: response.paidPrice ?? 0,
      price: response.price ?? 0,
      token: response.token ?? token,
    });
    if (!signaturesMatch(expected, response.signature)) {
      throw new IyzicoSignatureError();
    }
    result.signatureVerified = true;
  }

  return result;
}

/** 2 ondalık, nokta ayraçlı string — iyzico fiyat alanları bu formatı bekler ("149.90"). */
export function formatIyzicoPrice(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}
