import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildIyzicoAuthorizationHeader,
  computeCheckoutFormInitializeSignature,
  computeCheckoutFormRetrieveSignature,
  computeIyzicoResponseSignature,
  computeIyzicoWebhookSignatureV3,
  hmacSha256Hex,
  normalizePriceForSignature,
  signaturesMatch,
} from "../lib/integrations/iyzico-signature.ts";

/**
 * Faz 22 — çalıştırma: `npm test` (node --test, Node 24 .ts'i doğrudan
 * çalıştırır). Dokümandaki ÖRNEK değerler birebir kullanıldı:
 * docs.iyzico.com/en/advanced/response-signature-validation — /payment/auth
 * örneği: secretKey sandbox-qaIiLIxhjMgx3LSKIVvp6j17NunHOFtD, veri
 * "22416032:TRY:basketId:conversationId:10.5:10.5", beklenen imza
 * 836c3a6c8db86c81043f2ca74edb13518b54a813f454f8dd762f0dd658610173.
 */
const DOC_SECRET = "sandbox-qaIiLIxhjMgx3LSKIVvp6j17NunHOFtD";
const DOC_SIGNATURE = "836c3a6c8db86c81043f2ca74edb13518b54a813f454f8dd762f0dd658610173";

test("response signature matches the documented /payment/auth sample", () => {
  const signature = computeIyzicoResponseSignature(DOC_SECRET, [
    "22416032",
    "TRY",
    "basketId",
    "conversationId",
    normalizePriceForSignature("10.5"),
    normalizePriceForSignature("10.5"),
  ]);
  assert.equal(signature, DOC_SIGNATURE);
  assert.equal(hmacSha256Hex(DOC_SECRET, "22416032:TRY:basketId:conversationId:10.5:10.5"), DOC_SIGNATURE);
});

test("trailing zero rule follows the documented table", () => {
  assert.equal(normalizePriceForSignature("10"), "10");
  assert.equal(normalizePriceForSignature("10.0"), "10");
  assert.equal(normalizePriceForSignature("10.5"), "10.5");
  assert.equal(normalizePriceForSignature("10.50"), "10.5");
  assert.equal(normalizePriceForSignature("10.510"), "10.51");
  assert.equal(normalizePriceForSignature("10.5105"), "10.5105");
  assert.equal(normalizePriceForSignature("10.51050"), "10.5105");
  assert.equal(normalizePriceForSignature("50.00"), "50");
  assert.equal(normalizePriceForSignature(6), "6");
  assert.equal(normalizePriceForSignature(10.5), "10.5");
});

test("checkout form retrieve signature uses the documented field order", () => {
  // Beklenen değer, doküman sırasının (paymentStatus:paymentId:currency:
  // basketId:conversationId:paidPrice:price:token) HMAC'i — alan sırası
  // yanlışlıkla değişirse bu test kırılır.
  const fields = {
    paymentStatus: "SUCCESS",
    paymentId: "24478123",
    currency: "TRY",
    basketId: "basketId",
    conversationId: "8152109759",
    paidPrice: 6,
    price: 6.0,
    token: "077aff05-1e9b-44aa-aa11-c268bb8b3826",
  };
  const expected = hmacSha256Hex(DOC_SECRET, "SUCCESS:24478123:TRY:basketId:8152109759:6:6:077aff05-1e9b-44aa-aa11-c268bb8b3826");
  assert.equal(computeCheckoutFormRetrieveSignature(DOC_SECRET, fields), expected);
  assert.equal(
    computeCheckoutFormInitializeSignature(DOC_SECRET, "8152109759", fields.token),
    hmacSha256Hex(DOC_SECRET, "8152109759:077aff05-1e9b-44aa-aa11-c268bb8b3826"),
  );
});

test("webhook HPP signature concatenates secret + event + paymentId + token + conversationId + status", () => {
  const fields = {
    iyziEventType: "CHECKOUT_FORM_AUTH",
    iyziPaymentId: 28157797,
    token: "9895e0e6-cd7e-4635-9c33-fe52c337de09",
    paymentConversationId: "123456789",
    status: "SUCCESS",
  };
  const expected = hmacSha256Hex(
    DOC_SECRET,
    `${DOC_SECRET}CHECKOUT_FORM_AUTH28157797` + "9895e0e6-cd7e-4635-9c33-fe52c337de09" + "123456789" + "SUCCESS",
  );
  assert.equal(computeIyzicoWebhookSignatureV3(DOC_SECRET, fields), expected);
});

test("IYZWSv2 authorization header follows the official iyzipay-node algorithm", () => {
  const apiKey = "sandbox-apiKey";
  const randomKey = "1700000000000abcdef";
  const uriPath = "/payment/iyzipos/checkoutform/auth/ecom/detail";
  const body = JSON.stringify({ locale: "tr", conversationId: "c1", token: "t1" });
  const header = buildIyzicoAuthorizationHeader({ apiKey, secretKey: DOC_SECRET, uriPath, body, randomKey });

  assert.ok(header.startsWith("IYZWSv2 "));
  const decoded = Buffer.from(header.slice("IYZWSv2 ".length), "base64").toString("utf8");
  const expectedSignature = hmacSha256Hex(DOC_SECRET, `${randomKey}${uriPath}${body}`);
  assert.equal(decoded, `apiKey:${apiKey}&randomKey:${randomKey}&signature:${expectedSignature}`);
});

test("signaturesMatch is case-insensitive and rejects mismatches", () => {
  assert.equal(signaturesMatch(DOC_SIGNATURE, DOC_SIGNATURE.toUpperCase()), true);
  assert.equal(signaturesMatch(DOC_SIGNATURE, ` ${DOC_SIGNATURE} `), true);
  assert.equal(signaturesMatch(DOC_SIGNATURE, DOC_SIGNATURE.slice(0, -1) + "0"), false);
  assert.equal(signaturesMatch(DOC_SIGNATURE, ""), false);
  assert.equal(signaturesMatch(DOC_SIGNATURE, null), false);
});
