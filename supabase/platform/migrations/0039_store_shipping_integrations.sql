-- =============================================================================
-- PLATFORM MIGRATION 0039
-- store_shipping_integrations + orders.shipping_* — Faz 21: Basit Kargo
-- ayarları admin panelde (mağaza bazlı token) + onaylanınca otomatik gönderim.
--
-- Verified via list_migrations before writing this file: 0038_brand_models is
-- the latest applied migration, 0039 is unused.
--
-- NEDEN MAĞAZA BAZLI TOKEN: panel çok kiracılı — tek bir env token'ı
-- (BASIT_KARGO_API_TOKEN, Faz 20) başka bir mağazanın siparişinde
-- kullanılma riski taşıyordu ve her değişiklikte yeniden deploy
-- gerektiriyordu. Token artık bu tabloda, mağaza başına.
--
-- GÜVENLİK KARARI — HİÇBİR RLS POLICY YOK + anon/authenticated'tan tüm
-- yetkiler REVOKE: api_token ve webhook_secret hiçbir client oturumuyla
-- (anon/authenticated) okunamaz/yazılamaz. Tek erişim yolu, yetki
-- kontrolünden (requireStoreAdminAccess / requireStoreEditorAccess) geçmiş
-- server kodu içindeki service-role client (lib/integrations/
-- store-shipping-integration.ts). RLS "enable" + sıfır policy + REVOKE
-- üçlüsü, migration 0036'nın customer_discounts "anon RLS yok" kararının
-- bir adım daha sertleştirilmişi — burada authenticated da dahil.
--
-- Supabase Vault DEĞERLENDİRİLDİ, BU TURDA KULLANILMADI: Vault'un
-- decrypted_secrets görünümü de yalnızca service-role ile okunabiliyor;
-- yani erişim modeli bu tabloyla AYNI, ek olarak sadece at-rest şifreleme
-- getiriyor. Karşılığında her okuma/yazma bir vault RPC'si ve ayrı bir
-- secret-id eşlemesi gerektiriyor. Kolon + sıfır-policy + revoke, aynı
-- erişim garantisini çok daha az hareketli parçayla veriyor; at-rest
-- şifreleme istenirse api_token kolonu ileride vault secret id'sine
-- çevrilebilir (ayrı migration, uygulama katmanı tek dosyada).
--
-- webhook_secret: uygulama katmanında (crypto.randomBytes) ilk kayıtta
-- üretilir, mağazayı webhook isteğinden çözmek için UNIQUE. Basit Kargo
-- dokümanında imza/secret başlığı YOK — URL'e ?secret=... olarak eklenir.
-- =============================================================================

create table public.store_shipping_integrations (
  store_id uuid primary key references public.stores (id) on delete cascade,
  provider text not null default 'basit_kargo' check (provider = 'basit_kargo'),
  api_token text,
  webhook_secret text not null check (length(webhook_secret) >= 32),
  default_desi numeric(6, 2) not null default 1 check (default_desi > 0 and default_desi <= 500),
  auto_push_on_confirm boolean not null default true,
  is_active boolean not null default true,
  last_test_at timestamptz,
  last_test_ok boolean,
  last_test_message text,
  last_webhook_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.store_shipping_integrations is
  'Faz 21 — mağaza başına kargo entegratörü (Basit Kargo) ayarları. api_token/webhook_secret SIR: hiçbir RLS policy yok, anon/authenticated revoke edildi, yalnızca service-role üzerinden (lib/integrations/store-shipping-integration.ts) okunur/yazılır. Token client''a asla dönmez (sadece son 4 hane).';

create unique index store_shipping_integrations_webhook_secret_idx
  on public.store_shipping_integrations (webhook_secret);

create trigger set_store_shipping_integrations_updated_at
  before update on public.store_shipping_integrations
  for each row execute function public.set_updated_at();

alter table public.store_shipping_integrations enable row level security;
revoke all on table public.store_shipping_integrations from anon, authenticated;
-- BİLEREK hiçbir policy yok — bkz. header.

-- orders: Basit Kargo tarafındaki sipariş kimliği + senkron durumu.
-- shipping_provider_order_id, Faz 20'nin "etiket için Basit Kargo id'si
-- tutacak kolon yok" açık maddesini de kapatıyor (GET /label/svg/{id}).
alter table public.orders
  add column shipping_provider_order_id text,
  add column shipping_sync_status text not null default 'not_sent'
    check (shipping_sync_status in ('not_sent', 'sent', 'failed')),
  add column shipping_sync_error text;

comment on column public.orders.shipping_provider_order_id is
  'Faz 21 — Basit Kargo sipariş id''si (POST /v2/order ya da /v2/order/barcode yanıtındaki id). Doluysa "Kargoya Hazırla" yeni sipariş AÇMAZ, bu id için barkod üretir (POST /v2/order/{id}/barcode).';
comment on column public.orders.shipping_sync_status is
  'Faz 21 — not_sent: Basit Kargo''ya hiç gönderilmedi; sent: gönderildi (id dolu); failed: gönderim denendi, hata (shipping_sync_error dolu, admin "Tekrar Gönder" ile yeniden dener).';

create index orders_shipping_provider_order_id_idx
  on public.orders (shipping_provider_order_id)
  where shipping_provider_order_id is not null;

-- Mevcut orders RLS policy'leri (0029: editor-tier select/update) bu yeni
-- kolonları otomatik kapsar — kolonlar sır içermiyor, ek policy gerekmez.
