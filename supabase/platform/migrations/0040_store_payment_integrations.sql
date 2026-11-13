-- =============================================================================
-- PLATFORM MIGRATION 0040
-- store_payment_integrations + orders.payment_provider_* + orders.billing_* —
-- Faz 22: iyzico Checkout Form (kart ödemesi) + ödeme ekranında fatura bilgisi.
--
-- Verified via list_migrations before writing this file: 0039 (store_shipping_
-- integrations) is the latest applied migration, 0040 is unused.
--
-- ERİŞİM MODELİ — migration 0039 ile BİREBİR AYNI: RLS açık + SIFIR policy +
-- anon/authenticated'tan REVOKE ALL. api_key/secret_key hiçbir client
-- oturumuyla okunamaz/yazılamaz; tek yol yetki kontrolünden geçmiş server
-- kodu içindeki service-role client (lib/integrations/store-payment-
-- integration.ts). Ekranda yalnızca son 4 hane; log/audit metadata'sına asla.
--
-- mode: 'sandbox' (https://sandbox-api.iyzipay.com) / 'live'
-- (https://api.iyzipay.com) — iyzico hesabı henüz yok, kod sandbox ile
-- hazırlanıyor; canlı anahtar gelince admin sayfasından değiştirilir, deploy
-- gerekmez. Anahtar çifti mod bazlı DEĞİL tek çift tutulur: sandbox ve canlı
-- anahtarlar farklı hesaplardan gelir, admin modu değiştirirken anahtarı da
-- değiştirir (sayfa bunu açıkça yazar).
--
-- orders.payment_provider_*: kart ödemesi izi. payment_provider_token =
-- SON başlatılan Checkout Form token'ı (her ödeme sayfası açılışı yeni token
-- üretir; callback/webhook siparişi conversationId=order.id üzerinden de
-- bulabildiği için eski token'lar sorun çıkarmaz). payment_provider_payment_id
-- = iyzico paymentId (iade/iptal için admin iyzico panelinde bunu arar).
-- payment_error = son başarısız denemenin müşteriye gösterilen mesajı.
--
-- orders.billing_*: Faz 23 (BirFatura) için fatura bilgisi. billing_identity_
-- number KİŞİSEL VERİ (TCKN) — sadece siparişte, log/audit'e asla, müşteri
-- tarafında maskeli. billing_same_as_shipping=true iken billing_address_*
-- boş kalır (fatura adresi = teslimat adresi, Faz 23 okurken teslimata düşer).
-- =============================================================================

create table public.store_payment_integrations (
  store_id uuid primary key references public.stores (id) on delete cascade,
  provider text not null default 'iyzico' check (provider = 'iyzico'),
  api_key text,
  secret_key text,
  mode text not null default 'sandbox' check (mode in ('sandbox', 'live')),
  is_active boolean not null default false,
  last_test_at timestamptz,
  last_test_ok boolean,
  last_test_message text,
  last_webhook_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.store_payment_integrations is
  'Faz 22 — mağaza başına ödeme sağlayıcısı (iyzico Checkout Form) ayarları. api_key/secret_key SIR: hiçbir RLS policy yok, anon/authenticated revoke edildi, yalnızca service-role üzerinden (lib/integrations/store-payment-integration.ts) okunur/yazılır. Anahtarlar client''a asla dönmez (sadece son 4 hane). is_active varsayılan FALSE: anahtar girilip bağlantı test edilmeden kart seçeneği vitrinde görünmez.';

create trigger set_store_payment_integrations_updated_at
  before update on public.store_payment_integrations
  for each row execute function public.set_updated_at();

alter table public.store_payment_integrations enable row level security;

revoke all on table public.store_payment_integrations from anon, authenticated;

-- ---------------------------------------------------------------------------
-- orders — kart ödemesi izi
-- ---------------------------------------------------------------------------
alter table public.orders
  add column payment_provider text check (payment_provider is null or payment_provider = 'iyzico'),
  add column payment_provider_token text,
  add column payment_provider_payment_id text,
  add column payment_error text;

comment on column public.orders.payment_provider_token is
  'Faz 22 — son başlatılan iyzico Checkout Form token''ı. Her ödeme sayfası açılışında yenilenir; callback/webhook önce bu token''la, bulamazsa conversationId (= orders.id) ile siparişi çözer.';
comment on column public.orders.payment_provider_payment_id is
  'Faz 22 — iyzico paymentId. Ödeme başarıyla doğrulanınca bir kez yazılır; iade/iptal admin iyzico panelinden bu id ile yapılır (API iadesi bu turun kapsamı dışı).';

create index orders_payment_provider_token_idx
  on public.orders (payment_provider_token)
  where payment_provider_token is not null;

-- ---------------------------------------------------------------------------
-- orders — fatura bilgisi (Faz 23 BirFatura bunları okur)
-- ---------------------------------------------------------------------------
alter table public.orders
  add column billing_type text not null default 'individual' check (billing_type in ('individual', 'corporate')),
  add column billing_name text,
  add column billing_identity_number text,
  add column billing_tax_office text,
  add column billing_same_as_shipping boolean not null default true,
  add column billing_address_city text,
  add column billing_address_district text,
  add column billing_address_line text;

comment on column public.orders.billing_identity_number is
  'Faz 22 — bireyselde TCKN (11 hane, opsiyonel), kurumsalda VKN (10 hane, zorunlu). KİŞİSEL VERİ: log/audit metadata''sına asla yazılmaz, müşteri tarafında maskeli gösterilir.';
