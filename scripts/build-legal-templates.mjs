#!/usr/bin/env node
/**
 * Faz 33 — docs/legal-templates/*.md → (1) lib/legal/default-templates.ts
 * (admin "şablon" önizlemesi / şablona dön) ve (2)
 * supabase/platform/migrations/0049_legal_document_seed.sql (bir mağazanın
 * sürüm 1 tohumu). Tek kaynak: md dosyaları; bu iki çıktıyı ELLE düzenleme.
 *
 * Kurallar: <!-- ... --> kaynak yorumları atılır; "{{> _parca}}" satırı
 * docs/legal-templates/_parca.md içeriğiyle değiştirilir (ortak bölümler —
 * ön bilgilendirme ile sözleşme çelişmesin); ilk "# Başlık" satırı başlık olur.
 *
 * Kullanım:
 *   node scripts/build-legal-templates.mjs
 *       → yalnız lib/legal/default-templates.ts (mağazadan bağımsız)
 *   node scripts/build-legal-templates.mjs --store=<mağaza-slug> --version-sql=cookies
 *       → o mağaza için tek türün yeni sürüm SQL'i (stdout)
 *   node scripts/build-legal-templates.mjs --store=<mağaza-slug> --seed-0049
 *       → 0049 tohum dosyasını o mağaza için yeniden yazar
 *
 * Faz 39 Adım 3 — SQL üreten iki seçenek mağaza slug'ını ZORUNLU parametre
 * olarak alır (--store=...). Varsayılan mağaza yoktur: slug verilmezse betik
 * SQL üretmeden hata verir; böylece bir mağazanın metni yanlışlıkla başka
 * bir mağazaya tohumlanamaz.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "docs", "legal-templates");

/** SQL üreten seçenekler için zorunlu mağaza slug'ı (--store=<slug>); yoksa null. */
function storeSlugArg() {
  const arg = process.argv.find((value) => value.startsWith("--store="));
  if (!arg) return null;
  const slug = arg.slice("--store=".length);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`geçersiz mağaza slug'ı: "${slug}" (küçük harf, rakam, tire)`);
  return slug;
}
const storeSlug = storeSlugArg();
function requireStoreSlug(option) {
  if (!storeSlug) throw new Error(`${option} için mağaza zorunlu: --store=<mağaza-slug> ekleyin (varsayılan mağaza yok).`);
  return storeSlug;
}

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
 * Faz 33 — varsayılan yasal metin şablonları (mağazadan bağımsız; mağaza tohumlarıyla aynı metin).
 */
import type { LegalDocumentKind } from "@/lib/supabase/types";

export const DEFAULT_LEGAL_TEMPLATES: Record<LegalDocumentKind, { title: string; body: string }> = ${JSON.stringify(templates, null, 2)};
`;
writeFileSync(join(root, "lib", "legal", "default-templates.ts"), ts);

// 0049 canlıda uygulandı; yalnız açıkça istenirse yeniden yazılır (node ... --store=<slug> --seed-0049).
if (process.argv.includes("--seed-0049")) {
  const seedSlug = requireStoreSlug("--seed-0049");
  const sqlValues = KINDS.map((kind) => {
    const { title, body } = templates[kind];
    return `select s.id, '${kind}', $legal$${title}$legal$, $legal$${body}$legal$, 1
from public.stores s where s.slug = '${seedSlug}'`;
  }).join("\nunion all\n");

  const sql = `-- =============================================================================
-- PLATFORM MIGRATION 0049
-- Faz 33 — "${seedSlug}" mağazasının yasal metin ŞABLONLARI (sürüm 1). 0048'den SONRA çalıştırın.
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
-- where s.slug = '${seedSlug}' order by kind;
`;
  writeFileSync(join(root, "supabase", "platform", "migrations", "0049_legal_document_seed.sql"), sql);
}

// Faz 35: tek bir türün yeni sürümünü ekleyen SQL parçası (ör. --version-sql=cookies), stdout'a.
const versionArg = process.argv.find((arg) => arg.startsWith("--version-sql="));
if (versionArg) {
  const versionSlug = requireStoreSlug("--version-sql");
  const kind = versionArg.split("=")[1];
  if (!templates[kind]) throw new Error(`bilinmeyen tür: ${kind}`);
  const { title, body } = templates[kind];
  const q = (text) => "$legal$" + text + "$legal$";
  console.log(`-- ${kind} yeni sürüm (mevcut en yüksek sürüm + 1; hukukçu kontrolü sıfırlanır; aynı metin varsa eklenmez)
insert into public.store_legal_documents (store_id, kind, title, body, version)
select s.id, '${kind}', ${q(title)}, ${q(body)},
       coalesce((select max(d.version) from public.store_legal_documents d where d.store_id = s.id and d.kind = '${kind}'), 0) + 1
from public.stores s
where s.slug = '${versionSlug}'
  and not exists (
    select 1 from public.store_legal_documents d2
    where d2.store_id = s.id and d2.kind = '${kind}' and d2.body = ${q(body)}
  );`);
}

console.error(`ok: ${KINDS.length} şablon → lib/legal/default-templates.ts`);
