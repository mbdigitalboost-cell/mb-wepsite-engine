-- =============================================================================
-- PLATFORM MIGRATION 0047
-- discount_code_attempts — Faz 32: indirim kodu deneme sınırı.
--
-- Vitrinde "Uygula" ile kod denenebildiği için (önizleme), kod tahmini
-- (numaralandırma) yavaşlatılır: mağaza + IP başına 10 dakikada 5 BAŞARISIZ
-- deneme (lib/commerce/checkout/code-attempts.ts). Vercel serverless
-- instance'ları belleği paylaşmadığı için sayaç burada, DB'de tutulur.
--
-- GİZLİLİK: ham IP saklanmaz — key_hash = HMAC-SHA256(mağaza:IP), anahtar
-- service-role anahtarından türetilir (code-attempts-server.ts). Satırlar
-- uygulama tarafından fırsatçı olarak 1 gün sonra silinir.
--
-- ERİŞİM: RLS açık, HİÇBİR policy yok → anon/authenticated ne okur ne
-- yazar; yalnız service-role (vitrin server action'ları) kullanır.
--
-- Bu tablo yokken uygulama instance belleğine düşer (deploy sırası
-- serbest); tablo oluşunca otomatik olarak paylaşılan sayaca geçer.
-- =============================================================================

create table if not exists public.discount_code_attempts (
  id bigint generated always as identity primary key,
  store_id uuid not null references public.stores (id) on delete cascade,
  key_hash text not null,
  created_at timestamptz not null default now()
);

comment on table public.discount_code_attempts is
  'Faz 32 — başarısız indirim kodu denemeleri (deneme sınırı). key_hash = HMAC(mağaza:IP); ham IP yok. Yalnız service-role.';

create index if not exists discount_code_attempts_key_created_idx
  on public.discount_code_attempts (key_hash, created_at desc);

create index if not exists discount_code_attempts_store_id_idx
  on public.discount_code_attempts (store_id);

alter table public.discount_code_attempts enable row level security;

revoke all on public.discount_code_attempts from anon, authenticated;

-- Doğrulama (beklenen: 1 / true / 0):
-- select
--   (select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'discount_code_attempts') as table_exists,
--   (select relrowsecurity from pg_class where oid = 'public.discount_code_attempts'::regclass) as rls_enabled,
--   (select count(*) from pg_policies where tablename = 'discount_code_attempts') as policy_count;
