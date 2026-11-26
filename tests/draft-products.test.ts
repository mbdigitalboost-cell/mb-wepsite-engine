import assert from "node:assert/strict";
import { test } from "node:test";
import { findReusableDraft, isUntouchedDraft, type DraftCandidate } from "../lib/commerce/draft-products.ts";

/** Faz 37 Kısım B — boş taslak tekrar kullanımı ve temizlik ölçütü. */

const NOW = new Date("2026-11-26T12:00:00Z");
const draft = (over: Partial<DraftCandidate>): DraftCandidate => ({
  id: "d1",
  name: "Yeni ürün",
  slug: "taslak-ef711b",
  isActive: false,
  price: 0,
  shortDescription: null,
  description: null,
  createdAt: "2026-11-26T11:50:00.000Z",
  updatedAt: "2026-11-26T11:50:00.400Z",
  linkedCount: 0,
  ...over,
});

test("untouched draft: unchanged row and nothing linked", () => {
  assert.equal(isUntouchedDraft(draft({})), true);
  assert.equal(isUntouchedDraft(draft({ name: "Canik Kılıf" })), false);
  assert.equal(isUntouchedDraft(draft({ updatedAt: "2026-11-26T11:55:00Z" })), false);
  assert.equal(isUntouchedDraft(draft({ linkedCount: 1 })), false); // görsel/varyant/kategori/sipariş var
  assert.equal(isUntouchedDraft(draft({ price: 100 })), false);
  assert.equal(isUntouchedDraft(draft({ isActive: true })), false);
  assert.equal(isUntouchedDraft(draft({ description: "x" })), false);
});

test("double click / repeated 'Yeni Ürün' reuses the user's recent empty draft instead of opening another", () => {
  const rows = [draft({ id: "a", createdAt: "2026-11-26T11:58:00Z", updatedAt: "2026-11-26T11:58:00Z" }), draft({ id: "b", createdAt: "2026-11-26T11:59:00Z", updatedAt: "2026-11-26T11:59:00Z" })];
  assert.equal(findReusableDraft(rows, new Set(["a", "b"]), NOW)?.id, "b");
  // Başka kullanıcının taslağı kullanılmaz.
  assert.equal(findReusableDraft(rows, new Set(["x"]), NOW), null);
  // 30 dakikadan eski taslak yeniden kullanılmaz (temizlik ayrı).
  assert.equal(findReusableDraft([draft({ id: "old", createdAt: "2026-11-26T11:00:00Z", updatedAt: "2026-11-26T11:00:00Z" })], new Set(["old"]), NOW), null);
});
