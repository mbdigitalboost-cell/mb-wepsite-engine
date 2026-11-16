#!/usr/bin/env node
/**
 * Faz 33 — docs/legal-templates/*.md → (1) lib/legal/default-templates.ts
 * (admin "şablon" önizlemesi / şablona dön) ve (2)
 * supabase/platform/migrations/0049_legal_document_seed.sql (Taktikalp46
 * sürüm 1 tohumu). Tek kaynak: md dosyaları; bu iki çıktıyı ELLE düzenleme.
 *
 * Kurallar: <!-- ... --> kaynak yorumları atılır; "{{> _parca}}" satırı
 * docs/legal-templates/_parca.md içeriğiyle değiştirilir (ortak bölümler —
 * ön bilgilendirme ile sözleşme çelişmesin); ilk "# Başlık" satırı başlık olur.
 *
 * Kullanım: node scripts/build-legal-templates.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "docs", "legal-templates");

const KINDS = ["pre_information", "distance_sales", "returns", "withdrawal_form", "privacy_kvkk", "cookies"];

const stripComments = (text) => text.replace(/<!--[\s\S]*?-->\s*/g, "").replace(/\r\n/g, "\n");

function load(name) {
  return stripComments(readFileSync(join(dir, `${name}.md`), "utf8"));
}

function expand(text) {
  return text.replace(/^[ \t]*\{\{>[ \t]*(_[a-z_]+)[ \t]*\}\}[ \t]*$/gm, (_line, partial) => load(partial).trim());
}

const templates = {};
for (const kind of KINDS) {
  const full = expand(load(kind)).trim();
  if (/\{\{>/.test(full)) throw new Error(`${kind}: açılmamış parça var`);
  const lines = full.split("\n");
  const titleIndex = lines.findIndex((line) => /^#\s+/.test(line));
  if (titleIndex === -1) throw new Error(`${kind}: "# Başlık" satırı yok`);
  const title = lines[titleIndex].replace(/^#\s+/, "").trim();
  const body = lines.filter((_line, index) => index !== titleIndex).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (body.includes("$legal$")) throw new Error(`${kind}: gövde "$legal$" içeremez`);
  templates[kind] = { title, body };
}

const ts = `/**
 * OTOMATİK ÜRETİLDİ — scripts/build-legal-templates.mjs (kaynak: docs/legal-templates/*.md).
 * Elle düzenleme; md dosyasını değiştirip betiği çalıştır.
 * Faz 33 — varsayılan yasal metin şablonları (Taktikalp46 sürüm 1 tohumu ile aynı).
 */
import type { LegalDocumentKind } from "@/lib/supabase/types";

export const DEFAULT_LEGAL_TEMPLATES: Record<LegalDocumentKind, { title: string; body: string }> = ${JSON.stringify(templates, null, 2)};
`;
writeFileSync(join(root, "lib", "legal", "default-templates.ts"), ts);

const sqlValues = KINDS.map((kind) => {
  const { title, body } = templates[kind];
  return `select s.id, '${kind}', $legal$${title}$legal$, $legal$${body}$legal$, 1
from public.stores s where s.slug = 'taktikalp46'`;
}).join("\nunion all\n");

const sql = `-- =============================================================================
-- PLATFORM MIGRATION 0049
-- Faz 33 — Taktikalp46 yasal metin ŞABLONLARI (sürüm 1). 0048'den SONRA çalıştırın.
--
-- OTOMATİK ÜRETİLDİ: scripts/build-legal-templates.mjs (kaynak: docs/legal-templates/*.md).
-- Bu metinler ŞABLONDUR; reviewed_by_lawyer = false. Hukukçu kontrolünden sonra
-- admin → Mağaza → Yasal Metinler'den "Hukukçu kontrol etti" işaretlenir.
-- Satıcı bilgileri değişkenlerdir ({{satici.unvan}} vb.) — 0048'deki
-- store_seller_profiles satırından doldurulur; bilinmeyen alanın satırı çıkmaz.
-- Tekrar çalıştırılabilir (sürüm 1 varsa dokunmaz).
-- =============================================================================

insert into public.store_legal_documents (store_id, kind, title, body, version)
${sqlValues}
on conflict (store_id, kind, version) do nothing;

-- Doğrulama (beklenen: 6 satır, hepsi version 1, reviewed_by_lawyer false):
-- select kind, version, reviewed_by_lawyer, char_length(body) as len
-- from public.store_legal_documents d join public.stores s on s.id = d.store_id
-- where s.slug = 'taktikalp46' order by kind;
`;
writeFileSync(join(root, "supabase", "platform", "migrations", "0049_legal_document_seed.sql"), sql);

console.log(`ok: ${KINDS.length} şablon → lib/legal/default-templates.ts + 0049_legal_document_seed.sql`);
