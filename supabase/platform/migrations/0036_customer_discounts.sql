-- =============================================================================
-- PLATFORM MIGRATION 0036
-- customer_discounts + orders.discount_* — "Aboneler" (subscribers) + kişi
-- başı indirim sistemi. GENEL bir admin özelliği (Siparişler gibi) — herhangi
-- bir mağaza için, sadece Taktikalp46'ya özel değil.
--
-- Verified via list_migrations before writing this file: 0035 is the latest
-- applied migration, 0036 is unused. Re-verified immediately before
-- apply_migration itself runs (this repo's own standing discipline since
-- migration 0024's numbering surprise).
--
-- İKİ MOD, TEK TABLO: 'code' (müşteri checkout'ta bir kod girer) ve 'auto'
-- (müşteri kendi hesabıyla giriş yapıp alışveriş yaptığında ekstra işlem
-- gerekmeden uygulanır) — admin "Aboneler" sayfasından ikisinden birini
-- seçerek oluşturur, ayrı bir tablo/route yok.
--
-- HEDEF: kayıtlı müşteri ise store_customers.id (store_customer_id), misafir
-- ise e-posta/telefon bazlı eşleşme (guest_email/guest_phone) — CHECK
-- constraint'i tam olarak birini zorunlu kılıyor, ikisini birden değil.
--
-- GÜVENLİK KARARI — 'auto' SADECE kayıtlı müşteri (store_customer_id NOT
-- NULL) için izinli, misafir hedefli değil: checkout'taki auto-apply akışı
-- oturum kimliğine (auth.uid()) dayanıyor — bu güvenilir bir kimlik
-- doğrulaması. Bir misafir için "auto" (sadece girilen e-posta eşleşirse
-- otomatik uygula) sahte bir güvenlik olurdu: herhangi biri checkout'ta
-- başka birinin e-postasını yazarak o kişinin indirimini çalabilirdi. Bu
-- yüzden misafir hedefli indirimler SADECE 'code' tipinde olabilir (aşağıdaki
-- customer_discounts_auto_requires_account CHECK'i) — kod, işletme
-- tarafından o kişiye (E-posta/WhatsApp altyapısıyla) özel olarak
-- gönderildiği için kendi başına yeterli bir yetkilendirme.
--
-- ANON RLS YOK (migration 0029'un orders tablosuyla BİREBİR aynı mimari
-- karar, aynı gerekçe): checkout'un kod doğrulama/auto-indirim okuma yolu
-- app/store/[storeSlug]/sepet/actions.ts'te ZATEN mevcut olan service-role
-- `admin` client'ından geçecek — bu tabloda anon/authenticated için HİÇBİR
-- SELECT policy'si yok. Sebep: bir anon SELECT policy'si (kod'a göre
-- filtrelenmiş olsa bile) mağazanın tüm aktif kodlarını/indirim
-- değerlerini numaralandırılabilir hale getirirdi — orders'ın "client asla
-- fiyatı belirleyemez" garantisiyle aynı sınıftan bir risk.
--
-- YAZMA: SADECE store_admin+ (requireStoreAdminAccess, requireAal2 dahil) —
-- bir indirim tanımlamak gerçek bir finansal etki, store_editor'ın "içerik
-- düzenleme" yetkisinin ÖTESİNDE (bkz. require-store-access.ts'in kendi
-- 3-katmanlı yorum bloğu). OKUMA (Aboneler sayfasının kendisi) store_editor+
-- — orders'ın kendi SELECT tier'ıyla aynı (müşteri PII'si taşıyor).
--
-- KOD BENZERSİZLİĞİ: mağaza bazında, büyük/küçük harf duyarsız (upper(code)
-- üzerinde partial unique index, sadece discount_type='code' satırları için).
-- =============================================================================

create type public.customer_discount_type as enum ('code', 'auto');
create type public.customer_discount_value_type as enum ('percentage', 'fixed');

comment on type public.customer_discount_type is
  '''code'' — müşteri checkout''ta bir kodu kendi girer. ''auto'' — kayıtlı müşteri hesabıyla giriş yapıp alışveriş yaptığında server-side otomatik uygulanır, kod yok.';

comment on type public.customer_discount_value_type is
  '''percentage'' — subtotal''ün yüzdesi (value 0-100). ''fixed'' — sabit TL tutarı.';

-- store_customer_id'yi store_id'ye karşı composite FK ile doğrulayabilmek
-- için (order_items -> products'taki AYNI (id, store_id) unique + composite
-- FK deseni, migration 0029) — bu constraint store_customers'ın kendi
-- migration'ından (0031) sonradan ekleniyor, o dosyaya dokunmadan.
alter table public.store_customers
  add constraint store_customers_id_store_id_unique unique (id, store_id);

create table public.customer_discounts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  store_customer_id uuid references public.store_customers (id) on delete cascade,
  guest_email text,
  guest_phone text,
  discount_type public.customer_discount_type not null,
  code text,
  value_type public.customer_discount_value_type not null,
  value numeric(10, 2) not null check (value > 0),
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id),
  constraint customer_discounts_store_customer_store_fkey
    foreign key (store_customer_id, store_id) references public.store_customers (id, store_id) on delete cascade,
  constraint customer_discounts_percentage_range
    check (value_type <> 'percentage' or (value > 0 and value <= 100)),
  constraint customer_discounts_target_check
    check (
      (store_customer_id is not null and guest_email is null and guest_phone is null)
      or (store_customer_id is null and (guest_email is not null or guest_phone is not null))
    ),
  constraint customer_discounts_code_shape_check
    check (
      (discount_type = 'code' and code is not null and length(btrim(code)) > 0)
      or (discount_type = 'auto' and code is null)
    ),
  constraint customer_discounts_auto_requires_account
    check (discount_type <> 'auto' or store_customer_id is not null)
);

comment on table public.customer_discounts is
  'GENEL (tüm mağazalar için, tek bir tenant''a özel değil) kişi başı indirim sistemi. Admin "Aboneler" sayfasından bir müşteri için ''code'' ya da ''auto'' tipinde bir indirim tanımlar. Checkout server-side (createOrderAction) bunu okuyup uygular — client''tan gelen bir indirim tutarına ASLA güvenilmez. Kalıcı silme yok, is_active=false ile devre dışı bırakılır (orders.applied_discount_id geçmiş siparişlerde bu satırı referans ettiği için silme geçmişi bozardı).';

comment on column public.customer_discounts.guest_email is
  'SADECE discount_type=''code'' satırlarında dolu olabilir (bkz. customer_discounts_auto_requires_account) — misafir hedefli bir ''auto'' indirim, checkout''ta sadece girilen e-postaya güvenerek uygulanacağı için sahte bir güvenlik olurdu (bkz. bu migration''ın başlık yorumu).';

create unique index customer_discounts_code_unique
  on public.customer_discounts (store_id, upper(code))
  where discount_type = 'code';

create index customer_discounts_store_id_idx on public.customer_discounts (store_id);
create index customer_discounts_store_customer_id_idx on public.customer_discounts (store_customer_id) where store_customer_id is not null;
create index customer_discounts_guest_email_idx on public.customer_discounts (store_id, guest_email) where guest_email is not null;
create index customer_discounts_guest_phone_idx on public.customer_discounts (store_id, guest_phone) where guest_phone is not null;

alter table public.customer_discounts enable row level security;

create policy customer_discounts_select_editor_tier
  on public.customer_discounts for select
  to authenticated
  using ((select public.is_store_editor_member(store_id)));

create policy customer_discounts_insert_admin_tier
  on public.customer_discounts for insert
  to authenticated
  with check ((select public.is_store_admin_member(store_id)));

create policy customer_discounts_update_admin_tier
  on public.customer_discounts for update
  to authenticated
  using ((select public.is_store_admin_member(store_id)))
  with check ((select public.is_store_admin_member(store_id)));

-- Kalıcı silme yok (bu tablonun kendi doc comment'i) — DELETE policy yok,
-- orders/order_items/customer_discounts genelinde tutarlı "no delete
-- without its own explicit decision" duruşu.

-- -----------------------------------------------------------------------------
-- orders.discount_* — uygulanan indirimin sipariş üzerindeki kalıcı kaydı
-- -----------------------------------------------------------------------------

alter table public.orders
  add column discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  add column discount_code text,
  add column applied_discount_id uuid references public.customer_discounts (id) on delete set null;

comment on column public.orders.discount_amount is
  'Server-side hesaplanan indirim tutarı (createOrderAction, lib/commerce/discounts.ts) — subtotal buna göre AZALTILMIYOR (subtotal her zaman indirim ÖNCESİ satır toplamı olarak kalıyor, mevcut tüm okuyucular bozulmasın diye); gerçek ödenecek tutar subtotal - discount_amount. 0 = indirim uygulanmadı (varsayılan, mevcut siparişler etkilenmedi).';

comment on column public.orders.discount_code is
  'Uygulanan kodun SNAPSHOT''ı (order_items.product_name''in aynı "geçmiş kaydı asla değişmez" mantığı) — customer_discounts satırı sonradan silinse/deaktive edilse bile sipariş geçmişinde ne kullanıldığı görünür kalır. ''auto'' tipi bir indirim uygulandıysa NULL (kod yok).';

comment on column public.orders.applied_discount_id is
  'Canlı referans (varsa) — customer_discounts satırı silinirse SET NULL (discount_amount/discount_code snapshot''ları her durumda kalıcı kalır, bu sütun sadece "hâlâ var olan orijinal satırı bul" için bir kolaylık).';

alter table public.orders
  add constraint orders_discount_amount_le_subtotal check (discount_amount <= subtotal);

-- Migration 0029'un orders_select_editor_tier/orders_update_editor_tier ve
-- 0031'in orders_select_own_customer policy'leri DOKUNULMADI — yeni sütunlar
-- zaten var olan "tüm sütunları kapsayan" policy'lerin altına giriyor, ayrı
-- bir policy gerekmiyor.
