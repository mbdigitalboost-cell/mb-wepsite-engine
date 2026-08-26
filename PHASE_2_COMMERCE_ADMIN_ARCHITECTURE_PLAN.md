# PHASE 2 — Commerce Admin Architecture Planı

**Tarih:** 2026-08-25
**Durum: 📋 SADECE PLAN.** Bu turda hiçbir kod yazılmadı, hiçbir migration dosyası oluşturulmadı, hiçbir migration production'a uygulanmadı, hiçbir mevcut migration dosyasına dokunulmadı, hiçbir RLS politikası bypass edilmedi. Talimatınız gereği: **"ÖNCE PLAN. KODLAMA VE MIGRATION UYGULAMASI YOK."**

**Baseline (bu planın üzerine kurulduğu doğrulanmış production durumu):**
`main` → `30aa416`, production migration geçmişi → `0001–0007` (hepsi doğrulandı), multi-tenant `stores` altyapısı var, RBAC (`super_admin/platform_admin/store_admin/store_editor/store_viewer`) var, RLS var, MFA var, audit log var, Petra ilk (ve şu an tek) `stores` satırı. Taktikalp46 için ayrı bir Supabase projesi açılmayacak.

---

## A) Mevcut Mimari

Sistemde bugün **iki ayrı, birbirinden bağımsız veritabanı katmanı** var — bu ayrım Phase 2 tasarımının merkezinde, bu yüzden en baştan netleştiriyorum:

**1. Platform DB (tek, merkezi Supabase projesi — `wnedgbbyqpvylfiwkwen`)**
İçeriği: `profiles`, `customers` (MB Digital Boost'un müşterisi olan gerçek işletmeler, ör. Petra Mühendislik), `customer_users` (rol ataması — `app_role` enum), `websites` (bir müşterinin CMS/marketing sitesi kaydı + hangi customer-template Supabase projesine bağlandığını gösteren `supabase_connection_key` etiketi), `audit_logs`, ve migration 0007 ile eklenen `stores` (e-ticaret mağazası kök kaydı — bugün sadece Petra için 1 satır, henüz üzerine hiçbir admin UI inşa edilmedi, aşağıda §K'da ayrıca not ediyorum). RBAC + RLS burada yaşıyor. `is_platform_admin()` ve `is_customer_member(customer_id)` SECURITY DEFINER fonksiyonları tüm erişim kontrolünün temeli.

**2. Customer-template DB (müşteri başına AYRI bir Supabase projesi — bugün sadece Petra'nınki gerçek/canlı)**
İçeriği (`supabase/customer-template/migrations/0001-0007`): `site_settings`, `pages`, `hero_sections` + 6 tane liste-tipi içerik tablosu (`services/solutions/projects/campaigns/testimonials/faqs`), `seo_settings`, `tracking_settings` (+ `tracking_public_settings` view — secret olmayan projeksiyon), `media_assets`, `navigation_items` (**düz, tek seviyeli, `label/href/sort_order/status` — ana/footer/kategori ayrımı YOK**), `leads`. Bu projeye dashboard'dan `lib/cms/connection.ts` üzerinden **service-role** anahtarıyla bağlanılıyor — yani bu projenin kendi RLS'i dashboard isteğinin hangi platform kullanıcısından geldiğini hiç bilmiyor; erişim kontrolü tamamen `requireCustomerAccess`/`requireCustomerWriteAccess` (app katmanı) üzerinden. Public tarafta ise `content_status='published'` filtresiyle anon-okunabilir RLS politikaları var (customer-template README'de belgeli, bu planın kapsamı dışında, dokunulmuyor).

**Admin UI mimarisi (mevcut desen):** İki paralel yaklaşım var —
- **Config-driven generic engine** (`lib/cms/dashboard/content-types.ts` + `app/dashboard/customers/[customerId]/content/[type]/...`): 6 liste-tipi içerik türünü TEK bir CRUD motoru servis ediyor — her tür sadece bir config objesi (alanlar, başlık alanı, audit prefix, medya klasörü). Yeni bir "liste tipi" içerik eklemek genelde yeni sayfa yazmak değil, config'e bir satır eklemek demek.
- **Dedicated singleton route'lar**: `hero`, `site_settings`, `seo`, `tracking`, `websites`, `media`, `leads` için ayrı, özel sayfalar (tekil kayıt ya da farklı davranış gerektirdikleri için generic motora uymuyorlar).

Her iki yaklaşım da aynı iskeleti paylaşıyor: `page.tsx` (server component, `requireCustomerAccess` + `loadCustomerConnection`), `actions.ts` (`"use server"`, `requireCustomerWriteAccess` + Zod validasyon + `logAuditEvent` + `revalidatePath`), `form-state.ts`, ve bir form component'i. Bu, Phase 2'nin üzerine inşa edeceği en güçlü mevcut mimari emsal.

**Kritik gözlem (dürüstlükle belirtilmeli):** `store_editor` ile `store_viewer` RLS seviyesinde birbirinden ayrılmıyor — `is_customer_member()` ikisini de "üye" sayıyor, yazma ayrımı SADECE `requireCustomerWriteAccess` app-katmanı kontrolünde var. Bu, Phase 1'den beri bilinen, kabul edilmiş bir mimari sınır; Phase 2 bunu DEĞİŞTİRMİYOR, aynen devralıyor.

---

## B) Önerilen Phase 2 Mimarisi

**En kritik mimari karar burada:** Yeni Store Profile/Settings/Branding/Navigation/Homepage Builder verisi **NEREDE** yaşayacak — Platform DB'de mi, yoksa her müşterinin kendi customer-template projesinde mi?

**Karar: Platform DB, `stores.id`'ye FK'lı yeni tablolar.** (Customer-template projesine YENİ bir şey eklenmiyor.)

Gerekçe:
1. Kullanıcının açık talimatı: "Taktikalp46 için ayrı bir Supabase projesi açılmayacak" ve "TÜM yeni mimari multi-tenant ve store_id tabanlı olmalı." Customer-template modeli (müşteri başına ayrı proje) bu iki ilkeyle taban tabana zıt — her yeni mağaza için yeni bir Supabase projesi kurmak gerekir, ki bu tam olarak yasaklanan şey.
2. Gelecekteki commerce modülleri (products/orders/payments/inventory/...) mantıksal olarak SaaS tipi, merkezi, `store_id` ile ayrışan bir modelde yaşamalı — bunları da müşteri başına ayrı projelere dağıtmak sürdürülemez ve bugünkü kararla çelişir.
3. `stores` tablosu zaten Platform DB'de, "sistemsel tenant/root kayıt" olarak tasarlandı (0007) — yeni modüller onun doğal devamı.

**Bunun getirdiği dürüst bir sonuç (risk olarak da §K'da tekrar ediyorum):** Bu, sistemde **iki paralel "site içeriği" modeli** yaratacak — Petra'nın bugünkü tanıtım sitesi içeriği (hero/services/solutions/...) eskisi gibi customer-template projesinde, ayrı `websites` kaydı üzerinden kalmaya devam edecek; yeni Store Profile/Settings/Branding/Navigation/Homepage Builder ise Platform DB'de, `stores` kaydı üzerinden yaşayacak. Bu bir hata değil, bilinçli bir geçiş noktası — "marketing sitesi" (websites) ile "e-ticaret mağazası" (stores) zaten 0007'de kavramsal olarak ayrıştırılmıştı (bkz. o dosyanın başlık yorumu), Phase 2 bu ayrımı somutlaştırıyor. Ama isim/kavram karışıklığı riski gerçek, aşağıda ele alınıyor.

**Genel prensip:** Her yeni tablo `store_id` taşır (customer_id değil) — çünkü tasarım artık "müşteri" değil "mağaza" merkezli. Bir müşterinin gelecekte birden fazla mağazası olabileceği ihtimali (0007'nin kendi yorumunda zaten belirtilmiş) baştan hesaba katılıyor.

---

## C) Veri Modeli

Aşağıdaki tablolar **henüz yazılmadı** — sütun listesi ve ilişkiler planlanan tasarımdır, migration dosyası olarak oluşturulmadı.

**1. `store_profiles`** (1:1, `store_id` unique FK → `stores.id` on delete cascade)
`display_name text`, `logo_url text`, `favicon_url text`, `phone text`, `email text`, `address text`, `social_links jsonb` (ör. `{instagram, facebook, whatsapp, ...}` — sabit sütunlar yerine jsonb, çünkü sosyal platform listesi zamanla değişir), `business_info jsonb` (vergi no, ticari unvan gibi serbest alanlar — Store Settings'teki vergi DAVRANIŞINDAN farklı, burada sadece görüntülenen bilgi), `created_at`, `updated_at`.

**2. `store_settings`** (1:1, `store_id` unique FK → `stores.id`)
`currency text not null default 'TRY'`, `locale text not null default 'tr-TR'`, `tax_mode text` (check constraint ile sınırlı, ör. `'included'|'excluded'|'disabled'` — Postgres enum DEĞİL, nedeni §K'da), `maintenance_mode boolean not null default false`, `maintenance_message text`, `customer_settings jsonb not null default '{}'` (gelecekteki misafir-checkout vb. commerce-özel ayarlar için genişleyebilir kova — bugün şeması yok), `order_settings jsonb not null default '{}'` (aynı mantık), `general_preferences jsonb not null default '{}'`.

**3. `store_branding`** (1:1, `store_id` unique FK → `stores.id`)
`primary_color text`, `secondary_color text`, `accent_color text`, `button_style text` (check constraint, ör. `'rounded'|'square'|'pill'`), `typography text` (font seçimi — şimdilik serbest text, ileride bir font kataloğuna FK olabilir), `theme_config jsonb not null default '{}'` (yukarıdakilerin kapsamadığı ileri düzey tema tokenları için genişleme alanı).

*(Not: Bu üç tablo aynı 1:1/`store_id` şeklini paylaşıyor — istenirse tek bir `store_config` tablosunda birleştirilebilirdi, ama kullanıcının 3 ayrı modül olarak tanımlaması ve her birinin farklı büyüme hızına sahip olması [özellikle branding'in ileride çok büyümesi muhtemel] nedeniyle ayrı tablolar öneriyorum. Bu bir tercih notudur, kesin bir zorunluluk değil.)*

**4. `store_navigation_menus`**
`id uuid pk`, `store_id uuid not null references stores(id) on delete cascade`, `menu_type text not null` (check constraint: `'main'|'footer'|'category'` — ileride yeni menü tipi eklenebilir diye enum değil check constraint), `created_at`, `updated_at`. `unique (store_id, menu_type)` — bir mağazanın her tipten tek menüsü olur.

**`store_navigation_items`**
`id uuid pk`, `menu_id uuid not null references store_navigation_menus(id) on delete cascade`, `store_id uuid not null references stores(id) on delete cascade` (RLS politikalarını basitleştirmek için `menu_id` üzerinden join yerine doğrudan burada da tutuluyor — kasıtlı denormalizasyon), `parent_item_id uuid references store_navigation_items(id) on delete cascade` (nullable — alt menü/nested item ihtiyacı olursa diye hazır, kullanıcının isteğinde açıkça istenmedi, bugün kullanılmayabilir), `label text not null`, `url text not null`, `sort_order integer not null default 0`, `is_active boolean not null default true`, `created_at`, `updated_at`.

**Önemli isim ayrımı:** Bu, customer-template'teki mevcut `navigation_items` (Petra'nın tanıtım sitesi navigasyonu, düz/tek seviyeli, farklı bir Supabase projesinde) tablosuyla **karıştırılmamalı** — isim çakışması yok (farklı DB'ler) ama kavramsal karışıklık riski var, bkz. §K.

**5. Homepage Builder — iki tablo:**

**`homepage_section_types`** (referans/lookup tablosu — platform admin tarafından yönetilir)
`key text primary key` (ör. `'hero'`, `'campaign_banner'`, `'category_grid'`, `'featured_products'`, `'best_sellers'`, `'brand_section'`, `'promotional_section'`, `'video_section'`, `'trust_section'`, `'footer'`), `label text not null` (admin panelde "+ Bölüm Ekle" listesinde görünen isim), `description text`, `default_config jsonb not null default '{}'`, `is_active boolean not null default true` (bir tip kullanımdan kaldırılabilir), `created_at`, `updated_at`.

**`store_homepage_sections`**
`id uuid pk`, `store_id uuid not null references stores(id) on delete cascade`, `section_type_key text not null references homepage_section_types(key)`, `internal_label text` (admin'in kendi ayırt etmesi için, ör. "Yaz Kampanyası Hero"), `config jsonb not null default '{}'` (bölüme özel içerik — tipi `section_type_key`'e göre değişir, şeması app katmanında Zod ile doğrulanır, DB seviyesinde zorlanmaz), `sort_order integer not null default 0`, `is_active boolean not null default true`, `created_at`, `updated_at`.

Bu tasarım kullanıcının istediği tüm davranışı karşılıyor: oluşturulabilir/düzenlenebilir/silinebilir/aktif-pasif yapılabilir/yeniden sıralanabilir, "+ Bölüm Ekle" mevcut tiplerden seçim yapar. **Dürüstlük notu:** "frontend koduna dokunulmadan" ifadesi, MEVCUT bir `section_type`'ın yeni bir ÖRNEĞİNİ eklemek/düzenlemek/sıralamak için geçerli. Tamamen YENİ bir `section_type` (ör. bugün listede olmayan bir bölüm türü) eklemek, `homepage_section_types`'a yeni bir satır eklemenin yanında, o tipi render edecek bir frontend component'i de gerektirir — migration gerektirmez ama frontend kod değişikliği gerektirir. Bu ayrımı netleştirmek isterim.

---

## D) RLS Modeli

İki yeni SECURITY DEFINER yardımcı fonksiyon gerekiyor (mevcut `is_customer_member()`'ın store_id-tabanlı eşdeğerleri):

- **`is_store_member(p_store_id uuid)`** — `stores.customer_id`'yi çözüp `is_customer_member(customer_id)` mantığını uygular (platform admin her zaman true; store-family bir rol sadece kendi mağazasında true).
- **`is_store_write_member(p_store_id uuid)`** — yukarıdakinin "sadece `store_admin`/`store_editor` (STORE_WRITE_ROLES) + platform admin" versiyonu. **Önemli:** Bu, mevcut `is_customer_member()`'ın YAPAMADIĞI bir şeyi RLS seviyesinde yapacak — `store_admin`/`store_editor` ile `store_viewer`'ı GERÇEKTEN ayıracak. Bugün bu ayrım (§A'da belirtildiği gibi) sadece app katmanında var; Phase 2 bu iyileştirmeyi RLS'e taşıma fırsatı sunuyor (isteğe bağlı — mevcut `requireCustomerWriteAccess` deseniyle aynı seviyede kalmak da tutarlı bir seçim olurdu; ben RLS'e taşımayı ÖNERİYORUM çünkü bu, "her write action mutlaka doğru fonksiyonu çağırmalı" kırılganlığını azaltır).

**Politika şekli — dashboard tarafı** (`store_profiles`, `store_settings`, `store_branding`, `store_navigation_menus`, `store_navigation_items`, `store_homepage_sections` hepsi aynı desen):
- SELECT: `is_store_member(store_id)`
- INSERT/UPDATE: `is_store_write_member(store_id)`
- DELETE: `is_platform_admin()` (mağaza yaşam döngüsüne bağlı kayıtları silmek admin-only kalsın — store_admin en fazla pasifleştirebilir, silemez; bölüm/menü öğesi seviyesinde silme `store_admin`'e açık olabilir, bu bir tercih noktası, aşağıda not ediyorum).

**Kritik, yeni bir RLS yüzeyi — public/anon erişim:** `stores` ve `customer_users` gibi mevcut Platform DB tabloları %100 dashboard-içi (hiçbir zaman anon/public tarafından okunmuyor). Ama Store Profile/Branding/Navigation/Homepage Builder'ın **gerçek amacı** ileride bir mağaza vitrini (storefront) tarafından PUBLIC olarak okunmak. Yani bu tablolara EK olarak, `status='active'` olan mağazalar için **anon-okunabilir** politikalar da gerekiyor:
- `store_homepage_sections`: `is_active=true AND` ilgili `stores.status='active'` için anon SELECT.
- `store_navigation_items`/`menus`: aynı desen.
- `store_profiles`/`store_branding`: vitrin sayfası logo/renk/iletişim bilgisini göstermek için aynı desen.
- `store_settings`: **BURADA DİKKAT** — `order_settings`/`customer_settings` gibi alanlar muhtemelen dashboard-only kalmalı, ama `currency`/`locale`/`maintenance_mode` gibi alanlar vitrinin de bilmesi gerekir. Mevcut kod tabanında TAM OLARAK bu problem için zaten kanıtlanmış bir çözüm var: `tracking_settings` + `tracking_public_settings` view deseni (customer-template 0003). Aynı deseni burada da öneriyorum: `store_settings` tablosunun kendisi anon'a hiç açılmaz, `store_public_settings` diye bir view (`currency, locale, maintenance_mode, maintenance_message` ile sınırlı) anon-okunabilir olur.

Bu, Platform DB için **yeni bir güvenlik yüzeyi** — bugüne kadar hiçbir Platform DB tablosu anon tarafından okunmadı. Bu yüzden test metodolojisi de genişletilmeli: sadece `authenticated` rolüyle değil, gerçek `anon` rolüyle de (`set local role anon;`) rollback-güvenli testler yapılmalı — bu, 0006/0007'de kanıtlanmış metodolojinin doğal bir uzantısı.

---

## E) Admin Panel Ekranları

Mevcut IA (`/dashboard/customers/[customerId]/{websites,content,settings,...}`) ile tutarlı, `stores` iç içe kaynak olarak eklenir:

`/dashboard/customers/[customerId]/stores` — mağaza listesi (bugün hiç yok — bkz. §K, bu aslında Phase 2'nin gizli bir ön koşulu).
`/dashboard/customers/[customerId]/stores/[storeId]/profile` — Store Profile formu.
`/dashboard/customers/[customerId]/stores/[storeId]/settings` — Store Settings formu.
`/dashboard/customers/[customerId]/stores/[storeId]/branding` — renk seçiciler, buton stili, tipografi.
`/dashboard/customers/[customerId]/stores/[storeId]/navigation` — sekmeli (Ana/Footer/Kategori) menü düzenleyici, ekle/sil/yeniden sırala.
`/dashboard/customers/[customerId]/stores/[storeId]/homepage` — bölüm listesi + "+ Bölüm Ekle" seçici (`homepage_section_types`'tan okur) + her bölüm için tipe özel düzenleme formu + aktif/pasif + sıralama.

Her sayfa mevcut iskeleti izler: `page.tsx` (`requireCustomerAccess` + storeId'nin gerçekten bu customerId'ye ait olduğunu doğrulama — `websites` route'unda zaten kullanılan `.eq("id", x).eq("customer_id", y)` çifte-filtre deseninin aynısı), `actions.ts` (`requireCustomerWriteAccess` veya yukarıdaki RLS iyileştirmesi kabul edilirse yeni bir `requireStoreWriteAccess`), Zod validasyonlu form, `logAuditEvent`, `revalidatePath`.

**Sıralama UX'i için tercih notu:** Mevcut desen (content types) sürükle-bırak değil, sayısal `sort_order` alanına elle değer girme. Kullanıcının "yeniden sıralanabilir" isteği sürükle-bırak çağrıştırıyor ama bu yeni bir UI bağımlılığı/karmaşıklık ekler. Öneri: MVP'de mevcut sayısal `sort_order` deseniyle tutarlı kalmak (düşük risk), sürükle-bırağı ayrı, sonraki bir cilalama fazına bırakmak. Kesin karar kullanıcıya bırakılmalı.

---

## F) Homepage Builder Mimarisi

Veri akışı: Admin `store_homepage_sections`'a yazar (`config` jsonb, `section_type_key`'e göre app katmanında Zod şeması ile doğrulanır — mevcut `buildContentFormSchema(type)` desenine birebir benzer, tip-başına şema yaklaşımı zaten kanıtlanmış). `revalidatePath` sonrası, **ileride** inşa edilecek bir public storefront route'u `store_id`'yi (muhtemelen domain/slug üzerinden) çözüp aktif bölümleri `sort_order`'a göre anon-RLS ile çeker, her birini `section_type_key`'e göre bir React component registry'siyle render eder.

**Açık bırakılan/onay gereken nokta:** Kullanıcının Phase 2 talebi "admin panelin bölümleri yönetmesi"ni istiyor, ama gerçek public storefront'un (bu bölümleri gösteren mağaza sitesi) kendisi listelenen 5 modülün içinde yok ve bugün Taktikalp46'nın (ya da başka bir mağazanın) hiçbir public sitesi de yok. Bu planda storefront RENDER tarafını **kapsam dışı ve ayrı bir sonraki faz** olarak varsayıyorum — sadece admin-authoring tarafını tasarladım. Bu varsayımı onaylamanızı rica ederim; yanlışsa F bölümü genişletilmeli.

---

## G) Multi-Tenant İzolasyon

`is_store_member`/`is_store_write_member` her ikisi de `stores.customer_id` üzerinden mevcut, kanıtlanmış `is_customer_member()` mantığına yaslanıyor — yeni bir izolasyon algoritması icat edilmiyor, mevcut olan `store_id` seviyesine taşınıyor. Test metodolojisi 0006/0007'de kurulan standardın AYNISI: gerçek `set local role authenticated`/`anon` + `set_config('request.jwt.claims', ...)` ile `begin;...rollback;` içinde, gerçek kullanıcı id'leriyle (Petra + platform admin), her tablo için: platform_admin → tümünü görür/yazar; Petra store_admin → sadece kendi `store_id`'sine ait satırları görür, başka bir mağaza (test için geçici, rollback'li) satırını GÖREMEZ; store_viewer (geçici rol değişimiyle) → görebilir ama yazamaz (RLS'e taşınırsa burada da reddedilir).

`store_admin` bir mağazanın verisine ASLA başka bir mağazanın verisiyle karışık erişemez — bu, `store_id`'nin her politikada tek başına yeterli filtre olması ve hiçbir politikanın `customer_id`'yi doğrudan client'tan gelen bir parametreden almaması (hep `stores` tablosundan resolve edilmesi) ile garanti edilir.

---

## H) Güvenlik

- **Authentication/RBAC/RLS:** Yukarıda D/G'de detaylandırıldı, mevcut prensiplerin store_id seviyesine taşınması.
- **Server-side validation:** Her `config`/`social_links`/`business_info` jsonb alanı, `section_type_key`/tabloya özel bir Zod şeması ile server action'da doğrulanır — DB seviyesinde jsonb serbest olsa da, yazma yolu her zaman uygulama doğrulamasından geçer (content-types.ts desenindeki `buildContentFormSchema` ile birebir aynı felsefe).
- **Audit logging:** Her mutasyon (`store_profile.update`, `store_settings.update`, `store_branding.update`, `navigation_item.create/update/delete/reorder`, `homepage_section.create/update/delete/activate/deactivate/reorder`) mevcut `logAuditEvent` ile, mevcut `auditPrefix` desenine uygun action isimleriyle kaydedilir.
- **Re-authentication:** Bu modüllerdeki hiçbir işlem (profil/ayar/marka/menü/bölüm düzenleme) MFA re-auth gerektirecek kadar kritik/geri döndürülemez değil — bu yüzden Phase 2'de re-auth EKLEMİYORUM. Eğer ileride "mağazayı sil" veya "mağazayı yayından kaldır" gibi geri döndürülemez bir aksiyon eklenirse, o noktada re-auth değerlendirilmeli.
- **Secret'lar DB/browser'a açık olmamalı:** Bu modüllerin hiçbirinde gerçek bir secret/API key YOK (renk kodu, metin, jsonb config — hepsi zaten "public'e açılması amaçlanan" veri). Tek risk: bir admin `config` jsonb'sine yanlışlıkla bir secret yapıştırırsa (ör. video embed alanına bir API key), bu alan public-anon-okunabilir olduğu için sızar. Bu, teknik bir RLS açığı değil, kullanım hatası riski — hafif bir önlem olarak admin UI'da "bu alanlar herkese açıktır" uyarısı önerilir, ama sert bir DB-seviyesi engel mümkün/gerekli değil.
- **Store isolation ihlali imkansız olmalı:** `store_admin` başka bir mağazanın verisine KESİNLİKLE erişemez — G'de detaylandırıldı.

---

## I) Migration Sırası (PLANLANAN, henüz oluşturulmadı)

Kullanıcının "gereksiz migration oluşturma" talimatına uyarak, tablo başına değil, **mantıksal gruplama** ile 4 migration öneriyorum (7 değil):

1. **`0008_store_extension_helpers.sql`** — `is_store_member()`, `is_store_write_member()` fonksiyonları. (0006 rol yapısına ve 0007 `stores`'a bağımlı.)
2. **`0009_store_profile_settings_branding.sql`** — `store_profiles`, `store_settings` (+ `store_public_settings` view), `store_branding` — üçü de aynı 1:1/RLS şeklini paylaştığı için tek migration'da. (0008'e bağımlı.)
3. **`0010_store_navigation.sql`** — `store_navigation_menus` + `store_navigation_items` (ilişkili, aynı özellik). (0008'e bağımlı.)
4. **`0011_store_homepage_builder.sql`** — `homepage_section_types` (+ 10 bölüm tipinin seed'i) + `store_homepage_sections` (birbirine bağımlı olduğu için aynı migration'da). (0008'e bağımlı.)

Sıra önemli: 0008 önce (diğer üçü onun fonksiyonlarını kullanıyor), 0009/0010/0011 birbirinden bağımsız, istenirse paralel/farklı sırada da uygulanabilir ama net bir sıra için yukarıdaki numaralandırma öneriliyor. **0001-0007'nin hiçbiri değiştirilmiyor.**

---

## J) Gelecekte Commerce Modüllerine Nasıl Bağlanacağı

Her gelecekteki tablo (`products`, `categories`, `inventory`, `orders`, storefront-`customers` [bkz. aşağıdaki isim çakışması uyarısı], `campaigns`, `coupons`, `shipping`, `payments`, `returns`, `analytics`, entegrasyonlar) aynı iskeleti tekrar kullanacak: `store_id` FK, `is_store_member`/`is_store_write_member` ile RLS, gerekiyorsa public-vs-dashboard ayrımı için view deseni, `logAuditEvent` ile audit, tip-başına Zod şeması. Phase 2 aslında bu FUTURE modüllerin hepsi için **şablonu** kuruyor — bu yüzden Phase 2'nin tasarım kalitesi, sonraki tüm commerce fazlarının temelini belirliyor.

**⚠️ Kritik isim çakışması uyarısı (şimdiden, ucuzken belirtilmeli):** Platform DB'de zaten bir `customers` tablosu var (MB Digital Boost'un ajans müşterileri, ör. Petra Mühendislik). Gelecekte eklenecek e-ticaret "müşterileri" (bir mağazadan alışveriş yapan gerçek son kullanıcılar) KESİNLİKLE `customers` adını ALMAMALI — `store_customers` veya `shoppers` gibi net bir isim önerilir. Bu iki kavram (ajans müşterisi vs. mağaza alıcısı) tamamen farklı şeyler ve aynı isimle anılırsa ciddi bir kod/rapor karışıklığı kaynağı olur.

---

## K) Riskler

1. **İki paralel "site içeriği" modeli** (customer-template vs. yeni Platform DB store tabloları) — §B'de açıklandı, bilinçli ama kavramsal karışıklık riski taşıyor. Azaltma: net isimlendirme (`store_*` prefix'i) + dokümantasyon.
2. **İsim benzerliği:** yeni `store_navigation_items` (Platform DB) ile mevcut `navigation_items` (customer-template) — farklı veritabanları, teknik çakışma yok, ama insan hatası/karışıklık riski var.
3. **jsonb `config` alanları şema zorlaması sağlamıyor** — sadece app katmanında Zod ile doğrulanıyor; doğrudan SQL ile (ör. Supabase dashboard'dan) bozuk veri girilebilir. Kabul edilebilir bir esneklik/güvenlik dengesi, ama belgelenmeli.
4. **Platform DB'de İLK KEZ anon-okunabilir RLS politikaları** — bugüne kadar hiçbir Platform DB tablosu public değildi. Bu yeni bir yüzey, çok dikkatli test edilmeli (0006/0007'nin `authenticated` testlerine ek olarak gerçek `anon` rolüyle de).
5. **Public storefront render tarafı henüz tasarlanmadı** — Phase 2 sadece admin-authoring'i kapsıyor, kullanıcı onayı gerekiyor (bkz. §F).
6. **`store_settings`'in bazı alanları public, bazıları private olmalı** — `tracking_public_settings` deseni tekrar kullanılmalı, ama migration yazımında dikkatli ayrım gerektirir; yanlış yapılırsa yanlışlıkla dashboard-only bir alan sızabilir.
7. **Enum yerine text+check constraint kararı** (`tax_mode`, `button_style`, `menu_type`, `section_type_key`) BİLİNÇLİ — 0005/0006'da yaşanan "Postgres enum'a yeni değer eklemek ayrı transaction gerektirir" sorununu tekrar yaşamamak için. Bu, bu projede öğrenilen somut bir derstir.
8. **Bir müşterinin birden fazla mağazası olma ihtimali** (0007'nin kendi yorumunda belirtilmiş) — admin UI ve URL yapısı "bir müşteri = bir mağaza" varsayımı YAPMAMALI; yukarıdaki IA (`stores` listesi + `stores/[storeId]`) zaten bunu destekliyor.
9. **`store_editor`/`store_viewer` RLS ayrımı** — Phase 2'nin yeni `is_store_write_member()` fonksiyonu bu ayrımı RLS'e taşıma FIRSATI sunuyor (öneriyorum), ama taşınmazsa mevcut app-katmanı-only sınırlaması aynen devam eder; bu YENİ bir açık değil, mevcut, bilinen bir sınırın devamı.
10. **Gizli ön koşul — `stores` için hiç admin UI yok:** Bugün `stores` tablosuna INSERT SADECE `is_platform_admin()`'e açık ama bunu yapacak HİÇBİR admin panel ekranı yok (0007 sadece DB temeliydi). Taktikalp46 gibi yeni bir mağaza onboard edilecekse, önce basit bir "Mağaza Oluştur/Listele" ekranı (platform-admin-only, mevcut `websites` CRUD deseniyle birebir aynı) gerekiyor — bu, kullanıcının listelediği 5 modülün içinde açıkça yok ama pratikte hepsinin ön koşulu. Bunu Phase 2'nin kapsamına dahil etmenizi öneririm; onaylarsanız §L'ye eklerim.

---

## L) Dosya Değişiklik Planı (SADECE plan — bu turda hiçbir dosya oluşturulmadı/değiştirilmedi)

**Yeni migration dosyaları (bir sonraki, ayrı onaylı fazda):**
- `supabase/platform/migrations/0008_store_extension_helpers.sql`
- `supabase/platform/migrations/0009_store_profile_settings_branding.sql`
- `supabase/platform/migrations/0010_store_navigation.sql`
- `supabase/platform/migrations/0011_store_homepage_builder.sql`

**Yeni kod dosyaları:**
- `lib/auth/require-store-access.ts` — `requireStoreAccess(storeId)`/`requireStoreWriteAccess(storeId)`, storeId→customerId çözümleyip mevcut `requireCustomerAccess`/`WriteAccess` mantığını (ya da yeni RLS'e taşınırsa doğrudan `is_store_member`'ı) sarmalar.
- `lib/cms/dashboard/store-content-types.ts` (veya mevcut `content-types.ts`'e ek) — homepage section tiplerinin config şeması.
- `lib/validation/store-profile.ts`, `store-settings.ts`, `store-branding.ts`, `store-navigation.ts`, `homepage-section.ts` — Zod şemaları.
- `lib/supabase/types.ts` — yeni tablo tipleri (production'a migration uygulandıktan sonra `generate_typescript_types` ile üretilecek, elle yazılmayacak).
- `app/dashboard/customers/[customerId]/stores/page.tsx` + `actions.ts` (§K madde 10 onaylanırsa) — mağaza listesi/oluşturma.
- `app/dashboard/customers/[customerId]/stores/[storeId]/{profile,settings,branding,navigation,homepage}/{page.tsx,actions.ts,form-state.ts,*-form.tsx}`.

**Dokunulmayacak/etkilenmeyecek dosyalar (açıkça belirtilmeli):**
- `supabase/platform/migrations/0001-0007` — hiçbiri değiştirilmiyor.
- `supabase/customer-template/**` — hiçbiri değiştirilmiyor, Petra'nın mevcut tanıtım sitesi sistemi bu fazda dokunulmuyor.
- `lib/cms/adapters/**`, mevcut `content/[type]` motoru — dokunulmuyor, yeni modüller kendi ayrı yolunda yaşayacak.

---

## Sonraki Adım İçin Karar Bekleyen Sorular

1. **§F:** Public storefront render tarafı bu fazın kapsamı dışında mı kalacak (varsayımım budur), yoksa Phase 2'ye dahil mi edilmeli?
2. **§K madde 10:** `stores` için basit bir liste/oluşturma admin ekranı Phase 2'ye dahil edilsin mi (önerim: evet, çünkü diğer her şeyin ön koşulu)?
3. **§D:** `is_store_write_member()` ile `store_editor`/`store_viewer` ayrımını RLS seviyesine taşımak (önerim) mı, yoksa mevcut app-katmanı-only sınırı aynen korumak mı tercih edilir?
4. **§E:** Homepage Builder sıralaması için MVP'de mevcut sayısal `sort_order` deseni mi, yoksa baştan sürükle-bırak mı hedeflenmeli?

**KODLAMA VE MIGRATION UYGULAMASI YOK — bu rapor sadece plandır, onayınızı bekliyorum.**
