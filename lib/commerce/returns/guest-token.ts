import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Faz 30 — misafir (oturumsuz) müşterinin talep sayfası için kısa ömürlü
 * imzalı jeton (saf; anahtar dışarıdan verilir — tests/returns.test.ts).
 * Sipariş id'si tek başına yetmez: jeton, sipariş no + telefon sorgusu
 * başarılı olduktan sonra sunucuda üretilir ve (storeId, orderId, son
 * kullanma) üçlüsünü HMAC-SHA256 ile bağlar.
 *
 * Biçim: "<expiresUnix>.<base64url-hmac>"
 */
export const GUEST_TOKEN_TTL_SECONDS = 2 * 60 * 60;

function sign(key: string, storeId: string, orderId: string, expires: number): string {
  return createHmac("sha256", key).update(`order-return:${storeId}:${orderId}:${expires}`).digest("base64url");
}

export function createGuestReturnToken(key: string, storeId: string, orderId: string, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const expires = nowSeconds + GUEST_TOKEN_TTL_SECONDS;
  return `${expires}.${sign(key, storeId, orderId, expires)}`;
}

export function verifyGuestReturnToken(
  key: string,
  storeId: string,
  orderId: string,
  token: string | null | undefined,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!key || !token) return false;
  const [expiresRaw, signature] = token.split(".");
  const expires = Number(expiresRaw);
  if (!Number.isInteger(expires) || !signature || expires < nowSeconds) return false;
  const expected = Buffer.from(sign(key, storeId, orderId, expires));
  const provided = Buffer.from(signature);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
