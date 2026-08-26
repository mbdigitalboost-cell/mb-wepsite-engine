-- =============================================================================
-- PLATFORM MIGRATION 0008
-- Store-scoped RBAC/RLS helper functions (Phase 2 foundation)
--
-- Mirrors 0004/0006's is_platform_admin()/is_customer_member() pattern one
-- level down, at store_id granularity, instead of duplicating join logic
-- in every Phase 2 policy (0009-0011). Three tiers, per
-- PHASE_2_FINAL_ARCHITECTURE_PLAN.md §I and the kullanıcının 2026-08-25
-- "PHASE 2 ARCHITECTURE DECISIONS" onayı (madde 2 — RBAC):
--
--   is_store_member(store_id)         -> store_viewer+ (okuma: her üye)
--   is_store_editor_member(store_id)  -> store_editor+ (içerik yazma:
--                                         Branding / Navigation / Homepage Builder)
--   is_store_admin_member(store_id)   -> SADECE store_admin+ (Store Profile /
--                                         Store Settings / kritik ayarlar)
--
-- is_store_member() KASITLI OLARAK var olan, kanıtlanmış
-- is_customer_member()'a delege eder — yeni bir üyelik mantığı icat
-- etmiyor, sadece store_id'yi stores.customer_id üzerinden çözüyor.
-- is_store_editor_member()/is_store_admin_member() ise is_customer_member()'ın
-- YAPAMADIĞI bir ayrımı (store_editor'ü store_admin'den ayırma) yapmak
-- zorunda olduğu için customer_users'ı doğrudan sorguluyor.
--
-- PERFORMANS NOTU (Context7 üzerinden Supabase RLS dokümantasyonunda bu
-- turda doğrulandı — supabase/supabase repo, "Row Level Security" ve
-- "RLS performance and best practices" sayfaları): bu fonksiyonlar
-- 0009-0011'deki policy'lerde `(select public.is_store_member(...))`
-- şeklinde, bir alt sorguya sarmalanmış olarak çağrılacak — bu, Postgres
-- planner'ın sonucu satır başına değil, ifade başına bir kez hesaplayıp
-- (initPlan) önbelleğe almasını sağlıyor. Aynı dokümantasyon ayrıca her
-- policy'de `to authenticated`/`to anon` gibi hedef rolün AÇIKÇA
-- belirtilmesini öneriyor (anon istekleri için politika koşulunun hiç
-- çalıştırılmaması için) — 0009-0011'in tüm policy'leri bunu uygulayacak.
-- Bu, 0001-0007'nin kendi policy'lerinde YAPILMAYAN ama bugün resmi
-- dokümantasyonda önerilen bir iyileştirme; 0001-0007'ye DOKUNULMUYOR,
-- sadece yeni policy'ler bu daha iyi pratiği baştan benimsiyor.
--
-- Bu migration hiçbir mevcut tabloya/veriye dokunmuyor, hiçbir mevcut
-- fonksiyonu (is_platform_admin/is_customer_member) DEĞİŞTİRMİYOR —
-- sadece 3 YENİ SECURITY DEFINER fonksiyon ekliyor. Tam olarak geri
-- alınabilir: `drop function public.is_store_member(uuid), public.is_store_editor_member(uuid), public.is_store_admin_member(uuid);`
-- =============================================================================

create or replace function public.is_store_member(target_store_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_customer_member(
    (select customer_id from public.stores where id = target_store_id)
  );
$$;

comment on function public.is_store_member(uuid) is
  'True if the currently authenticated user can READ this store''s data — any store-equivalent role (store_admin/store_editor/store_viewer, or legacy customer) of that store''s customer, or a platform admin. Delegates to is_customer_member(); does not duplicate its logic. Returns false (via is_customer_member -> NULL customer_id lookup) for a non-existent store_id.';

create or replace function public.is_store_editor_member(target_store_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.customer_users cu
      join public.stores s on s.id = target_store_id
      where cu.user_id = auth.uid()
        and cu.customer_id = s.customer_id
        and cu.role in ('store_admin', 'store_editor')
    );
$$;

comment on function public.is_store_editor_member(uuid) is
  'True if the currently authenticated user can WRITE this store''s content (Branding / Navigation / Homepage Builder) — store_admin OR store_editor of that store''s customer, or a platform admin. store_viewer does NOT pass.';

create or replace function public.is_store_admin_member(target_store_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.customer_users cu
      join public.stores s on s.id = target_store_id
      where cu.user_id = auth.uid()
        and cu.customer_id = s.customer_id
        and cu.role = 'store_admin'
    );
$$;

comment on function public.is_store_admin_member(uuid) is
  'True if the currently authenticated user can WRITE this store''s Profile/Settings/critical config — SADECE store_admin of that store''s customer (store_editor does NOT pass), or a platform admin.';

-- ---------------------------------------------------------------------------
-- is_store_publicly_visible — 0009-0011'in anon policy'lerinin KULLANMASI
-- ZORUNLU olduğu 4. fonksiyon. BULGU (bu turda canlıya karşı begin;...;
-- rollback; ile ampirik olarak test edilerek keşfedildi — bkz.
-- PHASE_2_MIGRATION_TEST_REPORT.md "Bulunan ve düzeltilen tasarım hatası"
-- bölümü): `stores` tablosunun (0007) KENDİSİNDE anon için hiçbir SELECT
-- politikası YOK. Eğer bir alt tablonun anon policy'si doğrudan
-- `exists (select 1 from stores where id = ... and status = 'active')`
-- yazarsa, bu alt-sorgu YİNE `stores`'un KENDİ RLS'ine tabi olur (Context7
-- üzerinden bu turda doğrulanan Supabase RLS dokümantasyonunun "recursive
-- RLS" uyarısı tam olarak bunu anlatıyor) — ve `stores`'un anon'a hiçbir
-- SELECT politikası olmadığı için o alt-sorgu anon için HER ZAMAN false
-- döner, DURUM NE OLURSA OLSUN. Sonuç: ham bir exists(...) alt-sorgusu
-- kullanılsaydı, hiçbir gerçek anonim ziyaretçi HİÇBİR mağazanın public
-- verisini asla göremezdi (aktif olsa bile) — "public storefront okuma
-- modeli" tamamen işlevsiz kalırdı. Bu, ilk yazımda fark edilmedi; canlıya
-- karşı gerçek anon rolüyle (ve YANLIŞLIKLA önceki bir test adımından
-- sızan `request.jwt.claims` olmadan, temiz bir oturumla) test edilirken
-- yakalandı — bkz. final rapordaki test metodolojisi notu.
--
-- ÇÖZÜM: is_platform_admin()/is_customer_member() ile AYNI teknik — bir
-- SECURITY DEFINER fonksiyon, `stores`'u fonksiyon SAHİBİ olarak (RLS'i
-- bypass ederek) okur, ama SADECE dar bir boolean sonuç döndürür ("bu
-- store_id aktif mi") — `stores`'un hiçbir sütununu anon'a AÇMAZ. Bu,
-- `stores` tablosuna geniş bir anon SELECT politikası eklemekten (ki bu,
-- "minimum public yüzey" ilkesiyle çelişirdi ve ayrı bir onay gerektirirdi)
-- çok daha dar ve güvenli bir yüzey.
-- ---------------------------------------------------------------------------

create or replace function public.is_store_publicly_visible(target_store_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.stores where id = target_store_id and status = 'active'
  );
$$;

comment on function public.is_store_publicly_visible(uuid) is
  'True if target_store_id exists and is status=active. SECURITY DEFINER — bypasses stores'' own RLS (which has no anon policy) on purpose, so 0009-0011''s anon policies can check "is this store active" without a broad anon SELECT policy on stores itself. Returns ONLY a boolean, never exposes any stores column.';
