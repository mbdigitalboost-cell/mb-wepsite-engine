import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Faz 22 — iyzico imza/kimlik doğrulama yardımcıları. BİLEREK "server-only"
 * import'u YOK ve Supabase/Next'e bağımlı değil: tests/iyzico-signature.test.ts
 * bu dosyayı doğrudan `node --test` ile çalıştırır (dokümandaki örnek
 * değerlerle). Sunucu dışında kullanılmaz (node:crypto); client bundle'a
 * girmesi zaten import eden tek yer (lib/integrations/iyzico.ts, server-only)
 * yüzünden mümkün değil.
 *
 * Kaynaklar (2026-11-13'te doğrulandı):
 *  - Authorization: resmî iyzipay-node `utils.generateHashV2` —
 *    signature = HMAC-SHA256(secretKey, randomKey + uriPath + JSON.stringify(body)) hex;
 *    header = "IYZWSv2 " + base64("apiKey:<k>&randomKey:<r>&signature:<s>");
 *    ayrıca `x-iyzi-rnd: <randomKey>` başlığı. Resmî paket `postman-request`e
 *    bağımlı olduğu için (Next.js sunucu ortamında gereksiz/eski), devir
 *    metninin izniyle imza burada üretiliyor.
 *  - Yanıt imzası: docs.iyzico.com/en/advanced/response-signature-validation —
 *    alanlar ":" ile birleştirilir, HMAC-SHA256(secretKey) hex; fiyat alanları
 *    "trailing zero" kuralıyla ("10.50" → "10.5", "10.0" → "10").
 *    CF retrieve sırası: paymentStatus, paymentId, currency, basketId,
 *    conversationId, paidPrice, price, token.
 *  - Webhook: docs.iyzico.com/ek-servisler/webhook — HPP formatı
 *    (CHECKOUT_FORM_AUTH): HMAC-SHA256(secretKey,
 *    secretKey + iyziEventType + iyziPaymentId + token + paymentConversationId + status) hex,
 *    başlık X-IYZ-SIGNATURE-V3.
 */

export function hmacSha256Hex(secretKey: string, data: string): string {
  return createHmac("sha256", secretKey).update(data, "utf8").digest("hex");
}

export function generateIyzicoRandomKey(): string {
  // Resmî paket hrtime+Math.random kullanıyor; burada kriptografik rastgele —
  // iyzico yalnızca "istek başına benzersiz bir string" bekliyor.
  return `${Date.now()}${randomBytes(6).toString("hex")}`;
}

/**
 * IYZWSv2 Authorization başlığı. `uriPath` host'suz yol (ör.
 * "/payment/iyzipos/checkoutform/initialize/auth/ecom"), `body` gönderilecek
 * JSON string'in KENDİSİ — imza, gönderilen byte'larla birebir aynı metin
 * üzerinden hesaplanmalı (JSON.stringify iki kez çağrılıp farklı sıralama
 * üretme riski olmasın diye string alınıyor).
 */
export function buildIyzicoAuthorizationHeader(params: {
  apiKey: string;
  secretKey: string;
  uriPath: string;
  body: string;
  randomKey: string;
}): string {
  const { apiKey, secretKey, uriPath, body, randomKey } = params;
  const signature = hmacSha256Hex(secretKey, `${randomKey}${uriPath}${body}`);
  const authorizationString = [`apiKey:${apiKey}`, `randomKey:${randomKey}`, `signature:${signature}`].join("&");
  return `IYZWSv2 ${Buffer.from(authorizationString, "utf8").toString("base64")}`;
}

/**
 * Dokümanın "Trailing Zero" kuralı: imzaya giren fiyat, ondalık sondaki
 * sıfırlar atılmış hâliyle girer ("50.00" → "50", "10.510" → "10.51").
 * Sayı ya da string kabul eder; iyzico yanıtı sayı döndürür (price: 6),
 * JSON.parse bunu 6 yapar → "6". Tam sayı olmayanlar için String(number)
 * zaten sondaki sıfırı taşımaz ama string girdi ("10.50") için gerekli.
 */
export function normalizePriceForSignature(value: number | string): string {
  const text = typeof value === "number" ? value.toString() : value.trim();
  if (!text.includes(".")) return text;
  const trimmed = text.replace(/0+$/, "").replace(/\.$/, "");
  return trimmed === "" || trimmed === "-" ? "0" : trimmed;
}

/** Genel yanıt imzası: parametreler sırayla ":" ile birleştirilir. Fiyat alanları çağıran tarafından normalize edilmiş gelir. */
export function computeIyzicoResponseSignature(secretKey: string, orderedParams: Array<string | number>): string {
  return hmacSha256Hex(secretKey, orderedParams.map(String).join(":"));
}

export interface CheckoutFormRetrieveSignatureFields {
  paymentStatus: string;
  paymentId: string | number;
  currency: string;
  basketId: string;
  conversationId: string;
  paidPrice: number | string;
  price: number | string;
  token: string;
}

/** CF retrieve (/payment/iyzipos/checkoutform/auth/ecom/detail) yanıt imzası — doküman sırası. */
export function computeCheckoutFormRetrieveSignature(secretKey: string, fields: CheckoutFormRetrieveSignatureFields): string {
  return computeIyzicoResponseSignature(secretKey, [
    fields.paymentStatus,
    fields.paymentId,
    fields.currency,
    fields.basketId,
    fields.conversationId,
    normalizePriceForSignature(fields.paidPrice),
    normalizePriceForSignature(fields.price),
    fields.token,
  ]);
}

/** CF initialize yanıt imzası — doküman sırası: conversationId, token. */
export function computeCheckoutFormInitializeSignature(secretKey: string, conversationId: string, token: string): string {
  return computeIyzicoResponseSignature(secretKey, [conversationId, token]);
}

export interface IyzicoHppWebhookFields {
  iyziEventType: string;
  iyziPaymentId: string | number;
  token: string;
  paymentConversationId: string;
  status: string;
}

/** Webhook HPP formatı (Checkout Form) — X-IYZ-SIGNATURE-V3. */
export function computeIyzicoWebhookSignatureV3(secretKey: string, fields: IyzicoHppWebhookFields): string {
  const message = `${secretKey}${fields.iyziEventType}${fields.iyziPaymentId}${fields.token}${fields.paymentConversationId}${fields.status}`;
  return hmacSha256Hex(secretKey, message);
}

/** Sabit zamanlı hex imza karşılaştırması (uzunluk farkı da "eşit değil"). */
export function signaturesMatch(expectedHex: string, providedHex: string | null | undefined): boolean {
  if (!providedHex) return false;
  const expected = Buffer.from(expectedHex.toLowerCase(), "utf8");
  const provided = Buffer.from(providedHex.trim().toLowerCase(), "utf8");
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}
