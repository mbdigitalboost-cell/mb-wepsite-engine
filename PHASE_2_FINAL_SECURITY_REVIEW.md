# PHASE 2 — FINAL SECURITY REVIEW (Production Öncesi, Bağımsız İnceleme)

**Bu incelemede hiçbir dosya değiştirilmedi, hiçbir migration oluşturulmadı/uygulanmadı, hiçbir production write yapılmadı, hiçbir git commit/push yapılmadı.** Tüm canlı-veritabanı testleri `begin;...rollback;` içinde, gerçek `authenticated`/`anon` Postgres rolleriyle çalıştırıldı ve sonunda geri alındı (rollback) — production'da kalıcı hiçbir değişiklik yok. Bu, bir önceki implementasyon oturumunun kendi test/rapor iddialarını doğrulamaya çalışan, ondan BAĞIMSIZ bir ikinci geçiş.

**SON KARAR (önce, netlik için): C) DO NOT PROCEED.** Aşağıda CANLI olarak doğrulanmış bir CRITICAL cross-tenant içerik enjeksiyonu (→ stored XSS zinciri) ve kod+resmi Next.js dokümantasyonuyla doğrulanmış bir CRITICAL MFA/AAL2 atlatma bulgusu var. Detaylar ve gerekli düzeltmeler aşağıda.

---

## 0) Mevcut Gerçek Durum Tespiti

1. **Git HEAD / origin/main — DOĞRULANAMADI, önemli bir kısıtlama var.** Bu sandbox'ta HİÇBİR git remote yapılandırılmamış (`git remote -v` boş, `git config --get-regexp remote` eşleşme yok). `git fetch origin` → `fatal: 'origin' does not appear to be a git repository`. Yerel `git log` sadece 3 gerçek commit gösteriyor: `dbb69cd` (Create Next App), `add63d9` (V1 foundation), `4961ec4`/`32f6c18` (aynı ağaç, "Faz 9.1-9.5" — iki farklı commit hash'i, muhtemelen iki ayrı senkronizasyon denemesi). Önceki oturum özetlerinde iddia edilen `30aa416` (Phase 1 sync) commit'i **bu sandbox'ta YOK**. `main` ve ek bir `sync-9.1-9.5` dalı var. **Sonuç: bu ortamdan "origin/main ile senkron mu" sorusu YANITLANAMAZ** — gerçek repo/remote durumu yalnızca sizin VS Code Claude Code oturumunuzdan doğrulanabilir. `git status --porcelain` 215 satır gösteriyor (123 untracked, 92 modified) — bunların büyük çoğunluğu Faz 9.6-13 arası, bu Phase 2 oturumuyla ilgisiz, önceden committed olmayan çalışma. Bu NORMAL olabilir (bulut sandbox'ının kendi git geçmişi sizin asıl deponuzdan farklı/eski bir snapshot olabilir) ama ben bunu bu ortamdan kesin olarak ayırt edemem.
2. **Local migration listesi:** `supabase/platform/migrations/` içinde 0001-0011 (11 dosya), 0008-0011 tarihleri `Aug 25 22:13` (Phase 2 implementasyonu).
3. **Production migration history** (`mcp__Supabase__list_migrations`, proje `wnedgbbyqpvylfiwkwen`): sadece **0001-0007** uygulanmış. **0008-0011 CANLIDA YOK** — canlı DB'de `is_store_member`/`is_store_editor_member`/`is_store_admin_member`/`is_store_publicly_visible` fonksiyonları ve `store_profiles`/`store_settings`/`store_branding`/`store_navigation_*`/`homepage_section_types`/`store_homepage_sections` tabloları **hiçbiri mevcut değil** — canlı `pg_proc` sorgusuyla doğrulandı.
4. **Değişmiş/untracked dosyalar:** yukarıda madde 1'de özetlendi; Phase 2'ye özgü olanlar `git status`'ta `??` (yeni: migrationlar, `lib/commerce/*`, `lib/validation/store*`, `app/dashboard/stores/`, `app/dashboard/customers/[customerId]/stores/`) ve `M` (değişen: `lib/audit/action-labels.ts`, `components/navigation/{dashboard-nav,customer-cms-nav}.tsx`, `lib/supabase/types.ts`) olarak ayırt edilebiliyor — önceki implementasyon raporundaki liste ile eşleşiyor.
5. **Mevcut RBAC rolleri (canlı `app_role` enum):** `admin, customer, super_admin, platform_admin, store_admin, store_editor, store_viewer` (7 değer) — beklenen.
6. **Mevcut stores/customer/customer_users ilişkisi (canlı):** `customers`=1, `stores`=1 (Petra), `customer_users`=2 satır, roller: `platform_admin` (1), `store_admin` (1) — Petra'ya scope'lu. Baseline, önceki rapordakiyle birebir aynı; bu inceleme sırasında **DEĞİŞMEDİ** (tüm testler rollback edildi, aşağıda ayrıca doğrulandı).

---

## 1) AUTHORIZATION / RBAC SECURITY

Her yazma action'ı tek tek okundu (`profile/settings/branding/navigation/homepage` altındaki tüm `actions.ts` dosyaları + `app/dashboard/stores/actions.ts`).

**Genel desen (doğru):** Her action üç bağımsız katman kullanıyor — (a) `requireStoreAccess`/`requireStoreEditorAccess`/`requireStoreAdminAccess` (Server Action authorization gate, `storeId`'den DB'de gerçek `customer_id`'yi çözüp `customer_users`'a bakıyor), (b) RLS policy (aynı üç seviyeyi DB fonksiyonlarıyla ayrıca zorluyor), (c) kritik işlemlerde (`setStoreMaintenanceModeAction`) `reauthenticateWithPassword`. UI'da hiçbir yerde "buton gizleme" tek başına güvenlik sayılmamış — Profile/Settings sayfaları `requireStoreAccess` (store_viewer+) ile render ediliyor, ama submit `requireStoreAdminAccess`'e çarpıyor.

**"Bir store_viewer doğrudan Server Action çağırırsa ne olur?"** — Canlıya karşı test edildi (bkz. §2, TEST batarya): `store_viewer`'a düşürülmüş gerçek bir kimlik, `store_branding` UPDATE'i denedi → **0 satır etkilendi, RLS engelledi.** Server Action seviyesinde de `requireStoreEditorAccess`/`requireStoreAdminAccess` `notFound()` döner (kod okuması ile doğrulandı, `lib/auth/require-store-access.ts`).

**"Bir store_editor doğrudan admin işlemi yapmaya çalışırsa?"** — Test edildi: store_editor rolündeki kimlik `store_profiles`/`store_settings` UPDATE denedi → **0 satır**, `is_store_admin_member` false döndüğü için RLS engelledi.

**"Bir store_admin başka store_id gönderirse?"** — Test edildi (§2): Petra'nın gerçek store_admin'i, ayrı bir müşteriye ait Store C'nin `store_profiles`/`store_branding`/`store_navigation_items`/`store_homepage_sections` satırlarını SELECT/UPDATE/DELETE ile hedefledi → **hepsi 0 satır/0 görünürlük.**

**BULUNAN GERÇEK SORUN (MEDIUM) — Audit log `customerId` doğrulanmıyor.** 15 yazma action'ının TAMAMINDA (`profile/settings/branding/navigation/homepage` altındaki her `actions.ts`) şu desen var:
```ts
const { user } = await requireStoreAdminAccess(storeId); // <-- customerId burada da dönüyor ama alınmıyor
...
await logAuditEvent({ userId: user.id, customerId, ... }); // <-- fonksiyon PARAMETRESİ kullanılıyor, DB'den doğrulanmış değer değil
```
`requireStoreAdminAccess`/`requireStoreEditorAccess`/`requireStoreAccess` zaten `storeId`'den DB'de gerçek `customer_id`'yi çözüp `{ user, isAdmin, customerId }` döndürüyor — ama HİÇBİR Phase 2 action'ı bu dönen `customerId`'yi kullanmıyor, hepsi kendi fonksiyon parametresini (URL/bound-argument'tan gelen) kullanıyor. **İstismar edilebilirlik:** yetkilendirme kararı `storeId` üzerinden (DB'den) veriliyor ve tüm DB yazmaları `store_id`/`itemId` ile scope'lanıyor (customerId parametresi hiçbir WHERE/INSERT'te yetki için kullanılmıyor) — yani bu, **veri erişimi/yazma yetkisini BYPASS ETMİYOR.** Ama tutarsız bir `customerId` (örn. URL'de `/dashboard/customers/<yanlış-id>/stores/<gerçek-storeId>/...` gezinilirse) audit log'a **yanlış müşteri kimliğiyle** yazılır — adli/denetim izinin güvenilirliğini zedeler. Ayrıca `revalidatePath` yanlış path'i geçersiz kılar (zararsız, sadece cache-miss). **Düzeltme önerisi:** her action'da `const { user, customerId } = await requireStore...Access(storeId);` şeklinde DB'den dönen `customerId`'yi kullanın, fonksiyon parametresini audit/log/path için değil sadece URL eşlemesi için tutun (ya da tamamen kaldırın).

---

## 2) CROSS-TENANT ISOLATION

Canlı Platform DB'ye (`wnedgbbyqpvylfiwkwen`) karşı, gerçek `authenticated`/`anon` rolleriyle, tek `begin;...rollback;` bloklarında test edildi (service-role KULLANILMADI — service-role bağlantısı `bypassrls=true` olduğundan RLS testi sayılmaz, bu ilke uygulandı).

**TEST 1 — SELECT izolasyonu (4 tablo):** Petra'nın gerçek `store_admin` kimliği (`63f3ac36...`), tamamen ayrı bir müşteriye (`Test Customer C`) ait aktif "Store C"nin `store_profiles`/`store_branding`/`store_navigation_items`/`store_homepage_sections` satırlarını okumaya çalıştı → **hepsinde 0 satır (PASS).**

**TEST 2 — bilinen ID ile UPDATE/DELETE:** Aynı kimlik, Store C'nin GERÇEK satır ID'lerini doğrudan hedef alarak `store_branding` UPDATE, `store_navigation_items` DELETE, `store_homepage_sections` DELETE denedi → **hepsi 0 satır (PASS).** ID'yi bilmek (tahmin/URL'den görmek) tek başına hiçbir işe yaramıyor — RLS her satırın KENDİ `store_id`'siyle karar veriyor.

**TEST 3 — CONFIRMED CRITICAL VULNERABILITY (canlıya karşı, gerçek insert ile kanıtlandı):**
`store_navigation_items` tablosunun İKİ BAĞIMSIZ FK'si var — `menu_id → store_navigation_menus` ve `store_id → stores` — ve **hiçbir CHECK/trigger `menu_id`'nin sahibi mağazanın `store_id` ile eşleştiğini zorlamıyor.** Hem RLS'in INSERT `WITH CHECK`'i (`is_store_editor_member(store_id)` — sadece YENİ satırın KENDİ `store_id` değerine bakıyor) hem de uygulama kodu (`createNavigationItemAction`, `navigation/actions.ts` satır ~86-98) `menu_id`'nin gerçekten `storeId`'ye ait olup olmadığını **hiç doğrulamıyor.**

Canlıya karşı gerçek test: Petra'nın gerçek kimliği (SADECE kendi mağazasında `store_editor`+, Store C ile SIFIR ilişkisi) şu insert'i yaptı:
```sql
insert into store_navigation_items (menu_id, store_id, label, url, ...)
values ('<Store C''nin GERÇEK ana menü ID''si>', '<Petra''nın KENDİ store_id''si>', 'INJECTED', 'javascript:alert(1)', ...);
```
**SONUÇ: INSERT BAŞARILI OLDU.** Ardından `menu_id = '<Store C'nin menüsü>'` ile sorgulandığında (bu, `lib/commerce/public/navigation.ts`'in `getPublicStoreNavigation()` fonksiyonunun BİREBİR yaptığı sorgu — sadece `menu_id`'ye göre filtreliyor, `store_id`'ye göre DEĞİL) enjekte edilen satır GERÇEKTEN görünüyor:
```json
[
  {"label": "Store C Ana Sayfa", "url": "/", "store_id": "<Store C>"},
  {"label": "INJECTED", "url": "javascript:alert(1)", "store_id": "<Petra>"}
]
```
**Etki:** Herhangi bir mağazanın `store_editor`+'ı (bugün: sadece Petra'nın kendi `store_admin`'i, ama bu Petra'ya özgü değil — mimarinin kendisi), BAŞKA bir mağazanın `menu_id`'sini bilirse (UUID — sıralı değil ama sayfa kaynağı/network sekmesi/gelecekteki bir API ile sızabilir), o mağazanın navigasyonuna **kendi mağazasına ait görünen ama fiilen o başka mağazanın menüsünde render edilecek** rastgele `label`/`url` enjekte edebilir. §4'te (XSS) doğrulandığı gibi `url` alanında `.url()`/şema kısıtlaması YOK — yani bu, **doğrudan store-to-store stored XSS zincirine** açılıyor: Mağaza A'nın editörü, Mağaza B'nin (gelecekteki) public storefront navigasyonuna `javascript:...` linki enjekte edebilir.

**Kök neden:** `store_navigation_items.store_id` kolonu, RLS'i basitleştirmek için BİLİNÇLİ bir denormalizasyon olarak eklenmişti (migration 0010 yorumu bunu açıkça belirtiyor) — ama bu ikinci "gerçek kaynak" (`menu_id` üzerinden dolaylı store vs. doğrudan `store_id` kolonu) arasında tutarlılığı zorlayan HİÇBİR mekanizma yok, ne DB'de ne uygulamada.

**Önerilen düzeltme (kod DEĞİŞTİRİLMEDİ, sadece öneri):**
- **DB seviyesi (0010 henüz production'a uygulanmadığı için dosyanın kendisi düzeltilebilir, ayrı bir migration gerekmez):** `store_navigation_items` üzerinde bir `CHECK`/`BEFORE INSERT OR UPDATE` trigger ekleyin: `NEW.store_id` değeri `(select store_id from store_navigation_menus where id = NEW.menu_id)` ile eşleşmeli, eşleşmezse `RAISE EXCEPTION`. (Alternatif: `store_id` kolonunu kaldırıp her yerde `menu_id` JOIN'i üzerinden scope etmek — ama bu RLS policy'lerinin yeniden yazılmasını gerektirir, daha büyük bir değişiklik.)
- **Uygulama seviyesi (savunma derinliği):** `createNavigationItemAction`, insert öncesi `menuId`'nin gerçekten `storeId`'ye ait olduğunu bir SELECT ile doğrulamalı (`select store_id from store_navigation_menus where id = menuId` → `storeId` ile karşılaştır, eşleşmezse hata döndür).
- **Aynı kök neden `moveNavigationItemAction`'da da var** (menuId, storeId'ye karşı hiç doğrulanmıyor) — ama oradaki gerçek YAZMA hâlâ RLS'in `is_store_editor_member(satırın kendi store_id'si)` kontrolüyle korunuyor; sadece SELECT adımı, çağıran kişinin hedef mağazada AYRICA (farklı bir yoldan) en az `store_viewer` erişimi varsa o mağazanın gerçek iç verisini (item ID'leri, sort_order) sunucu belleğine okuyabilir — bu daha dar bir MEDIUM bulgu, TEST 3'teki gibi canlıda ayrıca doğrulanmadı ama aynı kod deseni (menuId/storeId çapraz kontrolü yok) nedeniyle mantıksal olarak aynı kök nedene bağlı.

**TEST 4 — anon enumeration:** Store B (pasif) için anon hiçbir tabloda görünürlük elde edemedi (önceki oturumda test edildi, bu oturumda tekrar doğrulandı — §0 madde 3'te production'da hâlâ bu tabloların olmadığı teyit edildiği için, aynı 0008-0011 kod tabanı üzerinden tekrar `begin;...rollback;` ile test edildi, TEST 1-3 ile aynı transaction'da).

**Client'tan gelen customer_id/store_id'ye güveniliyor mu?** Genel olarak HAYIR — her action `storeId`'yi DB doğrulaması için kullanıyor (`requireStore*Access` → gerçek `customer_id`'yi DB'den çekiyor), ama TEST 3'ün gösterdiği gibi bu doğrulama SADECE `storeId`→`customer_id` ekseninde var, `menuId`→`store_id` ekseninde YOK.

---

## 3) PUBLIC STOREFRONT SECURITY

`lib/commerce/public/*.ts` (6 dosya) tek tek okundu. Hiçbiri `email`/`phone`/`address` gibi PII'yi GEREKSİZ yere sızdırmıyor — bunlar zaten `store_profiles`'ın KASITLI olarak public tasarlanmış alanları (bir HVAC firmasının iletişim bilgisi zaten vitrine açık olacak veri, karar 8'in "public storefront verisi minimize edilsin" ilkesiyle çelişmiyor — ama bu ayrım kullanıcının onayına bağlı bir tasarım tercihi, burada yeniden sorgulanmadı).

**`getStoreBySlug()` her zaman `null` döner** — `stores` tablosunun kendisinde hiç anon SELECT policy'si yok (0007'den beri), bu KASITLI ve önceki raporda zaten belirtilmiş. Doğrulandı: aktif kod hâlâ bu haliyle duruyor, rastgele genişletilmemiş.

**Hiçbir adapter şunları döndürmüyor** (kod okuması ile doğrulandı): `connection key`, Supabase URL/anon-key, `audit_log` satırları, admin-only alanlar (`customer_settings`/`order_settings`/`general_preferences` — bunlar SADECE `store_settings` tablosunda, `store_public_settings` VIEW'ında YOK), `homepage_section_types` (dashboard-only, anon policy yok).

**`store_settings` tablosunun kendisi anon'a hiç açık değil** — sadece `store_public_settings` view'ı (currency/locale/maintenance_mode/message) açık, kod ve migration ile teyit edildi.

**Minimum public data prensibi:** genel olarak uygulanmış durumda, TEST 3'teki cross-tenant enjeksiyon zafiyeti HARİÇ (o da "public data prensibi ihlali" değil, "yanlış mağazaya ait olmayan veri enjekte edilebiliyor" — farklı bir sorun sınıfı, §2'de raporlandı).

**Dar SELECT/view önerisi (istek üzerine, kod değiştirilmedi):** `stores` tablosuna ileride bir anon policy eklenecekse, SADECE `id, name, slug, status` sütunlarını döndüren dar bir policy veya `store_public_summary` view'ı (customer_id, supabase_connection_key ASLA dahil edilmemeli) önerilir — bu, ayrı bir onay gerektiren bir sonraki adım, bu incelemenin kapsamında UYGULANMADI.

---

## 4) XSS / INJECTION

(Bağımsız bir alt-ajan tarafından derinlemesine incelendi, ben de anahtar bulguları doğruladım.)

- **`store_navigation_items.url`:** `z.string().trim().min(1).max(500)` — **`.url()` YOK, şema allowlist'i YOK.** `javascript:`/`data:` payload'ları şemadan geçiyor (kod ile doğrulandı, `lib/validation/store-navigation.ts` satır 20). §2 TEST 3'te CANLI olarak `javascript:alert(1)`'in DB'ye yazıldığı ve anon-eşdeğeri sorguyla geri okunduğu KANITLANDI. **Severity: MEDIUM tek başına (bugün hiçbir yerde `href` olarak render edilmiyor) → §2 TEST 3 ile birleşince CRITICAL** (cross-tenant + scheme-unrestricted = gerçek stored-XSS zinciri, sadece gelecekteki bir storefront render'ına bağlı).
- **`store_homepage_sections.link_url`, `hero.config.secondaryCtaHref`:** Aynı gap — `.url()` yok, `max(500)` dışında kısıtlama yok. MEDIUM (latent).
- **`imageUrl`/`logoUrl`/`faviconUrl`/sosyal medya linkleri:** `.url()` VAR ama Zod'un `.url()`'ü şema (`javascript:`/`data:`) kısıtlamıyor — `src` bağlamında `javascript:` zaten tarayıcı tarafından çalıştırılmaz ama `data:` her zaman güvenli değildir. LOW/INFO (dar, `src`'de pratik istismar sınırlı).
- **`dangerouslySetInnerHTML`/`innerHTML`:** Phase 2 modülünde SIFIR kullanım (grep ile doğrulandı). Repo genelinde tek kullanım, Phase 2 ile ilgisiz, mevcut `components/seo/json-ld.tsx` (kendi escape mekanizmasıyla).
- **Homepage `config` jsonb:** 9/10 section tipi `z.object({}).strict()` — kapalı şema, ekstra anahtar kabul etmiyor. `hero` tipi 2 sabit alanlı (`secondaryCtaLabel`/`secondaryCtaHref`), action kodunda sadece bu ikisi forma dan okunuyor — arbitrary key enjeksiyonu YOK.
- **Alan uzunluk limitleri:** DB'ye yazılan her string alanda `.max()`/regex/uuid formatı var; istisna yok (persist edilmeyen `password` alanı hariç, ki bu zaten DB'ye yazılmıyor).
- **JSON-LD/templating:** Phase 2 verisinden üretilen hiçbir JSON-LD/template yok (storefront henüz kodlanmadı).

**Genel değerlendirme:** BUGÜN admin panelinin kendisinde çalıştırılabilir bir XSS YOK (her yerde JSX text/`defaultValue`, hiçbiri HTML-parse edilmiyor). Ama DB şeması + public read path'i, ileride bir storefront `<a href={item.url}>` yazdığı anda **anında** istismar edilebilir hale gelecek — ve §2 TEST 3, bunun "varsayımsal" değil, bugün bile cross-tenant olarak DB'ye yazılabilir ve anon path'inden okunabilir olduğunu KANITLADI.

---

## 5) IDOR / DIRECT OBJECT ACCESS

`/dashboard/stores/[id]` ve tüm alt sayfalar (`profile/settings/branding/navigation/homepage`) tek tek incelendi. Her sayfa `require*Access(storeId)` çağrısını İLK satır olarak yapıyor, veri sorgusu ondan SONRA geliyor (kod sırası doğrulandı — hiçbir sayfa yetki kontrolünden önce veri çekmiyor). `storeId`/`itemId`/`sectionId` her zaman URL param'ından geliyor ve DB sorgularında (`update/delete ... where id = X and store_id = storeId`) çapraz kontrol ediliyor — **navigation/homepage'in item/section-seviyeli update/delete/toggle action'ları HEPSİ `itemId` + `storeId`'yi birlikte `.eq()` ile filtreliyor** (kod satır satır okundu, `deleteNavigationItemAction`, `updateNavigationItemAction`, `toggleNavigationItemActiveAction`, homepage eşdeğerleri hepsi bu deseni kullanıyor).

**TEK İSTİSNA — `createNavigationItemAction` (`menuId` parametresi) ve `moveNavigationItemAction`/`moveHomepageSectionAction` (`menuId`/section listesi):** bunlar container-seviyeli bir ID'yi (`menuId`) `storeId`'ye karşı ÇAPRAZ DOĞRULAMIYOR — bu tam olarak §2 TEST 3'ün istismar ettiği boşluk. Bu, IDOR'un klasik bir alt türü: "yetkilendirme doğru obje üzerinde yapılıyor (storeId), ama işlem farklı bir objede (menuId) gerçekleşiyor."

`customer_id`/`store_id` değerlerine genel güven durumu §1/§2'de detaylandırıldı.

---

## 6) AUTH / SESSION

(Bağımsız bir alt-ajan tarafından incelendi, en kritik bulguyu ben de kod + resmi Next.js dokümantasyonuyla ayrıca doğruladım.)

**MFA / AAL2 enforcement — CRITICAL GAP, CANLI KODLA VE RESMİ NEXT.JS DOKÜMANTASYONUYLA DOĞRULANDI.** AAL2 kontrolü repo'da SADECE İKİ yerde var: `app/dashboard/layout.tsx` ve `/mfa-challenge` sayfasının kendisi (`getAalStatus()`/`needsMfaChallenge()` çağrıları, grep ile doğrulandı — başka HİÇBİR yerde yok). `requireSession()` — TÜM Server Action'ların ve `requireStoreAccess`/`requireAdmin`'in dayandığı TEK oturum kontrolü — sadece `getOptionalUser()` çağırıyor, AAL2'ye HİÇ bakmıyor (dosyanın kendi yorumu: "This is the ONLY thing that gates dashboard access"). Bu projenin kendi `node_modules/next/dist/docs/01-app/02-guides/authentication.md`'si (bu tam sürüm için resmi doküman, AGENTS.md'nin talimatı gereği okundu) AÇIKÇA şunu söylüyor: *"A common pattern in SPAs is to return null in a layout... This pattern is not recommended since Next.js applications have multiple entry points, which will not prevent nested route segments and Server Actions from being accessed."* ve *"Treat Server Actions with the same security considerations as public-facing API endpoints."* — yani bir layout'ta yapılan AAL2 kontrolü, Next.js'in KENDİ dokümantasyonuna göre Server Action'ları KORUMAZ. **Sonuç: AAL1'de (MFA tamamlanmamış) kalmış veya çalınmış bir oturum çerezi, `setStoreMaintenanceModeAction` ve `changeUserRoleAction` DIŞINDAKİ (bunlar ayrıca şifre re-auth istiyor) HEMEN HEMEN HER Server Action'ı — Profile/Branding/Navigation/Homepage yazmaları dahil — MFA adımı hiç tamamlanmadan doğrudan çağırabilir.** Bu Phase 2'ye ÖZGÜ değil (mevcut mimarinin genel bir açığı), ama Phase 2'nin 15 yeni yazma action'ının TAMAMI bunu miras alıyor. **Severity: CRITICAL, sistemik.**

**MFA backup/recovery — GAP-FOUND, MEDIUM.** `backup`/`recovery` için grep sonucu boş (tek alakasız eşleşme: şifre sıfırlama e-postası yorumu). `mfa-actions.ts` sadece self-service `unenrollTotpFactor` sunuyor — bu da aktif bir oturum gerektiriyor. Cihazını kaybeden bir kullanıcı için uygulama-içi bir kurtarma yolu YOK (sadece Supabase panelinden manuel admin müdahalesi, script'lenmemiş).

**Reauthentication + rate limiting — GAP-FOUND, MEDIUM.** `reauthenticateWithPassword` çağrı noktaları (grep ile tam liste): `changeUserRoleAction` ve Phase 2'nin `setStoreMaintenanceModeAction`'ı. İkisi de `loginAction`'daki gibi bir `rateLimit()` sarmalayıcısı KULLANMIYOR (login 5/e-posta, 20/IP — 15 dk). Zaten oturum açmış (ama belki çalıntı/paylaşılan) bir oturumun gerçek şifreyi deneme-yanılma ile bulmasına karşı bir üst sınır yok.

**Logout/session invalidation — PASS.** `signOut()` argümansız çağrılıyor, `@supabase/auth-js`'nin varsayılanı `scope: 'global'` — gerçek sunucu taraflı refresh-token iptali (kod okunarak `node_modules/@supabase/auth-js` içinde doğrulandı).

**Open redirect — PASS.** `app/auth/callback/route.ts`, `resolveSafeNextPath()` (`lib/security/safe-redirect.ts`) ile `next` param'ını `/`-başlangıçlı, `//`/`@`/`:`/`\` içermeyen bir yola indirgeniyor, aksi halde `/dashboard`'a düşüyor.

**CSRF / Server Actions — PASS.** Next 16'nın resmi dokümantasyonu (`node_modules/next/dist/docs/01-app/02-guides/server-actions.md`): Origin/Host karşılaştırması varsayılan olarak açık. `next.config.ts`'de `serverActions.allowedOrigins` override'ı yok, `proxy.ts` Origin/Host kontrolüne dokunmuyor — varsayılan koruma zayıflatılmamış.

**Ek pre-existing bulgu (Supabase Advisor, INFO):** "Leaked Password Protection Disabled" — HaveIBeenPwned kontrolü kapalı, Phase 2 ile ilgisiz ama genel Auth sertleştirmesi kapsamında not edilmeli.

---

## 7) AUDIT LOG

Kritik işlemlerin TAMAMI audit ediliyor: `store_profile.update`, `store_settings.update`, `store_settings.maintenance_enable/disable/reauth_failed`, `store_branding.update`, `navigation_item.create/update/delete/reorder`, `navigation_menu.create`, `homepage_section.create/update/delete/activate/deactivate/reorder` — hepsi kod okumasıyla doğrulandı (her action'ın sonunda `logAuditEvent` çağrısı var, hiçbiri atlanmamış). Bakım modu değişikliği hem başarılı hem BAŞARISIZ re-auth denemesinde loglanıyor.

**Audit kaydı alanları yeterli mi?** `actor` (`user_id`), `action`, `entity_type`/`entity_id`, `created_at` (DB default), `customer_id` — hepsi var. **AMA §1'de bulunan `customerId` doğrulanmama sorunu burada da geçerli** — actor/action/timestamp doğru, ama `customer_id` context'i teorik olarak yanlış müşteriye atfedilebilir (MEDIUM, §1'e bakın).

**Secret/PII loglanıyor mu?** Metadata alanları incelendi — sadece `displayName`, `currency`/`locale`/`taxMode`, `maintenanceMode`, `colorMode`/`buttonStyle`, `label`/`url`, `title`/`isActive`, `direction` gibi görüntüleme amaçlı alanlar loglanıyor. **`setStoreMaintenanceModeAction`'ın kendisi `password` alanını ASLA loglamıyor** (kod ile doğrulandı — `logAuditEvent` çağrısına `parsed.data.password` hiç geçmiyor). PII/secret sızıntısı YOK.

---

## 8) DATABASE / RLS

0008-0011 tek tek yeniden okundu (bu kez üretici değil, düşman gözüyle).

- **FK/UNIQUE/CHECK/NOT NULL:** Tüm 7 yeni tablo ve view incelendi — `store_navigation_menus`'un `unique(store_id, menu_type)`'ı, `sort_order >= 0` check'leri, `tax_mode`/`button_style`/`color_mode`/`menu_type` text+check kısıtları (enum yerine, 0005/0006'nın acı verici deneyiminden BİLİNÇLİ kaçınma) hepsi doğru. **TEK gerçek eksik: `store_navigation_items.menu_id` ↔ `store_id` tutarlılığı (§2/§8'de detaylı).**
- **Indexes:** `store_id`/`sort_order`/`section_type_key`/`menu_id` üzerinde index'ler var (0010/0011). `is_active` üzerinde ayrı bir index YOK (bugünkü ölçekte önemsiz, ileride `is_active + store_id` composite index'i düşünülebilir — LOW/performans notu, §15).
- **RLS enabled:** Her yeni tabloda `enable row level security` var, hiçbiri unutulmamış.
- **RLS policies:** Her policy `to authenticated`/`to anon` açıkça belirtmiş (Context7 ile doğrulanan best-practice), fonksiyon çağrıları `(select fn(...))` sarmalı (planner cache). Anon politikaları önceki oturumda bulunup düzeltilen `is_store_publicly_visible()` deseniyle doğru şekilde recursive-RLS'den kaçınıyor.
- **SECURITY DEFINER fonksiyonları:** `is_store_member`/`is_store_editor_member`/`is_store_admin_member`/`is_store_publicly_visible` — hepsi `set search_path = public` ile pinlenmiş (search_path injection riski YOK), hepsi SADECE boolean döndürüyor (veri sızdırmıyor), hiçbiri `auth.uid()` dışında bir kullanıcı kimliği parametresi almıyor (yani "başka bir kullanıcı adına sorgula" tarzı bir privilege escalation YOK).
- **Privilege escalation ihtimali:** Doğrudan bir escalation bulunamadı — SECURITY DEFINER fonksiyonlarının hepsi dar kapsamlı. **Ama** mevcut production'daki `is_platform_admin()`/`is_customer_member()` zaten Supabase Advisor tarafından "anon/authenticated `/rest/v1/rpc/...` üzerinden çağırabilir" diye işaretlenmiş (WARN, mevcut/pre-existing) — 0008 uygulandığında AYNI uyarı `is_store_*` fonksiyonları için de ÜRETİLECEK. Bu BEKLENEN ve ZARARSIZ (fonksiyonlar sadece boolean döndürüyor, `auth.uid()`'i taklit edemezsiniz) — ama migration sonrası Advisor taraması yapan biri bunu "yeni bir açık" sanıp zaman kaybetmesin diye NOT edildi. **Severity: INFO (beklenen, aksiyon gerektirmiyor).**
- **Recursive RLS:** Önceki oturumda bulunan `stores` tablosu sorunu (`is_store_publicly_visible` ile çözülmüş) yeniden test edildi, DOĞRU çalışıyor.
- **Public policy kapsamı:** §3'te detaylandırıldı.
- **0001-0007'ye dokunulmuş mu?** HAYIR — `git diff` / dosya tarihleri (`Aug 15`/`Aug 22-23` vs `Aug 25`) ve içerik incelemesiyle doğrulandı, hiçbiri değişmemiş.

**`set_updated_at()` fonksiyonu (pre-existing, 0001'den beri) — search_path pinlenmemiş.** Supabase Advisor'ın kendi WARN'ı (`function_search_path_mutable`) bunu doğruluyor. Phase 2'nin 6 yeni tablosunun HER BİRİ bu fonksiyonu trigger olarak kullanıyor — yani bu düşük-riskli ama framework-tarafından işaretlenmiş desen artık 6 kat daha fazla yerde tekrarlanıyor. Fonksiyonun kendisi dinamik SQL içermediği için pratik istismar riski düşük, ama 0001-0007'ye dokunulmaması kuralı nedeniyle bu Phase 2 kapsamında düzeltilemez — gelecekteki bir hardening turu için not edildi. **Severity: LOW/INFO.**

---

## 9) INPUT VALIDATION

6 validation dosyası (`lib/validation/store*.ts`, `homepage-section.ts`) tek tek okundu.

- **Client validation'a güven var mı?** HAYIR — her Server Action, form'un `FormData`'sını KENDİ `safeParse()`'ıyla yeniden doğruluyor; client-side hiçbir doğrulama güvenlik sınırı olarak kullanılmıyor (HTML `required`/`maxLength` sadece UX).
- **Server tarafında kesin mi?** Evet, `safeParse` başarısızsa action erken `{ error }` döner, DB'ye hiçbir şey yazılmaz.
- **Eksik/yanlış/çok büyük input:** Zod şemaları `.max()` ile sınırlı (bkz. §4), tip uyuşmazlığında `safeParse` başarısız olur.
- **URL validation:** §4'te detaylandırılan boşluklar HARİÇ (navigation url, homepage linkUrl, hero secondaryCtaHref), diğer her yerde `.url()` var.
- **Unexpected fields / mass assignment:** Her action, `FormData.get(...)` ile SADECE beklenen anahtarları okuyor (spread/`Object.fromEntries` KULLANILMIYOR) — yani formData'ya fazladan bir alan eklense bile hiçbir action bunu DB'ye yazmaz. Homepage `config` şemaları `.strict()` ile ekstra anahtarları reddediyor (9/10 tip). **Mass assignment riski YOK** — her INSERT/UPDATE payload'ı elle, sabit anahtar listesiyle inşa ediliyor.

---

## 10) HOMEPAGE BUILDER

Admin section oluşturabiliyor/düzenleyebiliyor/sıralayabiliyor/aktif-pasif yapabiliyor — hepsi kod + RLS ile doğrulandı. **Başka store'a yazamıyor mu?** EVET, doğru izole — `store_homepage_sections`'ın `section_type_key` FK'si PAYLAŞILAN bir referans tablosuna (`homepage_section_types`) işaret ediyor, navigation'daki gibi "store'a özel bir container" (menu) YOK — yani §2 TEST 3'teki zafiyet SINIFI Homepage Builder'da YOK (tek FK, `store_id`, doğrudan ve tutarlı).

**`sort_order`'a güveniliyor mu?** HAYIR — `createHomepageSectionAction` her zaman `max(sort_order)+10` ile server-side hesaplıyor; `moveHomepageSectionAction` client'tan HİÇBİR sort_order/sıra bilgisi almıyor, sadece bir `sectionId` + yön (`up`/`down`) alıyor, güncel listeyi DB'den okuyup KENDİSİ yeniden hesaplıyor (10/20/30...).

**Race condition var mı?** `moveHomepageSectionAction`'da SELECT-sonra-N-adet-UPDATE deseni transaction'sız (Supabase-js her `.update()` ayrı bir HTTP isteği/implicit transaction) — iki admin AYNI ANDA aynı bölümü taşırsa, bir "lost update" (son yazan kazanır) senaryosu teorik olarak mümkün. Bugünkü tek-mağaza/tek-admin ölçeğinde pratik risk çok düşük, ama çoklu-editörlü bir mağazada nadir bir sıralama tutarsızlığı üretebilir. **Severity: LOW** (veri kaybı değil, en kötü ihtimalle yanlış sıralı bir liste — kendi kendini düzeltir bir sonraki reorder'da).

**Silme doğru yetki istiyor mu?** Evet — `deleteHomepageSectionAction` SADECE `requireStoreAdminAccess` (store_editor GEÇEMİYOR), kod + RLS ile doğrulandı.

---

## 11) NAVIGATION

- **Malicious URL / `javascript:`/`data:`:** §4/§2'de detaylandırıldı — GERÇEK bir boşluk, CRITICAL (cross-tenant ile birleşince).
- **External URL abuse:** Herhangi bir dış URL'e link verilebiliyor (kısıtlama yok) — bu muhtemelen İSTENEN bir esneklik (harici sosyal medya/ortak linkleri), ama şema seviyesinde `http(s):`/relative-path allowlist'i olmaması aynı kökten geliyor.
- **XSS:** §4.
- **Unauthorized delete:** Test edildi (§1/§2), store_editor/viewer silemiyor, cross-tenant silemiyor.
- **Unauthorized reorder:** store_viewer reorder edemiyor (RLS editor-tier zorunlu); cross-tenant reorder'ın gerçek YAZMA kısmı RLS ile engelleniyor ama §2'de detaylandırılan menuId/storeId çapraz-doğrulama eksikliği nedeniyle bir "yanlış yetkilendirme bağlamında veri okuma" riski var (MEDIUM, canlı test edilmedi — aynı kök nedenden mantıksal çıkarım).
- **Cross-store modification:** §2 TEST 3, CONFIRMED CRITICAL.

---

## 12) STORE PROFILE / SETTINGS

- **Store admin sadece kendi store'unu değiştirebiliyor mu?** EVET — canlı test edildi (§2 TEST 1/2), cross-tenant SIFIR erişim.
- **Platform admin her store'u yönetebiliyor mu?** EVET — canlı test edildi (önceki tam RBAC matrisi testinde platform_admin Store B'nin `maintenance_mode`'unu değiştirebildi, bu oturumda tekrar doğrulanmadı ama kod/RLS değişmedi, `is_platform_admin()` her üç fonksiyonda da OR ile bypass ediyor — statik olarak doğrulandı).
- **Store editor kritik settings değiştirebiliyor mu?** HAYIR — canlı test edildi, `store_profiles`/`store_settings` UPDATE'i store_editor için 0 satır.
- **Viewer hiçbir write yapamıyor mu?** EVET, doğru — canlı test edildi, `store_branding` UPDATE'i store_viewer için 0 satır (§1).
- **Maintenance mode gerçekten reauthentication istiyor mu?** EVET — `setStoreMaintenanceModeAction` kod okumasıyla doğrulandı: `reauthenticateWithPassword(user, parsed.data.password)` başarısız olursa DB'ye hiçbir yazma yapılmadan `{ error }` döner VE ayrıca `store_settings.maintenance_reauth_failed` audit kaydı düşer. **Ama** §6'da bulunan rate-limit eksikliği burada da geçerli.

---

## 13) SECRET / DATA LEAK

- `.env.local.example` — tüm değerler BOŞ placeholder, gerçek secret YOK (dosya içeriği tek tek okunarak doğrulandı).
- `.gitignore` → `.env*` hariç tutuluyor, sadece `.env.local.example` tracked (`git ls-files` ile doğrulandı) — gerçek `.env.local` asla commit edilmemiş/edilemez.
- `lib/config/env.ts` → `publicEnv` SADECE `NEXT_PUBLIC_*` (anon key, site URL, GTM/GA4/Meta Pixel ID'leri) döndürüyor — service-role key, connection key DEĞERLERİ asla client'a gitmiyor.
- Phase 2'nin yeni `lib/supabase/public.ts` dosyası SADECE `publicEnv.supabaseUrl`/`supabaseAnonKey` kullanıyor — mevcut desenle tutarlı, yeni bir sızıntı YOK.
- Bu rapor da dahil hiçbir Phase 2 dosyasında/raporunda gerçek bir API key/token/şifre DEĞERİ yazılı değil (grep ile ayrıca taranmadı ama üretim sürecinde hiçbir secret değeri bu oturuma girmedi/çıkmadı — standing kural gereği zaten hiç yazılmadı).

**Sonuç: bu bölümde bulgu YOK (PASS).**

---

## 14) DEPENDENCIES

`package.json`/`package-lock.json` okundu (resolved sürümler doğrulandı):

| Paket | Sürüm | Durum |
|---|---|---|
| `next` | `16.3.0` | **DİKKAT — zamana duyarlı.** Vercel bugün (2026-08-25) iki CRITICAL güvenlik açığını düzelten acil bir `16.3.3`/`15.5.24` güvenlik sürümünü duyurdu ("moved up from Aug 26 to Aug 25 because a newly identified issue prompted us"). CVE detayları henüz tam yayınlanmamıştı. Kurulu `16.3.0` bu düzeltmeyi İÇERMİYOR. **Production migration/deploy'dan ÖNCE `nextjs.org/blog` kontrol edilip `16.3.3`'e (veya sonrasına) güncellenmesi ÖNERİLİR.** Severity: **HIGH (dış, zamana bağlı)** — Phase 2 kodunun kendi hatası değil, ama production'a çıkmadan önce mutlaka kontrol edilmeli.
| `react`/`react-dom` | `19.2.8` | Bilinen kritik CVE bulunamadı. LOW/INFO. |
| `@supabase/supabase-js` | `2.112.3` | Bilinen CVE yok. CVE-2026-31813 sunucu-taraflı Auth/GoTrue servisini etkiliyor, bu client kütüphanesini değil. LOW/INFO. |
| `@supabase/ssr` | `0.12.4` | Bilinen CVE yok. LOW/INFO. |
| `zod` | `4.4.3` | Bilinen CVE yok (ekosistemdeki eski bir zod açığı bu sürümü etkilemiyor). LOW/INFO. |
| `npm audit` | — | **NOT TESTED** — bu incelemede kurulum/çalıştırma erişimi yok (kod değiştirme/paket kurma yasak talimatı gereği). Production migration onayından önce `npm audit --omit=dev` çalıştırılması önerilir. |

---

## 15) PERFORMANCE / RELIABILITY

- **N+1 query:** Bulunamadı — liste sayfaları (`stores`, `customers/[id]/stores`, `navigation`, `homepage`) toplu (`select`/`in()`/`Promise.all`) sorgular kullanıyor, döngü içinde sorgu YOK.
- **Public read path:** `getPublicStoreNavigation` menu_type başına 2 sıralı sorgu yapıyor (menu lookup + items) — 3 menu tipi için toplam 6 sorgu/sayfa yüklemesi. Bugünkü ölçekte (tek mağaza) önemsiz; ileride tek bir JOIN'li sorguya indirilebilir. **LOW, optimizasyon önerisi, aksiyon gerektirmiyor.**
- **Missing indexes:** `is_active` sütunlarında composite index yok (§8) — bugünkü veri hacminde (birkaç satır) etkisiz. **LOW.**
- **Server action bottleneck:** `moveNavigationItemAction`/`moveHomepageSectionAction` her taşımada TÜM listeyi okuyup TÜM satırları tek tek `UPDATE` ediyor (`Promise.all` ile paralel, ama N ayrı HTTP round-trip) — büyük bir menü/homepage'de (bugün değil, gelecekte 50+ öğe) gözle görülür bir gecikme yaratabilir. **LOW/MEDIUM (ölçeğe bağlı), bugün risk yok.**
- **Image handling:** Görsel URL'leri sadece metin olarak saklanıyor (dosya yükleme/optimize etme Phase 2 kapsamında yok) — performans sorunu değil, kapsam dışı.
- **Caching:** `revalidateTag(tag, 'max')` deseni doğru kullanılmış (Next 16 uyumlu, Context7 ile önceki oturumda doğrulanmıştı).

**Genel değerlendirme: production-blocking bir performans sorunu YOK**, yukarıdakiler gelecekteki ölçek için notlar.

---

## 16) TEST METHODOLOGY

Önceki oturumda yaşanan `stale JWT claims` hatası bu incelemede TEKRARLANMADI — her yeni kimlik değişiminde `perform set_config('request.jwt.claims', json_build_object(...)::text, true)` ile AÇIKÇA üzerine yazıldı, anon testlerinde `select set_config('request.jwt.claims', '', true)` ile AÇIKÇA temizlendi. `set local role` her zaman `request.jwt.claims`'ten SONRA ayarlandı. Her testte `reset role;` ile orijinal (superuser/service) role dönüldü, bir SONRAKİ testin identity'sini kirletmediğinden emin olundu.

Bu incelemede kendi test script'imde de bir hata bulunup DÜZELTİLDİ: ilk "cross-menu injection" denemesinde bir geçici tabloya (`test_results`) `authenticated` rolü altındayken yazmaya çalıştım, `permission denied for table test_results` hatası aldım (temp tablo superuser tarafından yaratılmıştı, `authenticated` rolünün ona INSERT izni yoktu) — bu bir GÜVENLİK açığı değildi, sadece kendi test altyapımın bir hatasıydı; `set_config`/`current_setting` ile sonucu bir GUC üzerinden taşıyarak ve DB yazma denemesini `reset role`'den SONRAYA alarak düzeltildi.

**Hiçbir test service-role/`bypassrls` bağlantısıyla yapılmadı** — `mcp__Supabase__execute_sql` bu proje için `service_role` bağlantısını kullanıyor OLABİLİR ama her test AÇIKÇA `set local role authenticated`/`set local role anon` ile gerçek kısıtlı role geçiş yaptı ve RLS'in bu rol altında GERÇEKTEN uygulandığı (0 satır dönmesi, `insufficient_privilege` hataları) ile doğrulandı — yani "PASS" dediğim her yer, GERÇEKTEN kısıtlı bir rol altında test edildi, süper kullanıcı yetkisiyle değil.

**Sınıflandırma:**
| Test | Sonuç |
|---|---|
| Anon → sadece aktif mağaza verisi görür, pasif mağaza tamamen görünmez | PASS |
| Anon → `store_settings` tablosuna, `homepage_section_types`'a hiç erişemez | PASS |
| Anon → INSERT deneyince `insufficient_privilege` | PASS |
| store_viewer → okuyabilir, hiçbir yazma geçmez | PASS |
| store_editor → branding/nav/homepage yazabilir, profile/settings YAZAMAZ | PASS |
| store_admin → kendi mağazasında tam yetki, BAŞKA mağazaya SIFIR erişim (SELECT/UPDATE/DELETE, 4 tablo) | PASS |
| platform_admin → çapraz-mağaza tam yetki | PASS (önceki oturumda test edildi, bu oturumda statik doğrulandı) |
| **Cross-store `menu_id`/`store_id` enjeksiyonu** | **FAIL — CONFIRMED VULNERABILITY** |
| MFA/AAL2 → Server Action'ları koruyor mu | **FAIL — kod + resmi Next.js dokümantasyonuyla doğrulandı** |
| `npm audit` | NOT TESTED (araç erişimi yok) |
| Next.js 16.3.0 spesifik CVE detayları (16.3.3 duyurusu) | NOT TESTED (henüz yayınlanmadı) |
| Race condition (reorder) | NOT TESTED (canlıda concurrent yazma denenmedi, sadece kod analizi) |

---

## 17) FINAL RISK CLASSIFICATION

### CRITICAL

**C1 — Cross-tenant navigation item injection via unvalidated `menu_id`/`store_id` pair (→ stored XSS chain).**
- **Problem:** `store_navigation_items`'ın `menu_id` (container) ve `store_id` (tenant scope) kolonları arasında hiçbir tutarlılık zorlaması yok; ne RLS ne uygulama kodu bunu doğruluyor.
- **Etki:** Herhangi bir mağazanın `store_editor`+'ı, BAŞKA bir mağazanın menüsüne, KENDİ mağazasına ait görünen ama fiilen o mağazada render edilecek keyfi `label`/`url` (dahil `javascript:`/`data:` şemaları) enjekte edebilir.
- **Nerede:** `app/dashboard/customers/[customerId]/stores/[storeId]/navigation/actions.ts` (`createNavigationItemAction`), migration `0010_store_branding_navigation.sql`, `lib/commerce/public/navigation.ts`.
- **Nasıl istismar edilir:** Canlıya karşı CANLI OLARAK KANITLANDI (bkz. §2 TEST 3) — `menuId` = kurban mağazanın gerçek menü ID'si (UUID, sızma yoluyla öğrenilmesi gerekir), `storeId`/`store_id` = saldırganın kendi (meşru) mağazası.
- **Önerilen çözüm:** DB'de `menu_id`'nin sahibi mağaza ile `store_id`'nin eşleştiğini zorlayan bir CHECK/trigger (0010 henüz production'da olmadığı için dosyanın kendisinde düzeltilebilir); uygulama katmanında `createNavigationItemAction`'a açık bir çapraz doğrulama eklenmesi; `url`/`link_url`/`secondaryCtaHref` alanlarına şema allowlist'i (`http:`/`https:`/göreli yol).

**C2 — MFA/AAL2 enforcement Server Actions'ı korumuyor.**
- **Problem:** AAL2 kontrolü sadece `app/dashboard/layout.tsx`'te var; TÜM Server Action'ların dayandığı `requireSession()` AAL2'ye hiç bakmıyor.
- **Etki:** AAL1'de (MFA tamamlanmamış) kalmış/çalınmış bir oturum, şifre-korumalı iki action DIŞINDAKİ HER Server Action'ı (Profile/Branding/Navigation/Homepage yazmaları dahil) doğrudan çağırabilir.
- **Nerede:** `lib/auth/require-session.ts`, `app/dashboard/layout.tsx`, dolaylı olarak TÜM `lib/auth/require-*-access.ts` dosyaları.
- **Nasıl istismar edilir:** Next.js'in kendi resmi dokümantasyonuyla doğrulanan, mimari bir tasarım açığı (canlıya karşı ayrıca test edilmedi çünkü bu bir "kod var mı yok mu" sorunu, session çalma senaryosu gerektirir — ama açık kesin ve dokümante).
- **Önerilen çözüm:** `requireSession()`'a (veya ondan türeyen tüm gate fonksiyonlarına) `getAalStatus()`/`needsMfaChallenge()` kontrolünü ekleyin — MFA kayıtlı bir kullanıcı AAL2'ye ulaşmadan HİÇBİR Server Action çalıştıramamalı.

### HIGH

**H1 — Next.js 16.3.0, aynı gün duyurulan acil güvenlik sürümünün (16.3.3, 2 CRITICAL düzeltme) gerisinde.** Nerede: `package.json`. Çözüm: production migration/deploy öncesi `nextjs.org/blog` kontrolü + güncelleme.

### MEDIUM

**M1 — Audit log `customerId`'si DB-doğrulanmış değil, fonksiyon parametresinden alınıyor** (15 action'ın tamamında sistemik). Veri erişimini etkilemiyor, denetim izni bütünlüğünü etkiliyor.
**M2 — `reauthenticateWithPassword` çağrı noktalarında (`changeUserRoleAction`, `setStoreMaintenanceModeAction`) rate limiting yok** — brute-force riski (yetkilendirilmiş ama şifresiz bir oturum için).
**M3 — MFA backup/recovery mekanizması yok** — cihaz kaybında uygulama-içi kurtarma yolu yok.
**M4 — `moveNavigationItemAction`/`moveHomepageSectionAction`, C1 ile aynı kök nedenden, `menuId`'yi `storeId`'ye karşı doğrulamıyor** — gerçek YAZMA RLS ile korunuyor ama bir bilgi-sızıntısı/tutarsızlık riski taşıyor.
**M5 — `navigation url`/`homepage linkUrl`/`hero secondaryCtaHref` şema kısıtlaması yok** (C1'in bir parçası, ayrıca tek başına da bir gap).

### LOW

**L1 — `updateStoreAction`/`setStoreStatusAction`, uyumsuz `customerId`+`storeId` çiftinde sessizce 0 satır günceller ama "başarılı" döner** (pre-existing kod deseniyle tutarlı, admin-only, dar blast radius).
**L2 — `set_updated_at()` fonksiyonunun `search_path` pinlenmemiş** (pre-existing, 0001'den beri, Phase 2'nin 6 yeni tablosu bunu miras alıyor).
**L3 — Homepage/Navigation reorder'da race condition potansiyeli** (transaction'sız çoklu UPDATE).
**L4 — `is_active` sütunlarında composite index yok** (bugünkü ölçekte önemsiz).
**L5 — Public navigation adapter'ı menu_type başına 2 sıralı sorgu yapıyor** (optimize edilebilir, blocking değil).

### INFO

**I1 — 0008-0011 uygulandığında Supabase Advisor, `is_store_*` fonksiyonları için "anon/authenticated RPC ile çağırabilir" uyarısı ÜRETECEK — bu BEKLENEN ve ZARARSIZ** (mevcut `is_platform_admin`/`is_customer_member` zaten aynı uyarıyı taşıyor).
**I2 — "Leaked Password Protection" kapalı** (pre-existing Auth ayarı).
**I3 — Bu sandbox'ta git remote yapılandırılmamış, gerçek origin/main durumu buradan doğrulanamıyor** (§0).
**I4 — Secret/env sızıntısı YOK** (§13, PASS).
**I5 — `npm audit` çalıştırılamadı, sürüm-bazlı web araması ile sınırlı kaldı** (§14).

---

## 18) SON KARAR

# **C) DO NOT PROCEED**

Production migration (0008-0011) ve git commit/push, aşağıdaki **CRITICAL** bulgular düzeltilip yeniden test edilmeden yapılmamalı:

1. **C1 — cross-tenant navigation injection** (canlıda KANITLANDI): `store_navigation_items`'a `menu_id`↔`store_id` tutarlılık zorlaması (DB CHECK/trigger) ve `createNavigationItemAction`'a çapraz doğrulama eklenmeli; `url`/`link_url`/`secondaryCtaHref` alanlarına şema allowlist'i eklenmeli. Migration 0010 henüz production'a UYGULANMADIĞI için bu, mevcut migration dosyasının kendisinde (yeni bir migration numarası gerekmeden) düzeltilebilir.
2. **C2 — MFA/AAL2, Server Action'ları korumuyor**: bu Phase 2'ye özgü olmasa da, Phase 2'nin 15 yeni yazma action'ının tamamı bunu miras alıyor; `requireSession()` (veya türevleri) AAL2 kontrolü içermeli.

Bu iki düzeltme yapılıp **aynı canlı `begin;...rollback;` metodolojisiyle yeniden doğrulandıktan sonra**, geri kalan MEDIUM/LOW bulgular (özellikle M1/M2/M3) production'ı ENGELLEMEZ ama ayrı bir takip listesi olarak ele alınmalı — bunlardan hiçbiri "DO NOT PROCEED" gerekçesi değil, sadece C1/C2 düzeltildikten sonra "B) SAFE WITH FIXES" eşiğine iner.

**HIGH (H1 — Next.js sürümü)** kod değişikliği değil, bir bağımlılık güncellemesi meselesi; production'a geçmeden hemen önce `nextjs.org/blog`'un kontrol edilmesi ve mümkünse `16.3.3`+'e geçilmesi önerilir — bu C1/C2'den bağımsız, paralel ele alınabilir.

**Bu inceleme boyunca hiçbir dosya değiştirilmedi, hiçbir migration oluşturulmadı/uygulanmadı, production'da hiçbir kalıcı değişiklik yapılmadı (tüm testler rollback edildi) ve hiçbir git işlemi gerçekleştirilmedi.**
