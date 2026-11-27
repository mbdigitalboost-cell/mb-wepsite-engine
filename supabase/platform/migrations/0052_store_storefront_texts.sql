-- Faz 39 Adım 2.2–2.3 — mağazaya özel vitrin metinleri.
--
-- NEDEN: ortak mağaza motoru bugüne kadar tek bir mağazanın metinlerini kodda
-- sabit tutuyordu (duyuru şeridi maddesi, sayfa sonu CTA bandı cümleleri,
-- ürün sayfasındaki "kendi üretim" rozeti). İkinci bir mağaza açılsa aynı
-- metinleri gösterirdi. Bu tablo her mağazanın metnini kendi satırına taşır;
-- admin panelden (Mağaza → Ayarlar → Vitrin metinleri) düzenlenir.
--
-- KURAL: boş alan = o parça hiç gösterilmez. Uydurma varsayılan yok; bu
-- migration HİÇBİR mağaza için satır eklemez (mevcut mağazanın bugünkü
-- metinleri ayrı, mağazaya özel tohum dosyasındadır: 0053).
--
-- UYGULAMA SIRASI: önce 0052, sonra 0053; ikisi de kod yayınlanmadan ÖNCE.
-- Kod, tablo yokken ya da satır boşken bu parçaları gizler.
--
-- GERİ ALMA: drop table public.store_storefront_texts;  (başka tablo bağlı değil)

create table if not exists public.store_storefront_texts (
  store_id uuid primary key references public.stores (id) on delete cascade,
  -- Duyuru şeridinin mağazaya özel maddeleri, sırayla. Ücretsiz kargo ve iade
  -- iddiaları burada TUTULMAZ; kargo/iade ayarından türetilir.
  announcement_items text[] not null default '{}',
  -- Sayfa sonu CTA bandı. Başlık boşsa bant gösterilmez.
  cta_band_title text,
  cta_band_subtitle text,
  -- Ürün sayfasındaki "kendi üretim" rozeti. Başlık boşsa rozet gösterilmez.
  own_production_title text,
  own_production_subtitle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_storefront_texts_items_count check (cardinality(announcement_items) <= 6),
  constraint store_storefront_texts_items_length check (char_length(array_to_string(announcement_items, '')) <= 480),
  constraint store_storefront_texts_cta_title_length check (cta_band_title is null or char_length(cta_band_title) <= 200),
  constraint store_storefront_texts_cta_subtitle_length check (cta_band_subtitle is null or char_length(cta_band_subtitle) <= 200),
  constraint store_storefront_texts_badge_title_length check (own_production_title is null or char_length(own_production_title) <= 200),
  constraint store_storefront_texts_badge_subtitle_length check (own_production_subtitle is null or char_length(own_production_subtitle) <= 200)
);

comment on table public.store_storefront_texts is
  'Faz 39 — mağaza başına vitrin metinleri (duyuru şeridi maddeleri, CTA bandı, kendi üretim rozeti). Boş alan = parça gösterilmez. Yayındaki mağazanın satırı herkese okunur; yalnız store_admin+ yazar.';

create trigger set_store_storefront_texts_updated_at
  before update on public.store_storefront_texts
  for each row execute function public.set_updated_at();

alter table public.store_storefront_texts enable row level security;

-- Okuma: vitrin (anon) yalnız YAYINDAKİ mağazanın satırını görür; panel üyesi
-- (editor+) kendi mağazasınınkini, mağaza yayında olmasa da görür.
create policy store_storefront_texts_select_public on public.store_storefront_texts
  for select to anon, authenticated using ((select public.is_store_publicly_visible(store_id)));
create policy store_storefront_texts_select_editor_tier on public.store_storefront_texts
  for select to authenticated using ((select public.is_store_editor_member(store_id)));

-- Yazma: yalnız store_admin+ (diğer mağaza ayarlarıyla aynı). Silme politikası
-- yok: satır mağaza silinince cascade ile gider.
create policy store_storefront_texts_insert_admin_tier on public.store_storefront_texts
  for insert to authenticated with check ((select public.is_store_admin_member(store_id)));
create policy store_storefront_texts_update_admin_tier on public.store_storefront_texts
  for update to authenticated
  using ((select public.is_store_admin_member(store_id)))
  with check ((select public.is_store_admin_member(store_id)));

-- Doğrulama (salt-okunur, uyguladıktan sonra):
--   select count(*) from public.store_storefront_texts;                      -- 0 (0053'ten önce)
--   select policyname, cmd from pg_policies where tablename = 'store_storefront_texts' order by 1;  -- 4 satır
