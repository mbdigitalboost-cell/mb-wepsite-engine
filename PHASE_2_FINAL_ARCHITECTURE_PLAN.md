# PHASE 2 — Final Architecture Plan (Kararlar Sonrası)

**Tarih:** 2026-08-25
**Durum: 📋 SADECE PLAN.** Bu belge, ilk Phase 2 raporundaki (`PHASE_2_COMMERCE_ADMIN_ARCHITECTURE_PLAN.md`) 4 açık soruya verdiğiniz 7 kararı işler. Kararlar mevcut repository'ye karşı doğrulandı (aşağıda her bölümde hangi mevcut dosya/desenin temel alındığı belirtiliyor). **KODLAMA YOK. MIGRATION YOK. PRODUCTION DEĞİŞİKLİĞİ YOK.**

---

## A) Final Architecture

İki katmanlı model aynen korunuyor (Platform DB = merkezi, çok-mağazalı; customer-template DB = müşteri başına ayrı proje, sadece Petra'nın tanıtım sitesi). Yeni eklenenler, önceki plana göre şu şekilde netleşti:

- **Platform DB'de 3 yeni yetki katmanı** (önceki planda 2 idi): `is_store_member()` (okuma, `store_viewer`+), `is_store_editor_member()` (içerik yazma, `store_editor`+), `is_store_admin_member()` (ayarlar/kritik yazma, sadece `store_admin`+ — **YENİ**, kararlarınızın getirdiği ek granülerlik).
- **Public storefront için ayrı bir okuma yolu** — dashboard'un kullandığı çerezli/oturumlu `createSupabaseServerClient()`'tan TAMAMEN FARKLI, yeni bir anon-key, oturumsuz Platform DB istemcisi (§H).
- **`stores` yönetimi artık Phase 2'nin kendi modülü** — `/dashboard/stores` (platform-admin, çapraz-müşteri liste, mevcut `/dashboard/websites` deseninin birebir eşdeğeri) + `/dashboard/customers/[customerId]/stores/[storeId]/...` (mağaza-özel yönetim ekranları).
- **Sıralama artık iki parçalı:** DB'de numeric `sort_order` (10/20/30 aralıklı), UI'da sürükle-bırak, ikisi arasında server-side, client'a güvenmeyen bir transaction katmanı (§K).

**Doğrulanmış mevcut emsal desenler (bu plan bunları tekrar kullanıyor, icat etmiyor):**
- `lib/auth/reauthenticate.ts` — zaten canlıda, "kritik işlem için şifre yeniden doğrulama" deseni (bugün sadece rol değişikliğinde kullanılıyor). Karar 3'teki "store_admin kritik işlemlerde re-authentication" ihtiyacı bunu YENİDEN KULLANACAK, yeni bir mekanizma icat edilmeyecek.
- `app/dashboard/customers/actions.ts` + `app/dashboard/customers/page.tsx`/`new/page.tsx` — mevcut "admin-only CRUD + liste + oluşturma formu" deseni, Stores modülünün doğrudan şablonu.
- `lib/cms/adapters/shared.ts`'in `fetchPublishedList`/`fetchPublishedSingle` (anon client + fallback, asla throw etmez) — public storefront okuma modelinin (§H) tasarım felsefesi buradan alınıyor, ama Platform DB için YENİDEN yazılacak (bu fonksiyonlar customer-template projesine özel).
- `lib/auth/audit-log.ts`, `lib/auth/roles.ts`, `lib/auth/require-customer-access.ts` — mevcut haliyle korunuyor, üzerine ekleme yapılıyor (aşağıda detaylı).

---

## B) Store Management Architecture

**İki seviyeli admin ekranı:**
1. **`/dashboard/stores`** (platform-admin only, `requireAdmin()`) — TÜM mağazaları çapraz-müşteri listeler (mevcut `/dashboard/websites/page.tsx` ile birebir aynı desen). Filtre: müşteri adına göre, status'e göre. "+ Yeni Mağaza" → `/dashboard/stores/new`.
2. **`/dashboard/customers/[customerId]/stores/[storeId]`** — bir mağazanın detay sayfası: özet bilgi + status toggle + Profile/Settings/Branding/Navigation/Homepage'e geçiş linkleri (mevcut `customers/[customerId]/websites/[websiteId]` desenine birebir uygun).

**Store oluşturma (server-side güvenlik, karar 2'nin açık şartı):**
`createStoreAction` mutlaka `requireAdmin()` ile başlar (mevcut `createCustomerAction`/`createWebsiteAction` ile AYNI desen — Server Action kendi başına, hangi sayfanın onu çağırdığından bağımsız olarak kontrolü tekrar yapar). `customer_id` FormData'dan gelen ham bir değer olarak KABUL EDİLMEZ — dropdown'daki müşteri listesi zaten `requireAdmin()` sonrası server-side çekilir, ama action'ın kendisi yine de `customer_id`'nin gerçek bir `customers` satırına referans verdiğini FK constraint'iyle (DB seviyesi) doğrular; uydurma/var olmayan bir `customer_id` `23503` ile reddedilir. `slug` alanı `stores_slug_unique` + `stores_slug_format` (0007'de zaten var, değişmiyor) ile korunur.

**Store owner/member ilişkisi — DÜRÜSTLÜKLE BELİRTİLMESİ GEREKEN BİR SINIR:** Bugünkü şema (`customer_users`) rolü **müşteri** (`customer_id`) seviyesinde tutuyor, **mağaza** (`store_id`) seviyesinde değil. Bu, bugün (her müşterinin tek mağazası olduğu sürece) sorun yaratmıyor — bir `store_admin` zaten sadece kendi müşterisinin tek mağazasına erişebiliyor. AMA 0007'nin kendi yorumunda belirtilen "gelecekte bir müşterinin birden fazla mağazası olabilir" senaryosu gerçekleşirse, bugünkü model o müşterinin TÜM mağazalarına aynı anda erişim verir — mağaza-özel bir "sadece Mağaza A'ya erişebilsin, Mağaza B'ye erişemesin" ayrımı YAPAMAZ. Bunu şimdi çözmüyorum (kapsam dışı, "Petra'nın mevcut yapısını bozma" ve "multi-store bugünün konusu değil" talimatlarınızla uyumlu), ama gelecekte gerçek per-store membership gerekirse ayrı bir `store_users` tablosu (bugünkü `customer_users`'a paralel, ama `store_id` FK'li) gerekeceğini şimdiden not ediyorum — bu, "modüler ve gelecekte genişleyebilir olsun" isteğinizin (karar 6) somut bir örneği.

---

## C) Store Profile Schema

`store_profiles` — 1:1, `store_id uuid primary key references stores(id) on delete cascade` (unique olması için PK olarak kullanmak, ayrı bir `id` + unique constraint'ten daha basit — tercih notu).

`display_name text`, `logo_url text`, `favicon_url text`, `phone text`, `email text`, `address text`, `social_links jsonb not null default '{}'`, `business_info jsonb not null default '{}'`, `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()` (+ mevcut `set_updated_at()` trigger — Platform DB'de zaten var, migration 0007'de kullanıldı, aynen tekrar kullanılıyor).

**Yazma yetkisi: `store_admin`+ (store_editor DAHİL DEĞİL)** — karar 3'te "store_admin: store ayarları" başlığı altında, `store_editor`in listesinde YOK. İş/iletişim kimliği bilgisi (§B'deki gerekçeyle) "ayarlar" tabakasına giriyor.

---

## D) Store Settings Schema

`store_settings` — 1:1, `store_id uuid primary key references stores(id) on delete cascade`.

`currency text not null default 'TRY'`, `locale text not null default 'tr-TR'`, `tax_mode text not null default 'excluded' check (tax_mode in ('included','excluded','disabled'))`, `maintenance_mode boolean not null default false`, `maintenance_message text`, `customer_settings jsonb not null default '{}'`, `order_settings jsonb not null default '{}'`, `general_preferences jsonb not null default '{}'`, `created_at`, `updated_at`.

**`store_public_settings` view** (mevcut `tracking_public_settings` deseninin — customer-template 0003 — birebir Platform DB eşdeğeri): `select store_id, currency, locale, maintenance_mode, maintenance_message from store_settings` — SADECE bunlar public. `customer_settings`/`order_settings`/`general_preferences` asla view'a girmez (karar 5'in "secret/configuration alanları public view'a taşınmamalı" şartı).

**Yazma yetkisi: `store_admin`+ only.** **`maintenance_mode`'u `true`'ya çevirmek "kritik işlem" sayılır** (mağazayı fiilen yayından kaldırıyor) → `reauthenticateWithPassword()` ile korunur (mevcut mekanizma, karar 3'ün "store_admin kritik işlemlerde re-authentication" şartı).

---

## E) Branding Schema

`store_branding` — 1:1, `store_id uuid primary key references stores(id) on delete cascade`.

`primary_color text`, `secondary_color text`, `accent_color text`, `button_style text check (button_style in ('rounded','square','pill'))`, `typography text`, `theme_config jsonb not null default '{}'`, `created_at`, `updated_at`.

**Yazma yetkisi: `store_editor`+ (store_admin VE store_editor)** — görsel/tasarım içeriği, karar 3'te store_editor'e açık "içerik/mağaza içeriği düzenleme" kapsamına giriyor. **Kritik değil**, re-auth gerektirmiyor.

---

## F) Navigation Schema

`store_navigation_menus`: `id uuid pk`, `store_id uuid not null references stores(id) on delete cascade`, `menu_type text not null check (menu_type in ('main','footer','category'))`, `created_at`, `updated_at`, `unique (store_id, menu_type)`.

`store_navigation_items`: `id uuid pk`, `menu_id uuid not null references store_navigation_menus(id) on delete cascade`, `store_id uuid not null references stores(id) on delete cascade` (RLS'i basitleştirmek için kasıtlı denormalizasyon — önceki planla aynı), `parent_item_id uuid references store_navigation_items(id) on delete cascade` (nullable, ileride nested menü ihtiyacına hazır), `label text not null`, `url text not null`, `sort_order integer not null default 0 check (sort_order >= 0)`, `is_active boolean not null default true`, `created_at`, `updated_at`.

**Yazma (create/update/reorder/aktif-pasif): `store_editor`+. Silme (DELETE): `store_admin`+ only** — karar 3'ün "store_editor: kritik yönetim işlemleri yok" şartını somutlaştırıyor: bir öğeyi pasifleştirmek geri alınabilir (editor yapabilir), kalıcı silmek geri alınamaz (sadece admin).

**İsim ayrımı hatırlatması:** mevcut customer-template `navigation_items` (Petra'nın tanıtım sitesi, ayrı proje) ile KARIŞTIRILMAMALI — bkz. önceki raporun §K madde 2, hâlâ geçerli.

---

## G) Homepage Builder Schema

`homepage_section_types` (referans tablosu, platform-admin yönetir): `key text primary key`, `label text not null`, `description text`, `default_config jsonb not null default '{}'`, `is_active boolean not null default true`, `created_at`, `updated_at`. Seed: 10 bölüm tipi (hero, campaign_banner, category_grid, featured_products, best_sellers, brand_section, promotional_section, video_section, trust_section, footer).

`store_homepage_sections`: `id uuid pk`, `store_id uuid not null references stores(id) on delete cascade`, `section_type_key text not null references homepage_section_types(key)`, `internal_label text`, `config jsonb not null default '{}'`, `sort_order integer not null default 0 check (sort_order >= 0)`, `is_active boolean not null default true`, `created_at`, `updated_at`.

**Yazma (create/update/reorder/aktif-pasif): `store_editor`+. Silme: `store_admin`+ only** — F ile aynı gerekçe.

**Sıralama tasarımı (karar 4'ün somutlaştırılması):** DB'de `sort_order`, 10/20/30/40 gibi aralıklı değerlerle seed edilir (iki öğe arasına yeni bir öğe sığdırmak için, her seferinde tüm tabloyu yeniden numaralandırmaya gerek kalmadan — ör. 10 ile 20 arasına 15 ile eklenebilir). Aralık tükendiğinde (ör. ardışık iki tam sayı arasına sıkışma) server-side bir "yeniden numaralandırma" transaction'ı tetiklenir (10,20,30,...). Bu mantık DB şemasının değil, §K'daki server action'ın sorumluluğu.

---

## H) Public Storefront Read Model

Bu bölüm karar 1'in gerektirdiği "mimariyi tanımla, Taktikalp46'nın tamamını kodlama" isteğinin karşılığı — sadece SÖZLEŞME/SINIRLAR, sayfa/component kodu yok.

**Yeni istemci (kod yazılmayacak, sadece tasarım):** `lib/supabase/public.ts` → `createSupabasePublicClient()` — Platform DB'ye **anon key ile, çerez/oturum OLMADAN** bağlanan hafif bir istemci (mevcut `lib/cms/connection.ts`'in `getCustomerPublicSupabaseClient`'ı ile AYNI felsefe, ama Platform DB için — bugüne kadar Platform DB'nin hiç böyle bir istemcisi yoktu, çünkü hiçbir Platform DB tablosu public değildi). **Asla** `createSupabaseServerClient()` (çerezli/oturumlu, dashboard'a özel) veya `createSupabaseAdminClient()` (service-role, RLS bypass) kullanılmayacak — bu üçünün karıştırılmaması storefront güvenliğinin temeli.

**Veri tüketim sözleşmesi (yeni adapter katmanı, kod yazılmayacak, sadece imza tasarımı):**
- `getStoreBySlug(slug: string): Promise<{ id, name, status } | null>` — sadece `status='active'` mağazalar döner, `slug` public/hassas değil.
- `getStorePublicProfile(storeId): Promise<StoreProfilePublic | null>`
- `getStorePublicBranding(storeId): Promise<StoreBrandingPublic | null>`
- `getStorePublicSettings(storeId): Promise<StorePublicSettingsRow | null>` — `store_public_settings` view'ından.
- `getStoreNavigation(storeId, menuType): Promise<NavigationItem[]>` — sadece `is_active=true`.
- `getStoreHomepageSections(storeId): Promise<HomepageSection[]>` — sadece `is_active=true`, `sort_order` ile sıralı.

Hepsi `lib/cms/adapters/shared.ts`'deki gibi **asla throw etmez**, hata/boş durumda `null`/`[]` döner (storefront henüz kurulmamış bir mağaza için sayfa çökmemeli — "CMS bağlantısı bekleniyor" değil ama aynı felsefe: sessizce boş/varsayılan durum).

**Tenant izolasyonu:** Her çağrı `storeId`'yi PARAMETRE olarak alır ama asıl izolasyon RLS'in anon politikalarında (§I) — yani uygulama kodu yanlışlıkla yanlış `storeId`'yi geçirse bile, RLS bağımsız olarak sadece o `store_id`'ye ait, `is_active=true`/`status='active'` satırları döner; cross-store veri sızıntısı RLS seviyesinde imkansız, sadece app-kodu seviyesinde değil (savunma derinliği).

**Cache/revalidation yaklaşımı:** Sabit path listesi YOK (hangi mağazaların/slug'ların var olacağı önceden bilinmiyor) — bu yüzden `revalidatePath` yerine **tag-tabanlı** (`revalidateTag`) önerilir: her admin mutation action'ı (`store_profile.update`, `homepage_section.create/update/delete/reorder`, vs.) ilgili `store:${storeId}:profile` / `store:${storeId}:homepage` / `store:${storeId}:navigation` tag'ini invalidate eder. Storefront sayfaları bu tag'lerle `fetch`/`unstable_cache` üzerinden veri çeker. Bu, mevcut `revalidatePath` deseninin (sabit, bilinen path'ler için) storefront'un DİNAMİK, önceden bilinmeyen path yapısına (`/{storeSlug}`, ileride custom domain) uyarlanmış hâli.

**API/server action sınırı:** Storefront sayfaları SADECE Server Component + yukarıdaki public adapter fonksiyonları kullanır, hiçbir Server Action'ı YOKTUR (salt okunur) — bir mağaza ziyaretçisinin herhangi bir yazma yoluna asla erişimi olmaz.

---

## I) RBAC + RLS Matrisi

**Yeni SECURITY DEFINER fonksiyonlar** (Platform DB, mevcut `is_customer_member()`/`is_platform_admin()`'in devamı, `stores.customer_id` üzerinden çözümler):

| Fonksiyon | Kapsam |
|---|---|
| `is_store_member(store_id)` | platform admin ailesi + `store_admin`/`store_editor`/`store_viewer` (okuma) |
| `is_store_editor_member(store_id)` | platform admin ailesi + `store_admin`/`store_editor` (içerik yazma) |
| `is_store_admin_member(store_id)` | platform admin ailesi + SADECE `store_admin` (ayarlar/kritik yazma) — **YENİ, önceki plandan farkı** |

App katmanı (`lib/auth/roles.ts`'e eklenecek, mevcut dosya değişmeyecek şekilde EK export'lar): `STORE_ADMIN_TIER_ROLES = ["store_admin"]`, mevcut `STORE_WRITE_ROLES = ["store_admin","store_editor"]` aynen kullanılmaya devam eder (içerik-tier için).

**Tablo × Rol matrisi (SELECT / yazma / silme):**

| Tablo | `store_viewer` | `store_editor` | `store_admin` | `platform_admin`/`super_admin` | Public (anon) |
|---|---|---|---|---|---|
| `stores` (0007, DEĞİŞMİYOR) | SELECT | SELECT | SELECT | SELECT/UPDATE/INSERT/DELETE | — |
| `store_profiles` | SELECT | SELECT | SELECT/UPDATE | tümü | SELECT (aktif mağaza) |
| `store_settings` | SELECT | SELECT | SELECT/UPDATE (`maintenance_mode=true` → re-auth) | tümü | SADECE `store_public_settings` view |
| `store_branding` | SELECT | SELECT/UPDATE | SELECT/UPDATE | tümü | SELECT (aktif mağaza) |
| `store_navigation_menus/items` | SELECT | SELECT/INSERT/UPDATE (silme yok) | SELECT/INSERT/UPDATE/DELETE | tümü | SELECT (`is_active=true` + aktif mağaza) |
| `homepage_section_types` | SELECT | SELECT | SELECT | tümü (INSERT/UPDATE/DELETE de) | SELECT (picker'ın kendisi gizli değil ama sadece dashboard kullanır) |
| `store_homepage_sections` | SELECT | SELECT/INSERT/UPDATE (silme yok) | SELECT/INSERT/UPDATE/DELETE | tümü | SELECT (`is_active=true` + aktif mağaza) |

**RLS hiçbir şekilde sadece frontend'e güvenmez** (karar 3'ün açık şartı) — her satırda hem DB-seviyesi RLS politikası (yukarıdaki fonksiyonlarla) HEM DE server action seviyesinde `requireStoreEditorAccess`/`requireStoreAdminAccess` (aşağıda §K) ikili katman olarak duruyor; bu, mevcut `requireCustomerAccess`+RLS ikili modelinin (Phase 1'den beri kanıtlanmış) birebir devamı.

---

## J) Admin Page Structure

```
/dashboard/stores                                          (platform-admin, çapraz-müşteri liste)
/dashboard/stores/new                                       (platform-admin, oluşturma formu)
/dashboard/customers/[customerId]/stores                    (o müşterinin mağaza(ları) — bugün 1 tane)
/dashboard/customers/[customerId]/stores/[storeId]           (detay: özet + status + alt modüllere geçiş)
/dashboard/customers/[customerId]/stores/[storeId]/profile
/dashboard/customers/[customerId]/stores/[storeId]/settings
/dashboard/customers/[customerId]/stores/[storeId]/branding
/dashboard/customers/[customerId]/stores/[storeId]/navigation   (sekmeler: Ana / Footer / Kategori)
/dashboard/customers/[customerId]/stores/[storeId]/homepage     (bölüm listesi + "+ Bölüm Ekle" + sürükle-bırak)
```

Her `[storeId]` sayfası önce `storeId`'nin gerçekten `customerId`'ye ait olduğunu doğrular (mevcut `websites/[websiteId]` route'undaki `.eq("id", x).eq("customer_id", y)` çifte-filtre deseni — IDOR koruması, §M'de tekrar ele alınıyor).

---

## K) API/Server Action Sınırları

**Yeni gate fonksiyonları** (`lib/auth/require-store-access.ts`, mevcut `require-customer-access.ts`'in yanına, o dosya DEĞİŞMEDEN):
- `requireStoreAccess(storeId)` — okuma, `is_store_member` eşdeğeri app-katmanı kontrolü + storeId→customerId çözümü.
- `requireStoreEditorAccess(storeId)` — içerik yazma (`store_editor`+).
- `requireStoreAdminAccess(storeId)` — ayarlar/kritik yazma (SADECE `store_admin`+).

Her Server Action (mevcut desende olduğu gibi) kendi başına bu fonksiyonlardan birini çağırır, hangi sayfanın onu render ettiğinden bağımsız.

**Kritik işlem + re-authentication akışı** (karar 3, mevcut `reauthenticateWithPassword` ile): `setMaintenanceModeAction(storeId, true, password)` gibi action'lar, normal Zod validasyonundan SONRA, DB yazımından ÖNCE `reauthenticateWithPassword(user, password)` çağırır; başarısızsa yazım hiç denenmez. Bu deseni SADECE gerçekten kritik olan aksiyonlara uyguluyoruz (Phase 1'in "tüm action'lara değil, en riskli olana" felsefesiyle tutarlı): `maintenance_mode` açma, navigation/homepage öğesi kalıcı SİLME. Rutin içerik düzenlemeleri (metin/renk/sıralama değişikliği) bu sürtünmeyi GEREKTİRMEZ.

**Sıralama (drag & drop) server-action sınırı (karar 4):**
`reorderHomepageSectionsAction(storeId, orderedIds: string[])` — client SADECE yeni sıra listesini (id dizisi) gönderir, `sort_order` DEĞERLERİNİ göndermez. Server:
1. `requireStoreEditorAccess(storeId)`.
2. Gönderilen `orderedIds`'in TAMAMININ bu `storeId`'ye ait, gerçekten var olan section id'leri olduğunu DB'den doğrular (client'ın listeye yabancı bir id sokması veya bir id'yi çıkarması reddedilir).
3. Tek bir transaction içinde, sırayla 10/20/30/... değerlerini YENİDEN HESAPLAR ve yazar — client'ın gönderdiği hiçbir sayısal `sort_order` değeri DOĞRUDAN güvenilmez, sadece SIRA (index) bilgisi kullanılır.
4. `revalidateTag`/`revalidatePath` + `logAuditEvent("homepage_section.reorder")`.

**Public tarafta hiçbir Server Action yok** — §H'de belirtildiği gibi salt okunur.

---

## L) Audit Requirements

Mevcut `logAuditEvent` (değişmeden) her yeni mutation'da çağrılır, yeni action-prefix'ler:
`store.create`, `store.activate`/`store.deactivate`, `store_profile.update`, `store_settings.update`, `store_settings.maintenance_enable`/`maintenance_disable` (re-auth'lu olduğu için ayrı, aranabilir bir action ismi), `store_branding.update`, `navigation_menu.create/update`, `navigation_item.create/update/delete/reorder`, `homepage_section.create/update/delete/activate/deactivate/reorder`, `homepage_section_type.create/update/deactivate` (platform-admin, referans tablo yönetimi).

Re-auth gerektiren işlemlerde `metadata`'ya `{ reauthenticated: true }` eklenir — ileride "bu işlem gerçekten re-auth'lu mu yapıldı" sorgusu audit_logs üzerinden doğrulanabilsin diye.

**Public storefront okumaları audit_logs'a YAZILMAZ** — mevcut kural (`audit_logs`'a anon/authenticated'ın hiç INSERT yetkisi yok, sadece service-role) korunuyor; anonim, sınırsız hacimli okuma trafiğini audit tablosuna yazmak hem anlamsız hem operasyonel risk (tablo şişmesi) olur.

---

## M) Security Threats

1. **IDOR (storeId URL manipülasyonu):** Bir `store_editor` başka bir mağazanın `storeId`'sini URL'ye yazarsa — hem `requireStoreEditorAccess` (app) hem RLS (DB) bağımsız olarak reddeder; mevcut `websites` route'undaki çifte-filtre deseni burada da uygulanır.
2. **Reorder tamperingi:** Client keyfi büyük/negatif `sort_order` değerleri gönderemez — §K'da açıklandığı gibi server sadece SIRAYI kabul eder, değerleri kendisi üretir.
3. **jsonb `config` alanına secret sızdırma:** Bir editörün homepage bölüm config'ine yanlışlıkla bir API key yapıştırması — bu alan PUBLIC anon-okunabilir olduğu için gerçek bir sızıntı riski. Sert bir DB engeli yok (önceki planda da belirtildi); admin UI'da açık bir uyarı ("bu alan herkese açıktır") ÖNERİLİR ama garanti değildir — kabul edilen, belgelenen bir risk.
4. **Yanlış/eksik anon RLS politikası → istenmeyen ifşa:** Platform DB için İLK KEZ anon SELECT politikaları yazılıyor (§I) — bir tabloya yanlışlıkla fazla geniş bir anon politika eklenmesi (ör. `store_settings`'in kendisine, view yerine, anon SELECT verilmesi) `customer_settings`/`order_settings` gibi private alanları sızdırır. Azaltma: `store_settings` tablosunun KENDİSİNE hiçbir zaman anon politika eklenmeyecek, SADECE `store_public_settings` view'ı anon-erişimli olacak — migration yazımında bu ayrım açıkça yorumlanmalı ki gelecekte biri "kolaylık olsun" diye tabloya doğrudan anon SELECT eklemesin.
5. **Re-authentication bypass:** `reauthenticateWithPassword` çağrısı bir action'da unutulursa, o kritik işlem sessizce korumasız kalır — mevcut, bilinen bir kırılganlık sınıfı (Phase 1'de de aynı risk `changeUserRoleAction` için not edilmişti). Azaltma: kod review checklist'ine "maintenance_mode/silme action'ları re-auth çağırıyor mu" maddesi eklenmesi öneriliyor (migration/kod fazında).
6. **Multi-store-per-customer'da rol sızıntısı** (§B'de detaylandırıldı) — bugün gerçekleşmiyor ama gelecekte bir müşterinin 2. mağazası eklendiğinde, mevcut `customer_users`-tabanlı model o müşterinin TÜM mağazalarına erişim verir; gerçek per-store izolasyon için ayrı `store_users` tablosu gerekecek. Bugün risk değil, ileride tasarım borcu.
7. **Public storefront'un `stores.status != 'active'` bir mağazayı sızdırması:** Her public adapter fonksiyonu (§H) `stores.status='active'` kontrolünü RLS politikasının İÇİNDE yapmalı, sadece app-kodu seviyesinde değil — pasif/silinmiş bir mağazanın verisi anon'a asla görünmemeli.

---

## N) Migration Sequence (PLANLANAN, henüz oluşturulmadı)

1. **`0008_store_extension_helpers.sql`** — `is_store_member()`, `is_store_editor_member()`, `is_store_admin_member()`. (0006+0007'ye bağımlı.)
2. **`0009_store_profile_settings.sql`** — `store_profiles` (admin-tier RLS + anon SELECT) + `store_settings` (admin-tier RLS, anon SELECT YOK) + `store_public_settings` view (anon SELECT). (0008'e bağımlı.)
3. **`0010_store_branding_navigation.sql`** — `store_branding` (editor-tier RLS + anon SELECT) + `store_navigation_menus`/`store_navigation_items` (editor-tier update, admin-tier delete, anon SELECT). (0008'e bağımlı.)
4. **`0011_store_homepage_builder.sql`** — `homepage_section_types` (admin-tier, dashboard-only SELECT yeterli) + `store_homepage_sections` (editor-tier update, admin-tier delete, anon SELECT) + 10 bölüm tipi seed. (0008'e bağımlı.)

**Stores admin UI (§B/§J) için YENİ MİGRASYON GEREKMİYOR** — mevcut `stores` tablosunu (0007) ve mevcut RLS'i (platform-admin-only yazma, değişmiyor) kullanıyor, sadece yeni kod. Bu, "gereksiz migration oluşturma" talimatına tam uyum.

**0001-0007'nin hiçbiri değiştirilmiyor, hiçbiri yeniden yazılmıyor.**

---

## O) Gelecekteki Products/Orders/Payments/Shipping Modüllerine Bağlantı

Her gelecekteki tablo aynı 3 katmanlı RLS iskeletini (`is_store_member`/`is_store_editor_member`/`is_store_admin_member`) ve aynı public-view-projeksiyon desenini (hassas alanları tabloda tutup sadece güvenli bir alt kümeyi view/RPC ile açma) tekrar kullanacak. Örnek beklenen roller: `products`/`categories`/`inventory` → editor-tier yazma (bugünkü homepage/navigation gibi içerik); `orders`/`payments`/`shipping`/`returns` → muhtemelen SADECE admin-tier yazma + ekstra re-authentication (finansal/geri dönüşü zor işlemler — bugünkü `maintenance_mode` deseninin doğal devamı, hatta daha sıkı); hepsi `store_id` FK, hepsi `logAuditEvent` ile audit, hepsi tip-başına Zod şeması.

**Public storefront read model (§H)** de doğrudan genişler: `getStoreProducts(storeId)`, `getStoreCategories(storeId)` aynı adapter/cache/tag deseniyle eklenir — bugün kurulan `lib/supabase/public.ts` + tag-tabanlı revalidation altyapısı bir kerelik yatırım, tüm gelecekteki commerce modülleri onun üzerine biner.

**İsim çakışması uyarısı (önceki plandan, hâlâ geçerli):** gelecekteki storefront-"customers" (mağaza alıcıları) tablosu, mevcut Platform DB `customers` (ajans müşterileri, ör. Petra) ile ASLA aynı isme sahip olmamalı — `store_customers` veya `shoppers` önerilir.

---

## P) Değişecek Dosyaların Listesi (SADECE plan — bu turda hiçbir dosya oluşturulmadı/değiştirilmedi)

**Yeni migration dosyaları:** `0008_store_extension_helpers.sql`, `0009_store_profile_settings.sql`, `0010_store_branding_navigation.sql`, `0011_store_homepage_builder.sql`.

**Yeni kod — auth/erişim:**
- `lib/auth/require-store-access.ts` (`requireStoreAccess`/`requireStoreEditorAccess`/`requireStoreAdminAccess`)
- `lib/auth/roles.ts`'e EK export'lar (dosyanın kendisi bozulmadan, `STORE_ADMIN_TIER_ROLES` gibi yeni sabitler eklenir)

**Yeni kod — dashboard (yazma tarafı):**
- `app/dashboard/stores/{page.tsx,new/page.tsx,actions.ts,form-state.ts,store-form.tsx}`
- `app/dashboard/customers/[customerId]/stores/{page.tsx,[storeId]/page.tsx}`
- `app/dashboard/customers/[customerId]/stores/[storeId]/{profile,settings,branding,navigation,homepage}/{page.tsx,actions.ts,form-state.ts,*-form.tsx}`
- `app/dashboard/customers/[customerId]/stores/[storeId]/homepage/section-list.tsx` (sürükle-bırak UI — yeni bir client-side bağımlılık gerekebilir, kodlama fazında değerlendirilecek)

**Yeni kod — public storefront okuma tarafı:**
- `lib/supabase/public.ts` (yeni anon Platform DB istemcisi)
- `lib/commerce/public/{store.ts,profile.ts,settings.ts,branding.ts,navigation.ts,homepage.ts}` (adapter katmanı)
- `lib/commerce/customer-types.ts` (yeni tablo tipleri için, `generate_typescript_types` ile üretilecek)

**Yeni kod — validasyon:**
- `lib/validation/store.ts`, `store-profile.ts`, `store-settings.ts`, `store-branding.ts`, `store-navigation.ts`, `homepage-section.ts` (Zod şemaları)

**Dokunulmayacak dosyalar (açıkça teyit edilmeli):**
- `supabase/platform/migrations/0001-0007` — değişmiyor.
- `supabase/customer-template/**` — değişmiyor, Petra'nın mevcut sistemi bozulmuyor.
- `lib/auth/reauthenticate.ts`, `lib/auth/audit-log.ts`, `lib/auth/require-customer-access.ts`, `lib/auth/roles.ts` (mevcut export'lar), `lib/cms/adapters/**` — hiçbiri değiştirilmiyor, sadece yanına ekleme yapılıyor.

---

## Bu Planda Netleştirdiğim, Onayınızı İstediğim 2 Küçük Nokta

1. **§C/§D/§E sınıflandırması** (Profile+Settings = `store_admin`-only yazma; Branding = `store_editor`+ yazma): kararlarınızdaki "store_admin: store ayarları" / "store_editor: içerik/mağaza içeriği düzenleme" ifadelerinden türettiğim bir yorum — mantıklı buluyorsanız onaylayın, farklı bir ayrım istiyorsanız belirtin.
2. **§B'deki store_users tasarım borcu:** Bugün çözmüyorum (multi-store henüz gerçek değil), ama ileride gerçek per-store membership gerekirse ayrı bir tablo gerekecek — bunu şimdiden kabul ediyor musunuz, yoksa Phase 2'ye dahil edilsin mi?

**KODLAMA YOK. MIGRATION YOK. PRODUCTION DEĞİŞİKLİĞİ YOK — bu son, güncellenmiş plandır, onayınızı bekliyorum.**
