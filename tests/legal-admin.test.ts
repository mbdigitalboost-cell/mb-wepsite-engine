import assert from "node:assert/strict";
import { test } from "node:test";
import { canSendSubscriberMessage, marketingConsentStatus, type ConsentEvidence } from "../lib/legal/marketing-consent.ts";

/** Faz 33 Kısım D — Aboneler: ticari elektronik ileti izni. */

const evidence: ConsentEvidence[] = [
  { email: "ali@example.com", phone: "0532 111 22 33", consent: true, at: "2026-11-01T10:00:00Z" },
  { email: null, phone: "+90 532 111 22 33", consent: false, at: "2026-11-10T10:00:00Z" },
  { email: "veli@example.com", phone: null, consent: true, at: "2026-11-05T10:00:00Z" },
];

test("latest order decides; phone formats match; no record means no permission", () => {
  assert.equal(marketingConsentStatus({ email: "ALI@example.com" }, evidence), "granted");
  // Aynı kişinin daha yeni siparişinde onay yok → izin geri alınmış sayılır.
  assert.equal(marketingConsentStatus({ phone: "05321112233" }, evidence), "denied");
  assert.equal(marketingConsentStatus({ email: "veli@example.com" }, evidence), "granted");
  assert.equal(marketingConsentStatus({ email: "yok@example.com", phone: "05000000000" }, evidence), "unknown");
  assert.equal(marketingConsentStatus({}, evidence), "unknown");
});

test("commercial message only with permission; otherwise admin must declare it non-commercial", () => {
  assert.equal(canSendSubscriberMessage("granted", false), true);
  assert.equal(canSendSubscriberMessage("denied", false), false);
  assert.equal(canSendSubscriberMessage("unknown", false), false);
  assert.equal(canSendSubscriberMessage("unknown", true), true);
});
