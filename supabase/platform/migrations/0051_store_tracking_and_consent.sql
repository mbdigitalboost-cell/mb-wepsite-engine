-- =============================================================================
-- PLATFORM MIGRATION 0051
-- Faz 35 — mağaza başına takip/reklam araçları ve çerez rızası kayıtları.
--
-- 1) store_tracking_settings — Meta Pixel / GA4 / Google Ads kimlikleri
--    MAĞAZA BAŞINA (Faz 28/29 ajans ilkesi: platform env'leri vitrinde
--    kullanılmaz). Kimlikler gizli değildir (sayfa kaynağında görünür) →
--    vitrin okur; admin yazar. Bir araç açıkken kimliği boş olamaz.
--    consent_version: etkin araç kümesi değişince artar → ziyaretçiye yeniden sorulur.
-- 2) cookie_consent_records — rızanın İSPATI (KVKK Çerez Rehberi: ispat
--    yükü veri sorumlusunda). Ham IP / user-agent YOK; consent_id tarayıcıda
--    üretilen rastgele kimlik (kişiye bağlanmaz). RLS açık, policy YOK →
--    yalnız service-role (vitrin server action'ı) yazar. Otomatik silme yok
--    (saklama süresi hukukçu kararı).
-- 3) store_consent_summary — editor+ için yalnız TOPLAM sayılar. Kayıt
--    tablosunda policy olmadığından SECURITY DEFINER; erişim içeride
--    is_store_editor_member ile denetlenir, satır değil sayı döner.
-- 4) Taktikalp46 için boş ayar satırı (hepsi kapalı → çerez bandı görünmez).
-- =============================================================================

create table if not exists public.store_tracking_settings (
  store_id uuid primary key references public.stores (id) on delete cascade,
  meta_pixel_id text check (meta_pixel_id is null or meta_pixel_id ~ '^[0-9]{10,20}$'),
  meta_enabled boolean not null default false,
  ga4_measurement_id text check (ga4_measurement_id is null or ga4_measurement_id ~ '^G-[A-Z0-9]{4,20}$'),
  ga4_enabled boolean not null default false,
  google_ads_id text check (google_ads_id is null or google_ads_id ~ '^AW-[0-9]{6,15}$'),
  google_ads_purchase_label text check (google_ads_purchase_label is null or google_ads_purchase_label ~ '^[A-Za-z0-9_-]{1,100}$'),
  google_ads_enabled boolean not null default false,
  consent_version integer not null default 1 check (consent_version >= 1),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint store_tracking_meta_requires_id check (not meta_enabled or meta_pixel_id is not null),
  constraint store_tracking_ga4_requires_id check (not ga4_enabled or ga4_measurement_id is not null),
  constraint store_tracking_ads_requires_id check (not google_ads_enabled or google_ads_id is not null)
);

comment on table public.store_tracking_settings is
  'Faz 35 — mağaza başına Meta Pixel / GA4 / Google Ads. Betikler yalnız ziyaretçinin çerez onayından sonra yüklenir. consent_version etkin araç kümesi değişince artar.';

create trigger set_store_tracking_settings_updated_at
  before update on public.store_tracking_settings
  for each row execute function public.set_updated_at();

alter table public.store_tracking_settings enable row level security;

create policy store_tracking_settings_select_public on public.store_tracking_settings
  for select to anon, authenticated using ((select public.is_store_publicly_visible(store_id)));
create policy store_tracking_settings_select_editor_tier on public.store_tracking_settings
  for select to authenticated using ((select public.is_store_editor_member(store_id)));
create policy store_tracking_settings_insert_admin_tier on public.store_tracking_settings
  for insert to authenticated with check ((select public.is_store_admin_member(store_id)));
create policy store_tracking_settings_update_admin_tier on public.store_tracking_settings
  for update to authenticated
  using ((select public.is_store_admin_member(store_id)))
  with check ((select public.is_store_admin_member(store_id)));

insert into public.store_tracking_settings (store_id)
select s.id from public.stores s where s.slug = 'taktikalp46'
on conflict (store_id) do nothing;

create table if not exists public.cookie_consent_records (
  id bigint generated always as identity primary key,
  store_id uuid not null references public.stores (id) on delete cascade,
  consent_id uuid not null,
  analytics boolean not null,
  marketing boolean not null,
  consent_version integer not null,
  cookie_policy_version integer,
  action text not null check (action in ('accept_all', 'reject_all', 'custom', 'withdraw')),
  created_at timestamptz not null default now()
);

comment on table public.cookie_consent_records is
  'Faz 35 — çerez rızası ispatı (KVKK Çerez Rehberi). Ham IP/user-agent yok; consent_id tarayıcıdaki rastgele kimlik. Yalnız service-role yazar; otomatik silme yok (saklama süresi hukukçu kararı).';

create index if not exists cookie_consent_records_store_created_idx on public.cookie_consent_records (store_id, created_at desc);

alter table public.cookie_consent_records enable row level security;
revoke all on public.cookie_consent_records from anon, authenticated;

create or replace function public.store_consent_summary(p_store_id uuid, p_since timestamptz)
returns table (action text, total bigint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_store_editor_member(p_store_id) then
    raise exception 'yetkisiz';
  end if;
  return query
    select r.action, count(*)::bigint
    from public.cookie_consent_records r
    where r.store_id = p_store_id and r.created_at >= p_since
    group by r.action;
end;
$$;

revoke all on function public.store_consent_summary(uuid, timestamptz) from public, anon;
grant execute on function public.store_consent_summary(uuid, timestamptz) to authenticated;

-- 5) Çerez Politikası yeni sürümü (Faz 35): üçüncü taraf bölümü artık {{cerez.ucuncu_taraf}} değişkeniyle
--    mağazanın gerçek takip ayarından üretilir. OTOMATİK ÜRETİLDİ: node scripts/build-legal-templates.mjs --version-sql=cookies
-- cookies yeni sürüm (mevcut en yüksek sürüm + 1; hukukçu kontrolü sıfırlanır; aynı metin varsa eklenmez)
insert into public.store_legal_documents (store_id, kind, title, body, version)
select s.id, 'cookies', $legal$Çerez Politikası$legal$, $legal$Bu politika, {{magaza.adi}} internet sitesinde kullanılan çerezler ve benzeri tarayıcı depolama teknolojileri hakkında sizi bilgilendirmek amacıyla hazırlanmıştır.

## Çerez nedir?

Çerezler, ziyaret ettiğiniz internet sitesi tarafından tarayıcınıza kaydedilen küçük metin dosyalarıdır. Bu sitede ayrıca tarayıcınızın yerel depolama (localStorage) ve oturum depolama (sessionStorage) alanları kullanılır.

## Kullandığımız çerezler ve depolama alanları

Sitenin çalışması için gerekli **zorunlu** çerezler ve depolama alanları:

- **sb-storefront-auth** (çerez) — Müşteri hesabına giriş yaptığınızda oturumunuzu açık tutar. Yalnız giriş yapan müşterilerde oluşur; çıkış yaptığınızda veya oturum sona erdiğinde geçersiz hâle gelir.
- **mb-store-cart** (yerel depolama) — Sepetinizdeki ürünleri tarayıcınızda saklar. Sepeti boşalttığınızda, siparişiniz tamamlandığında veya tarayıcı verilerini sildiğinizde silinir.
- **mb-checkout-discount** (oturum depolama) — Ödeme adımında uyguladığınız indirim kodunu sayfa yenilendiğinde korur. Tarayıcı sekmesi kapandığında silinir.
{{#if cerez.onay_cerezi}}
- **mb_consent** (çerez) — Çerez tercihinizi (analitik / reklam izni verip vermediğinizi) 6 ay boyunca hatırlar; böylece her sayfada yeniden sorulmaz.
{{/if}}

Bu zorunlu çerezler ve depolama alanları, talep ettiğiniz alışveriş hizmetini sunabilmemiz için gereklidir; bu nedenle onayınıza bağlı değildir.

## Analitik ve reklam çerezleri (üçüncü taraf)

{{cerez.ucuncu_taraf}}

Kartla ödeme sırasında açılan iyzico güvenli ödeme sayfası, kendi çerezlerini kullanabilir; bu çerezler iyzico'nun kendi politikalarına tabidir.

## Çerezleri nasıl yönetebilirsiniz?

Tarayıcınızın ayarlarından çerezleri ve site verilerini silebilir veya engelleyebilirsiniz. Zorunlu çerezleri engellemeniz hâlinde sepet ve müşteri hesabı gibi özellikler çalışmayabilir.

Kişisel verilerinizin işlenmesine ilişkin ayrıntılar için [KVKK Aydınlatma Metni](/kvkk) sayfasına bakabilirsiniz.$legal$,
       coalesce((select max(d.version) from public.store_legal_documents d where d.store_id = s.id and d.kind = 'cookies'), 0) + 1
from public.stores s
where s.slug = 'taktikalp46'
  and not exists (
    select 1 from public.store_legal_documents d2
    where d2.store_id = s.id and d2.kind = 'cookies' and d2.body = $legal$Bu politika, {{magaza.adi}} internet sitesinde kullanılan çerezler ve benzeri tarayıcı depolama teknolojileri hakkında sizi bilgilendirmek amacıyla hazırlanmıştır.

## Çerez nedir?

Çerezler, ziyaret ettiğiniz internet sitesi tarafından tarayıcınıza kaydedilen küçük metin dosyalarıdır. Bu sitede ayrıca tarayıcınızın yerel depolama (localStorage) ve oturum depolama (sessionStorage) alanları kullanılır.

## Kullandığımız çerezler ve depolama alanları

Sitenin çalışması için gerekli **zorunlu** çerezler ve depolama alanları:

- **sb-storefront-auth** (çerez) — Müşteri hesabına giriş yaptığınızda oturumunuzu açık tutar. Yalnız giriş yapan müşterilerde oluşur; çıkış yaptığınızda veya oturum sona erdiğinde geçersiz hâle gelir.
- **mb-store-cart** (yerel depolama) — Sepetinizdeki ürünleri tarayıcınızda saklar. Sepeti boşalttığınızda, siparişiniz tamamlandığında veya tarayıcı verilerini sildiğinizde silinir.
- **mb-checkout-discount** (oturum depolama) — Ödeme adımında uyguladığınız indirim kodunu sayfa yenilendiğinde korur. Tarayıcı sekmesi kapandığında silinir.
{{#if cerez.onay_cerezi}}
- **mb_consent** (çerez) — Çerez tercihinizi (analitik / reklam izni verip vermediğinizi) 6 ay boyunca hatırlar; böylece her sayfada yeniden sorulmaz.
{{/if}}

Bu zorunlu çerezler ve depolama alanları, talep ettiğiniz alışveriş hizmetini sunabilmemiz için gereklidir; bu nedenle onayınıza bağlı değildir.

## Analitik ve reklam çerezleri (üçüncü taraf)

{{cerez.ucuncu_taraf}}

Kartla ödeme sırasında açılan iyzico güvenli ödeme sayfası, kendi çerezlerini kullanabilir; bu çerezler iyzico'nun kendi politikalarına tabidir.

## Çerezleri nasıl yönetebilirsiniz?

Tarayıcınızın ayarlarından çerezleri ve site verilerini silebilir veya engelleyebilirsiniz. Zorunlu çerezleri engellemeniz hâlinde sepet ve müşteri hesabı gibi özellikler çalışmayabilir.

Kişisel verilerinizin işlenmesine ilişkin ayrıntılar için [KVKK Aydınlatma Metni](/kvkk) sayfasına bakabilirsiniz.$legal$
  );

-- Doğrulama (beklenen: 2 tablo / Taktikalp46 ayar satırı 1, hepsi kapalı / policy 4 ve 0 / fonksiyon 1):
-- select
--   (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('store_tracking_settings', 'cookie_consent_records')) as tables,
--   (select count(*) from public.store_tracking_settings t join public.stores s on s.id = t.store_id where s.slug = 'taktikalp46' and not t.meta_enabled and not t.ga4_enabled and not t.google_ads_enabled) as seed,
--   (select count(*) from pg_policies where tablename = 'store_tracking_settings') as tracking_policies,
--   (select count(*) from pg_policies where tablename = 'cookie_consent_records') as record_policies,
--   (select count(*) from pg_proc where proname = 'store_consent_summary') as fn;
