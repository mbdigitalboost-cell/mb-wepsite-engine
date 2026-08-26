# PHASE 2 — Commerce Admin Platform: Implementation Report

Durum: kod + migration + test tamamlandı. **Production'a HİÇBİR migration uygulanmadı, hiçbir git commit/push yapılmadı** — ikisi de talimatınız gereği ayrı onayınızı bekliyor.

---

## A) Değişen / Yeni Dosyalar

**Migrationlar (yeni, 4 dosya, henüz production'da değil):**
`supabase/platform/migrations/0008_store_extension_helpers.sql`, `0009_store_profile_settings.sql`, `0010_store_branding_navigation.sql`, `0011_store_homepage_builder.sql`.

**Auth / yetkilendirme (yeni):** `lib/auth/require-store-access.ts` (requireStoreAccess / requireStoreEditorAccess / requireStoreAdminAccess).
**Auth / yetkilendirme (mevcut dosyaya ek):** `lib/auth/roles.ts` içine `STORE_ADMIN_TIER_ROLES` + `isStoreAdminTierRole` eklendi — mevcut `ADMIN_ROLES`/`STORE_ROLES`/`STORE_WRITE_ROLES` hiç dokunulmadı.

**Public storefront okuma katmanı (yeni):** `lib/supabase/public.ts` (anon istemci), `lib/commerce/cache-tags.ts`, `lib/commerce/public/{store,profile,settings,branding,navigation,homepage}.ts` — 6 dosya, hepsi fail-soft (asla throw etmez, hata → null/[]).

**Validasyon (yeni):** `lib/validation/{store,store-profile,store-settings,store-branding,store-navigation,homepage-section}.ts` — 6 dosya, hepsi Zod v4.

**Audit (mevcut dosyaya ek):** `lib/audit/action-labels.ts` içine Phase 2'nin ~20 yeni action kodu eklendi.

**Navigasyon (mevcut dosyalara ek):** `components/navigation/dashboard-nav.tsx` ve `customer-cms-nav.tsx`'e "Mağazalar" linki eklendi.

**Admin UI (yeni, ~30 dosya):**
- `app/dashboard/stores/{page,actions,form-state}.tsx|.ts`, `app/dashboard/stores/new/{page,store-form}.tsx`
- `app/dashboard/customers/[customerId]/stores/page.tsx`
- `app/dashboard/customers/[customerId]/stores/[storeId]/{page,edit-store-form}.tsx`
- `.../[storeId]/profile/{page,actions,form-state,profile-form}`
- `.../[storeId]/settings/{page,actions,form-state,settings-form,maintenance-form}`
- `.../[storeId]/branding/{page,actions,form-state,branding-form}`
- `.../[storeId]/navigation/{page,actions,form-state,add-item-form,edit-item-form}`
- `.../[storeId]/homepage/{page,actions,form-state,add-section-form,edit-section-form}`

`lib/supabase/types.ts` — Phase 2'nin 7 yeni tablosu + 1 view + 4 yeni text-union tipi eklendi (Row/Insert/Update/Relationships, migration SQL'iyle birebir eşleşecek şekilde elle yazıldı — henüz production'a uygulanmadığı için `generate_typescript_types` ile doğrulanamadı, bkz. Kalan Riskler).

---

## B) Yeni Migrationlar

| # | Dosya | İçerik |
|---|---|---|
| 0008 | store_extension_helpers | 4 SECURITY DEFINER fonksiyon: `is_store_member`, `is_store_editor_member`, `is_store_admin_member`, `is_store_publicly_visible` |
| 0009 | store_profile_settings | `store_profiles`, `store_settings`, `store_public_settings` (view) |
| 0010 | store_branding_navigation | `store_branding`, `store_navigation_menus`, `store_navigation_items` |
| 0011 | store_homepage_builder | `homepage_section_types` (referans, 10 satır seed), `store_homepage_sections` |

Her biri 0001-0007'ye dokunmadan, bağımsız ve rollback-testable yazıldı (madde 1 talimatı). Hiçbiri henüz `apply_migration` ile production'a uygulanmadı — hepsi `begin;...rollback;` içinde canlı şemaya karşı test edildi (bkz. bölüm H).

---

## C) Tablo İlişkileri

```
customers ──< stores ──< store_profiles        (1:1, store_id PK+FK)
                     ├─< store_settings         (1:1, store_id PK+FK)
                     ├─< store_branding         (1:1, store_id PK+FK)
                     ├─< store_navigation_menus (1:N, unique(store_id, menu_type))
                     │      └─< store_navigation_items (1:N, self-referencing parent_item_id)
                     └─< store_homepage_sections (1:N, FK → homepage_section_types.key)

store_settings ──> store_public_settings  (view, security_invoker=false, WHERE stores.status='active')
```

`store_navigation_items.store_id` bilinçli denormalizasyon (RLS'i basitleştirmek için — `menu_id` üzerinden JOIN yerine doğrudan kontrol).

---

## D) RLS Politikaları (özet)

Her tabloda `to authenticated` / `to anon` açıkça belirtildi (Context7 üzerinden doğrulanan Supabase best-practice), fonksiyon çağrıları `(select fn(...))` ile sarmalandı (planner cache).

| Tablo | authenticated SELECT | anon SELECT | INSERT/UPDATE | DELETE |
|---|---|---|---|---|
| store_profiles | is_store_member | is_store_publicly_visible | is_store_admin_member | is_platform_admin |
| store_settings | is_store_member | **yok** (sadece view) | is_store_admin_member | is_platform_admin |
| store_branding | is_store_member | is_store_publicly_visible | is_store_editor_member | is_store_admin_member |
| store_navigation_menus | is_store_member | is_store_publicly_visible | is_store_editor_member | is_store_admin_member |
| store_navigation_items | is_store_member | is_active AND is_store_publicly_visible | is_store_editor_member | is_store_admin_member |
| homepage_section_types | true (dashboard-only) | **yok** | is_platform_admin | is_platform_admin |
| store_homepage_sections | is_store_member | is_active AND is_store_publicly_visible | is_store_editor_member | is_store_admin_member |

**Bulunan ve düzeltilen tasarım hatası:** İlk yazımda anon politikaları `exists(select 1 from stores where id=... and status='active')` şeklindeydi. `stores` tablosunun (0007) KENDİSİNDE hiç anon SELECT politikası olmadığından, bu alt-sorgu recursive RLS nedeniyle anon için HER ZAMAN false dönüyordu — yani ilk tasarımla public storefront hiçbir zaman çalışmazdı. Canlıya karşı gerçek `anon` rolüyle test ederken yakalandı, `is_store_publicly_visible()` (SECURITY DEFINER, sadece boolean döner) eklenerek düzeltildi. Detay: `0008_store_extension_helpers.sql` dosya sonu yorumu.

---

## E) RBAC Matrisi

| Rol | Okuma (store_*) | Branding/Navigation/Homepage yaz | Profile/Settings yaz | Bakım modu | Kalıcı silme (nav/homepage) |
|---|---|---|---|---|---|
| store_viewer | ✅ | ❌ | ❌ | ❌ | ❌ |
| store_editor | ✅ | ✅ | ❌ | ❌ | ❌ (sadece pasifleştirebilir) |
| store_admin | ✅ | ✅ | ✅ | ✅ (re-auth ile) | ✅ |
| platform_admin | ✅ (çapraz-müşteri) | ✅ | ✅ | ✅ (re-auth ile) | ✅ |

Uygulama tarafı (`lib/auth/require-store-access.ts`) ve DB tarafı (migration 0008) birbirinden bağımsız ama aynı kaynaktan (`lib/auth/roles.ts`) beslendiği için asla sapmaz. **UI'da buton gizlemek güvenlik değildir** — örn. Profile/Settings sayfaları store_viewer'a da render edilir, ama submit ettiğinde Server Action `requireStoreAdminAccess` ile `notFound()` döner (mevcut content-modülü konvansiyonunun aynısı).

---

## F) Admin Ekranları

```
/dashboard/stores                                    (platform-admin, çapraz-müşteri liste)
/dashboard/stores/new                                (platform-admin, oluşturma formu)
/dashboard/customers/[customerId]/stores             (o müşterinin mağaza(ları))
/dashboard/customers/[customerId]/stores/[storeId]           (detay + status + alt modül linkleri)
/dashboard/customers/[customerId]/stores/[storeId]/profile
/dashboard/customers/[customerId]/stores/[storeId]/settings   (+ ayrı bakım modu formu, re-auth'lu)
/dashboard/customers/[customerId]/stores/[storeId]/branding
/dashboard/customers/[customerId]/stores/[storeId]/navigation (Ana/Footer/Kategori, ekle/düzenle/pasifleştir/sil/sırala)
/dashboard/customers/[customerId]/stores/[storeId]/homepage   (bölüm ekle/düzenle/pasifleştir/sil/sırala)
```

**Kapsam dışı bırakılan / basitleştirilen kısımlar (dürüstlükle belirtilmeli):**
- **Sürükle-bırak YOK.** Navigation ve Homepage sıralaması "↑/↓" butonlarıyla yapılıyor — her tıklama server'a gidip TÜM listeyi DB'den okuyup gap-based (10/20/30...) yeniden numaralandırıyor (client'a asla güvenmiyor, madde 6/7'nin gerçek şartı bu). Görsel sürükle-bırak, yeni bir client kütüphanesi gerektireceğinden bu fazın kapsamına alınmadı — ileride salt bir UI katmanı olarak eklenebilir, mevcut server action'lar değişmeden kalır.
- **Navigation menüsü silme YOK** (sadece oluşturma) — talep edilen CRUD kapsamı menü öğeleri (item) seviyesinde; menü konteynerları nadiren silinir, bu faz kapsamına alınmadı.

---

## G) Public Storefront Yüzeyi

`lib/commerce/public/*` — 6 fonksiyon, hepsi `createSupabasePublicClient()` (anon key, oturumsuz) kullanıyor, hiçbiri throw etmiyor. `getStoreBySlug()` bugün HER ZAMAN `null` döner çünkü `stores` tablosunun kendisi hâlâ hiç anon SELECT politikasına sahip değil (madde 1'in "storefront'un sadece sözleşmesini tasarla" kararı) — bu, ayrı bir onay gerektiren, bu fazın kapsamına dahil edilmemiş bir sonraki adım. `store_public_settings` (view) `store_settings`'in tek public-safe projeksiyonu; tablo'nun kendisi anon'a hiç açık değil.

---

## H) Audit Kapsamı

`lib/audit/action-labels.ts`'e eklenen ~20 yeni action: `store.create/update/activate/deactivate`, `store_profile.update`, `store_settings.update/maintenance_enable/maintenance_disable/maintenance_reauth_failed`, `store_branding.update`, `navigation_menu.create`, `navigation_item.create/update/delete/reorder`, `homepage_section.create/update/delete/activate/deactivate/reorder`. Bakım modu değişikliği hem başarılı hem BAŞARISIZ re-auth denemesinde loglanıyor (mevcut `user.role_change_reauth_failed` desenine paralel).

---

## I) Test Sonuçları

Tümü canlı Platform DB'ye (`wnedgbbyqpvylfiwkwen`) karşı, tek bir `begin;...rollback;` bloğu içinde, gerçek `authenticated`/`anon` Postgres rolleriyle (service-role DEĞİL) çalıştırıldı; hepsi rollback ile geri alındı.

1. **Şema + kısıt testi:** tüm tablolar/trigger/index/CHECK/FK başarıyla oluşturuldu (uncommitted transaction).
2. **Bulunan ve düzeltilen kritik hata:** ilk anon testi yanlışlıkla PASS verdi — kök neden, önceki bir test adımından sızan `request.jwt.claims` GUC'unun (transaction-scoped, `SET LOCAL ROLE` ile temizlenmiyor) anon rolüne Petra'nın gerçek kimliğini sızdırması. Düzeltme sonrası, `request.jwt.claims`'i açıkça temizleyen (`set_config(..., '', true)`) DÜZELTİLMİŞ bir metodolojiyle yeniden test edildi.
3. **Gerçek anon testi (temiz kimlik):** `store_profiles`/`store_branding`/`store_navigation_items`/`store_homepage_sections`/`store_public_settings` → sadece aktif mağazanın satırı görünüyor (1/1), pasif "Store B" hiçbir tabloda görünmüyor (0), `store_settings` tablosunun kendisi ve `homepage_section_types` anon'a tamamen kapalı (0), anon INSERT reddedildi (`insufficient_privilege`).
4. **Tam RBAC matrisi testi:** platform_admin (çapraz-mağaza okuma+admin-yazma), Petra'nın gerçek store_admin kimliği (kendi mağazasında admin-yazma + ilişkisiz "Store C"ye SIFIR erişim — cross-tenant izolasyon), aynı fiziksel kullanıcı geçici olarak store_editor rolüyle (branding yazabildi, profile/settings admin-only alanlara YAZAMADI), sonra store_viewer'a düşürülmüş hâliyle (okuyabildi, HİÇBİR yazma geçmedi) — hepsi PASS.
   - Bu testte kendi test script'imdeki bir hatayı da yakaladım: rol düşürme UPDATE'i test kullanıcısının KENDİ kimliğiyle çalıştırılmıştı ve `customer_users`'ın kendi RLS'i tarafından sessizce (0 satır) engellenmişti — düzeltme: rol değişikliğini platform_admin kimliğiyle yapıp `GET DIAGNOSTICS`'le satır sayısını doğrulamak.
5. **Sonrası:** production baseline'ın DEĞİŞMEDİĞİ ayrıca doğrulandı (`customers`=1, `stores`=1, `customer_users`=2, Petra hâlâ `store_admin`, yeni tabloların hiçbiri `to_regclass` ile var değil).
6. **`npx tsc --noEmit`:** temiz (0 hata) — homepage actions.ts'teki 2 tip hatası (`Json` cast eksikliği) düzeltildi.
7. **`npm run lint`:** temiz (0 uyarı/hata).
8. **`npm run build`:** başarılı (exit 0), yeni 11 route (`/dashboard/stores*`, `/dashboard/customers/[customerId]/stores*`) derlendi ve listelendi. Build sırasında görülen "Host not in allowlist" mesajları bu sandbox'ın ağ kısıtlamasından kaynaklanıyor (mevcut, ilgisiz `cozumler` sayfalarının build-time Supabase çağrısı) — Phase 2 koduyla ilgisi yok.

---

## J) Güvenlik Değerlendirmesi (özet)

- Her yazma yolu üç katmanlı: Server Action authorization gate (`require-store-access.ts`) + RLS (migration 0008-0011) + (kritik işlemlerde) re-authentication. Hiçbiri tek başına yeterli sayılmadı.
- `store_id`/`customer_id` hiçbir action'da ham client girdisi olarak güvenilmedi — her zaman ya URL param + DB FK doğrulaması, ya da (Stores oluşturmada) gerçek `customers` FK constraint'i.
- `sort_order` her iki modülde (navigation/homepage) da SADECE server tarafında, DB'den okunan güncel listeden yeniden hesaplanıyor.
- Homepage `config` jsonb'si asla arbitrary JSON kabul etmiyor — her section tipinin kendi küçük Zod şeması var (bugün çoğu boş `{}` — henüz ürün/kategori modülü yok).
- `.upsert()` çağrıları (`store_profiles`/`store_settings`/`store_branding`) PostgREST'in varsayılan birincil-anahtar conflict target'ına dayanıyor — bu, RLS testlerinde SQL seviyesinde INSERT+UPDATE olarak ayrı ayrı doğrulandı ama gerçek PostgREST/JS istemcisi üzerinden UÇTAN UCA upsert davranışı canlıda henüz denenmedi (bkz. Kalan Riskler).

---

## K) Kalan Riskler / Sonraki Adımlar

1. **Migrationlar henüz production'da değil.** 0008-0011 uygulanana kadar bu fazın hiçbir admin ekranı gerçekte çalışmaz (tablolar yok). Uygulama için ayrı onayınızı bekliyorum.
2. **Git commit/push yapılmadı** — talimatınız gereği, kodu inceleyip VS Code Claude Code oturumunuza ileteceğim, commit/push oradan sizin onayınızla yapılacak.
3. **`lib/supabase/types.ts` elle yazıldı**, migration uygulandıktan sonra `mcp__Supabase__generate_typescript_types` ile karşılaştırılıp doğrulanmalı (küçük bir tip uyuşmazlığı ihtimaline karşı).
4. **`.upsert()` uçtan uca (PostgREST/JS) test edilmedi** — sadece RLS'in altındaki ham SQL INSERT/UPDATE yolları doğrulandı. Migration uygulandıktan sonra gerçek bir store_admin oturumuyla Profile/Settings/Branding formlarının ilk kayıt + güncelleme senaryosu manuel doğrulanmalı.
5. **Multi-store per customer sınırı** (PHASE_2_FINAL_ARCHITECTURE_PLAN.md §B'de zaten dürüstlükle belgelendi) — bugünkü `customer_users` müşteri seviyesinde rol tutuyor, mağaza seviyesinde değil. Bir müşterinin ileride birden fazla mağazası olursa, bir `store_editor` o müşterinin TÜM mağazalarına erişir; mağaza-özel izolasyon için ayrı bir `store_users` tablosu gerekecek — şimdilik kapsam dışı (talimatınızla uyumlu).
6. **Sürükle-bırak yok** (yukarıda F bölümünde belirtildi) — "↑/↓" butonları server-authoritative aynı sonucu veriyor, ama görsel UX daha basit.
7. **`getStoreBySlug()` her zaman `null` döner** — `stores` tablosuna dar bir anon SELECT politikası (sadece id/name/slug/status) eklenmeden gerçek bir storefront sayfası bu veriyi çekemez; bu ayrı bir RLS değişikliği önerisi, bu raporun onayına dahil değil.
8. **Menü silme UI'ı yok** — yalnızca öğe (item) CRUD'u var.

---

Migrationları uygulamamı ve/veya kodu VS Code oturumunuza iletmemi onaylarsanız devam ederim.
