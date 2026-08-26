# PHASE 2 — CRITICAL SECURITY REMEDIATION PLAN

**Bu belge bir PLANDIR. Bu oturumda hiçbir dosya değiştirilmedi, hiçbir migration oluşturulmadı/uygulanmadı, production'a hiçbir write yapılmadı, hiçbir git commit/push yapılmadı.** Aşağıdaki tüm SQL/kod parçaları YALNIZCA tasarımı somutlaştırmak için örnek/illüstratiftir — hiçbiri repoya yazılmadı.

Bu plan, `PHASE_2_FINAL_SECURITY_REVIEW.md`'de canlı olarak doğrulanmış iki CRITICAL bulguyu (cross-tenant navigation injection + stored-XSS zinciri; MFA/AAL2 Server Action bypass) ve bir HIGH bulguyu (Next.js güvenlik güncellemesi) ele alıyor. Context7 üzerinden Next.js'in kendi resmi dokümantasyonu (Data Access Layer / Server Actions güvenlik kılavuzu), Supabase Auth'un kendi kaynak kodu/dokümantasyonu (AAL2 zorunluluğu deseni) ve PostgreSQL'in resmi dokümantasyonu (multi-column foreign key) bu turda ayrıca doğrulandı; kaynaklar ilgili bölümlerde alıntılanıyor.

---

## 1. Executive Summary

Final Security Review, production migration (0008-0011) ve git commit/push'u **DO NOT PROCEED** kararıyla durdurdu. İki kök neden var:

- **CRITICAL 1:** `store_navigation_items` tablosunda `menu_id` (hangi menüye ait) ile `store_id` (hangi mağazaya ait) arasında DB seviyesinde hiçbir tutarlılık garantisi yok. Bu, canlıda bir INSERT ile kanıtlanmış bir cross-tenant enjeksiyonuna, `url` alanındaki şema kısıtlaması eksikliğiyle birleşince de gerçek bir stored-XSS zincirine izin veriyor.
- **CRITICAL 2:** AAL2 (MFA ikinci faktör) kontrolü sadece `app/dashboard/layout.tsx`'te var; Server Action'ların dayandığı `requireSession()`/`requireStoreAdminAccess()`/`requireAdmin()` bunu hiç kontrol etmiyor — bu da Next.js'in kendi resmi dokümantasyonunun (bu projenin kurulu sürümünün kendi `node_modules` içindeki kopyası) "layout seviyesi kontroller Server Action'ları korumaz" uyarısıyla birebir örtüşen, klasik bir mimari zafiyet sınıfı.
- **HIGH (yardımcı):** Kurulu Next.js `16.3.0`, 25 Ağustos 2026'da yayınlanan ve iki CRITICAL zafiyeti düzelten acil `16.3.3`/`15.5.24` güvenlik sürümünün gerisinde.

Bu plan, her ikisi için **DB + RLS + uygulama** olmak üzere üç bağımsız katmanda (savunma derinliği — "sadece application-level validation OLMAMALI" talimatı gereği) somut, minimum-migration'lı bir çözüm tasarlıyor; ayrıca AAL2 için risk-seviyeli, merkezi bir yetkilendirme mimarisi öneriyor. **Hiçbir kod/migration bu oturumda yazılmadı** — aşağıdakiler uygulanabilir bir tasarım, gerçek dosya değişiklikleri SİZİN onayınızla, SİZİN VS Code Claude Code oturumunuzda yapılmalı.

**SON KARAR (önce, netlik için): SAFE TO IMPLEMENT** — aşağıda tanımlanan üç katmanlı çözüm, mevcut mimariyi yeniden tasarlamadan (yeni bir framework/paradigma değişikliği gerektirmeden), 0010 migration'ı henüz production'a hiç uygulanmadığı için **yeni bir migration numarasına bile ihtiyaç duymadan**, mevcut kod deseniyle (mevcut `require*Access` fonksiyonları, mevcut `rateLimit()` yardımcı fonksiyonu, mevcut `resolveSafeNextPath()` deseni) tutarlı şekilde uygulanabilir durumda. Detaylar ve gerekçe aşağıda.

---

## 2. CRITICAL 1 — Root Cause

**Kusurlu varsayım:** Migration 0010'un kendi yorumu (satır 132-136) şunu söylüyor: *"Uygulama katmanı her INSERT/UPDATE'te `store_id`'nin gerçekten `menu_id`'nin store_id'siyle eşleştiğini doğrular"* — ama bu doğrulama HİÇBİR YERDE gerçekten yazılmamış. `createNavigationItemAction` (`app/dashboard/customers/[customerId]/stores/[storeId]/navigation/actions.ts`), `formData`'dan gelen `label`/`url`'i Zod ile doğruluyor, ama `menuId`'nin (fonksiyon parametresi, sayfa route'undan/`menuId` prop'undan geliyor) gerçekten `storeId`'ye (aynı fonksiyonun diğer parametresi) ait olup olmadığını **hiç sorgulamıyor**. RLS'in `WITH CHECK` ifadesi de sadece `is_store_editor_member(store_id)` — yani YENİ satırın KENDİ `store_id` sütununa bakıyor, `menu_id` üzerinden gerçek sahipliğe hiç bakmıyor.

**Neden bu bir DB tasarım sorunu, sadece bir kod hatası değil:** `store_navigation_items` iki BAĞIMSIZ foreign key taşıyor (`menu_id → store_navigation_menus.id`, `store_id → stores.id`), ve bunlar arasında hiçbir ilişkisel kısıt yok. Bu, "tek bir gerçek kaynağın iki farklı yoldan okunması" (menu üzerinden dolaylı store vs. doğrudan store_id kolonu) durumunda KLASİK bir veri bütünlüğü sorunu — ve veri bütünlüğü sorunları DB seviyesinde çözülmeli, çünkü uygulama kodu (bugünkü gibi) her zaman unutulabilir/eksik yazılabilir, ama bir DB constraint asla "unutulmaz."

**Zincirleme etki:** `url` alanının şema kısıtlaması olmaması (`z.string().trim().min(1).max(500)` — `.url()` bile yok) bu enjeksiyonu, sadece "yanlış mağazada görünen bir link" olmaktan çıkarıp gerçek bir stored-XSS taşıyıcısına dönüştürüyor.

---

## 3. CRITICAL 1 — Remediation (genel bakış)

Üç bağımsız katman, HER BİRİ tek başına yeterli olacak şekilde tasarlanıyor (savunma derinliği — biri atlanırsa/bug içerse bile diğer ikisi hâlâ korur):

| Katman | Ne yapıyor | Neden tek başına yeterli değil ama gerekli |
|---|---|---|
| **A) Database Integrity** (composite FK) | `menu_id`↔`store_id` tutarlılığını Postgres'in kendisi, hiçbir kod çalışmadan zorlar | En güçlü katman ama sadece bu tabloyu korur — RLS/app katmanı olmadan cross-tenant SELECT/UPDATE/DELETE'i (farklı bir vektörle) engellemez |
| **B) RLS** | INSERT/UPDATE/DELETE'in her birinde gerçek Postgres rolü altında yetkiyi zorlar | DB constraint'in kapsamadığı (rol bazlı erişim) boşluğu kapatır — ama tek başına bırakılsa mevcut haliyle zaten "her şey store_id'ye göre doğru" görünüyordu, asıl kusur menu_id çaprazlamasıydı |
| **C) URL Security** | `url`/`link_url` alanlarının payload taşıyıcısı olmasını engeller | A+B mükemmel çalışsa bile (cross-tenant enjeksiyon tamamen imkansız olsa bile) HER TEK mağazanın KENDİ editörü hâlâ kendi mağazasına `javascript:` linki girebilir — bu ayrı bir zafiyet sınıfı, A/B onu kapatmaz |
| **D) Public Storefront** | Anon'un SADECE published+active+kendi-store verisini görmesini garanti eder | A+B+C DB'ye kötü veri girmesini engellese bile, "public response'un doğru satırları döndürdüğü" ayrı bir garanti — bugünkü `getPublicStoreNavigation()`'ın `menu_id`-only filtrelemesi budur |

---

## 4. CRITICAL 1 — Database Integrity

**Context7 ile doğrulanan resmi PostgreSQL dokümantasyonu** (`postgresql.org/docs/current/ddl-constraints.html`, bu turda sorgulandı):

> "A foreign key constraint ensures that values in a referencing table's column (or **group of columns**) match valid rows in a referenced table... Foreign keys can also span multiple columns, provided the number and data types of the constrained columns match the referenced columns." Ve: "A foreign key must reference columns that form a **primary key, unique constraint, or non-partial unique index**."

Bu, tam olarak ihtiyacımız olan resmi, standart mekanizma: **composite (çok-kolonlu) foreign key** — trigger/CHECK yerine, Postgres'in KENDİ ilişkisel bütünlük motoruna dayanan, endüstri-standardı bir çözüm.

**Tasarım (illüstratif SQL — repoya yazılmadı):**

```sql
-- 1) store_navigation_menus'a, PK'sine (id) EK olarak (id, store_id) üzerinde
--    bir composite UNIQUE constraint ekle. `id` zaten tek başına unique
--    olduğu için bu "gereksiz" görünebilir ama Postgres'in FK kuralı
--    gereği (yukarıdaki alıntı), referans alınan kolon grubu unique/PK
--    olmalı — (id, store_id) çifti üzerinde ayrı bir unique constraint
--    olmadan store_id'yi de referans alan bir composite FK YAZILAMAZ.
alter table public.store_navigation_menus
  add constraint store_navigation_menus_id_store_id_key unique (id, store_id);

-- 2) store_navigation_items'ın MEVCUT tekil `menu_id` FK'sini KALDIRIP
--    yerine (menu_id, store_id) çiftini store_navigation_menus(id, store_id)'ye
--    referans veren bir composite FK koy. Artık Postgres'in kendisi,
--    "bu item'ın store_id'si, bağlı olduğu menünün store_id'siyle
--    eşleşmiyorsa INSERT/UPDATE'i REDDET" kuralını uygular — hiçbir
--    uygulama kodu çalışmasa BİLE.
alter table public.store_navigation_items
  drop constraint store_navigation_items_menu_id_fkey; -- (gerçek constraint adı 0010'da doğrulanmalı)

alter table public.store_navigation_items
  add constraint store_navigation_items_menu_store_fkey
  foreign key (menu_id, store_id)
  references public.store_navigation_menus (id, store_id)
  on delete cascade;
```

**Neden bu, trigger'dan daha iyi:** (a) hiçbir PL/pgSQL kodu yok, bu yüzden search_path/SECURITY DEFINER gibi ek bir saldırı yüzeyi yaratmıyor; (b) Postgres planner'ı FK'leri sorgu optimizasyonunda kullanabiliyor (trigger'lar kullanamaz); (c) `pg_dump`/şema-karşılaştırma araçlarında standart, tanınabilir bir yapı; (d) "neden bu satır reddedildi" hatası Postgres'in kendi standart FK ihlali mesajıyla gelir, özel bir `RAISE EXCEPTION` metni bakımı gerekmez.

**Mevcut tablolara etkisi:** `store_navigation_menus.id` zaten PRIMARY KEY (dolayısıyla zaten unique + indexed) — `(id, store_id)` üzerine EK bir unique index, PK indexinin üstüne ikinci bir index daha demek (küçük ek disk/yazma maliyeti, bu ölçekte önemsiz). `store_navigation_items` üzerindeki mevcut ayrı `menu_id_idx`/`store_id_idx` indexleri KALIR — composite FK için ayrıca bir composite index ZORUNLU değil (Postgres referans EDEN taraf için otomatik index istemez, sadece referans ALINAN tarafta unique/PK ister — yukarıdaki alıntı) ama sorgu deseninize göre `(menu_id, store_id)` üzerinde bir composite index performans için düşünülebilir (LOW öncelik, mevcut ayrı index'ler zaten yeterli).

**Migration numarası kararı (§11'de detaylı):** 0010 HENÜZ production'a UYGULANMADIĞI için (Final Review §0 madde 3 ile doğrulandı), bu düzeltme **0010'un dosyasının kendisinde**, `store_navigation_items` tablosunun orijinal `create table`/FK tanımı DÜZELTİLEREK yapılabilir — ayrı bir 0012 "yama" migration'ına gerek YOK. Bu, "0001-0007'ye dokunma" kuralının aynısı 0008-0011 için de düşünülürse bile ihlal edilmiyor, çünkü 0010 zaten "henüz hiç uygulanmamış, hâlâ taslak" durumda.

---

## 5. CRITICAL 1 — RLS

Composite FK, `menu_id`/`store_id` VERİ tutarlılığını garanti ediyor — ama RLS hâlâ "bu kullanıcı bu store_id'de yazma yetkisine sahip mi" sorusunu cevaplamalı, ayrıca 0010'un mevcut policy'leri değişmeden de KALABİLİR (composite FK, mevcut `WITH CHECK ((select is_store_editor_member(store_id)))` politikasının ÜSTÜNE ek bir garanti katıyor, onun yerine geçmiyor). Yine de üç senaryo net şekilde doğrulanmalı:

**INSERT — attacker kendi store_id'sini, başka store'un menu_id'sini gönderirse:**
Composite FK bunu artık DB seviyesinde reddeder (`insert or update on table "store_navigation_items" violates foreign key constraint` hatası) — RLS'in `WITH CHECK`'i hâlâ çalışır ama asıl reddeden artık FK. **Değişiklik gerekmiyor**, mevcut `store_navigation_items_insert_editor_tier` policy'si aynen kalabilir.

**UPDATE — `menu_id`/`store_id`'yi değiştirerek cross-tenant injection:**
Bugünkü `store_navigation_items_update_editor_tier` policy'si `using(...)` VE `with check(...)` ikisinde de `is_store_editor_member(store_id)` kontrol ediyor — yani bir satırı güncellerken YENİ `store_id` değeri de kontrol ediliyor. Composite FK ile birlikte: bir editör kendi satırının `menu_id`'sini başka mağazanın menüsüne çevirmeye çalışırsa, ya (a) `store_id`'yi de o mağazaya çevirmesi gerekir (ki bu durumda RLS `with check` onu zaten reddeder, çünkü yeni store_id'de editör değildir) ya da (b) `store_id`'yi eski haliyle bırakır (bu durumda composite FK reddeder, çünkü menu_id'nin store_id'si eşleşmez). **Her iki yol da kapalı** — ek bir policy değişikliği gerekmiyor, composite FK + mevcut `with check` birlikte yeterli.

**DELETE — aynı kontrol:**
Mevcut `store_navigation_items_delete_admin_tier` zaten satırın KENDİ `store_id`'sine göre `is_store_admin_member(store_id)` kontrolü yapıyor — DELETE'te `menu_id`/`store_id` çaprazlaması diye bir risk yok (silme, var olan bir satırı hedefliyor, yeni bir çapraz referans yaratmıyor). **Değişiklik gerekmiyor.**

**Ek savunma-derinliği önerisi (opsiyonel, LOW öncelik):** `createNavigationItemAction`'a, composite FK'ye ek olarak, INSERT öncesi açık bir uygulama-seviyesi kontrol eklenmesi önerilir (`select store_id from store_navigation_menus where id = menuId` → `storeId` ile karşılaştır) — bu, composite FK zaten varken TEKNİK olarak gereksiz ama (a) kullanıcıya "yanlış menü seçtiniz" gibi anlamlı bir hata mesajı döndürmeyi sağlar (FK ihlali ham bir Postgres hatası döner, UX için kötü), (b) gelecekte biri composite FK'yi yanlışlıkla kaldırırsa ikinci bir güvenlik ağı olur.

**RLS test senaryoları için gerçek kimlik/rol eşlemesi** (bkz. §12 Test Planı TEST 1-4): tüm testler gerçek `authenticated` Postgres rolü + gerçek Petra store_admin/editor kimliği + ayrı bir ikinci test tenant'ı (Store C) ile, `begin;...rollback;` içinde, `set_config('request.jwt.claims', ...)` her kimlik değişiminde AÇIKÇA üzerine yazılarak/temizlenerek yürütülmeli — Final Review'daki AYNI, kanıtlanmış metodoloji.

---

## 6. CRITICAL 1 — URL Security

**Sadece regex'e güvenme talimatına uygun olarak:** öneri TEK bir regex değil, üç aşamalı bir işlem hattı.

**Adım 1 — Normalize.** Ham girdi `trim()` edilir, sonra `decodeURIComponent()` ile (mümkünse, hata verirse reddedilir — kötü niyetli çift-encode genelde decode hatası üretir) YÜZDE-encode edilmiş varyantlar (`%6a%61%76%61%73%63%72%69%70%74:` gibi) açığa çıkarılır, sonra `toLowerCase()` (şema karşılaştırması case-insensitive olmalı — `JaVaScRiPt:` gibi varyantlar).

**Adım 2 — Kontrol karakteri reddi.** Normalize edilmiş string `\r`, `\n`, `\t`, veya herhangi bir C0 kontrol karakteri (U+0000–U+001F) içeriyorsa DOĞRUDAN reddedilir — bu, CRLF/header-injection ihtimaline karşı (bugün hiçbir kod bu URL'den ham bir HTTP header/redirect üretmiyor, ama ileride biri `Location:` header'ı bu değerden kurarsa diye önleyici).

**Adım 3 — Allowlist (blocklist DEĞİL).** Kullanıcının talimatı doğru: "sadece regex'e güvenme" ayrıca "sadece blocklist yapma" anlamına da gelmeli — yeni bir tehlikeli şema (`intent:`, `market:`, gelecekte icat edilecek bir tarayıcı özel şeması) blocklist'te unutulabilir. Bunun yerine SADECE şunlara izin ver:

```ts
// İllüstratif — repoya yazılmadı. Mevcut lib/security/safe-redirect.ts'in
// resolveSafeNextPath() ile AYNI "//","@",":" ,"\\" savunmasını yeniden
// kullanır (yeni bir regex icat etmek yerine — kanıtlanmış deseni tekrar
// kullanmak, subtly-farklı bir bypass riskini azaltır).
const RELATIVE_PATH_RE = /^\/(?!\/|\\|@)[a-zA-Z0-9\-._~!$&'()*+,;=:@%/]*$/;
const HTTPS_URL_RE = /^https:\/\/[a-zA-Z0-9.-]+(:\d+)?(\/[^\s]*)?$/;
// Unicode U+0000-U+001F (C0 control block), built via String.fromCharCode to
// avoid embedding raw control bytes in this source file.
const CONTROL_CHAR_RE = new RegExp(`[${String.fromCharCode(0)}-${String.fromCharCode(31)}]`);

function isSafeNavigationUrl(raw: string): boolean {
  let normalized: string;
  try {
    normalized = decodeURIComponent(raw.trim());
  } catch {
    return false; // malformed encoding -> reddet
  }
  if (CONTROL_CHAR_RE.test(normalized)) return false; // kontrol karakteri (U+0000-U+001F)
  const lower = normalized.toLowerCase();
  if (RELATIVE_PATH_RE.test(normalized)) return true;         // "/urunler", "/kategori/x"
  if (HTTPS_URL_RE.test(normalized) && lower.startsWith("https://")) return true; // güvenilir external
  return false; // her şey reddedilir: javascript:, data:, vbscript:, file:,
                // about:, blob:, mailto: (ayrı, bilinçli bir karar
                // gerektirir), http:// (TLS zorunluluğu), vb.
}
```

**Açıkça engellenmesi gereken örnekler (test senaryolarında kullanılacak, §12):**
`javascript:alert(1)`, `JaVaScRiPt:alert(1)`, `javascript://%0Aalert(1)`, `data:text/html,<script>alert(1)</script>`, `vbscript:msgbox(1)`, `file:///etc/passwd`, `about:blank`, `blob:https://evil.com/uuid`, `//evil.com` (protocol-relative — tarayıcı bunu `https://evil.com` gibi işler), `/\evil.com` (backslash trick — bazı tarayıcılar bunu `\` yi `/` gibi normalize eder), ` javascript:alert(1)` (baştaki boşlukla filtre atlatma — `trim()` bunu zaten yakalıyor), `java\tscript:alert(1)` (aradaki tab karakteriyle blocklist regex'ini şaşırtma — kontrol karakteri reddi bunu Adım 2'de yakalıyor).

**Hangi katmanda yapılmalı?**
- **Client validation:** Sadece UX (anlık geri bildirim) — GÜVENLİK SINIRI DEĞİL, mevcut projenin genel ilkesiyle tutarlı.
- **Server validation (Zod, `lib/validation/store-navigation.ts` + `homepage-section.ts`):** **ASIL/BİRİNCİL katman.** `.refine(isSafeNavigationUrl, "Geçersiz veya güvensiz URL.")` ile mevcut `.max(500)`'e eklenir. Hata mesajları burada en anlamlı şekilde üretilebilir, ve regex/allowlist mantığının gelecekte genişletilmesi (yeni bir izin verilen path deseni eklemek gibi) sadece bu dosyayı değiştirmeyi gerektirir — migration gerekmez.
- **Database CHECK constraint:** **İKİNCİL/backstop katman, önerilir ama dar kapsamlı.** PostgreSQL CHECK constraint'leri her satırda çalışır ve bir fonksiyon çağırabilir, ama (a) Zod kadar zengin hata mesajı üretemez, (b) `decodeURIComponent` gibi JS-native decode mantığını SQL'de yeniden yazmak riskli/hataya açık (Postgres'in kendi encode/decode fonksiyonları JS ile birebir aynı davranmayabilir — bu tam olarak "sadece regex'e güvenme" uyarısının SQL tarafındaki karşılığı). Bu nedenle DB CHECK'i TAM allowlist mantığının kopyası olarak DEĞİL, dar bir "bilinen-tehlikeli şema önekleri" güvenlik ağı olarak tasarlanmalı:
  ```sql
  -- İllüstratif — repoya yazılmadı.
  alter table public.store_navigation_items
    add constraint store_navigation_items_url_scheme_check
    check (lower(url) !~ '^\s*(javascript|data|vbscript|file|about|blob)\s*:');
  ```
  Bu, Zod katmanı bir gün yanlışlıkla zayıflatılsa/bypass edilse bile (ör. bir refactor sırasında `.refine()` satırının silinmesi) DB'nin en azından en bilinen tehlikeli şemaları REDDETMEYE devam etmesini sağlar — ama TEK BAŞINA yeterli değildir (encode edilmiş varyantları, boşluk/kontrol-karakter triklerini SQL regex'i JS kadar güvenilir yakalayamaz). **Sonuç: evet, bir CHECK constraint PostgreSQL açısından mantıklı ve önerilir, ama SADECE ikincil/backstop olarak — birincil doğrulama her zaman Zod'da kalmalı.**

**`homepage-section.ts`'teki `linkUrl`/`secondaryCtaHref` alanları için de AYNI `isSafeNavigationUrl()` fonksiyonu paylaşılmalı** (tek bir `lib/validation/safe-url.ts` yardımcı modülüne çıkarılıp iki dosyadan da import edilmesi önerilir — kod tekrarını önler, gelecekte tek yerden güncellenir).

---

## 7. CRITICAL 2 — Root Cause

`lib/auth/require-session.ts`'in kendi doc-comment'i (satır 17-20) zaten dürüstçe itiraf ediyor: *"This is the ONLY thing that gates dashboard access... only checks `getOptionalUser()`, no AAL2 check."* AAL2 kontrolü SADECE iki yerde var: `app/dashboard/layout.tsx` ve `/mfa-challenge` sayfasının kendisi.

**Bu neden bir mimari hata, "unutulan bir satır" değil:** Next.js'in KENDİ resmi dokümantasyonu (Context7 ile bu turda `/vercel/next.js` üzerinden doğrulandı, `docs/01-app/02-guides/data-security.mdx`) şunu AÇIKÇA söylüyor:

> *"For new projects, it is recommended to implement a dedicated Data Access Layer (DAL). This internal library centralizes data fetching logic, enforces authorization checks, and returns minimal Data Transfer Objects (DTOs)."*

ve (önceki oturumda `node_modules/next/dist/docs/...authentication.md`'den doğrulanmış aynı uyarının Context7 üzerinden GÜNCEL resmi kaynaktaki karşılığı):

> *"A common pattern in SPAs is to return null in a layout... This pattern is not recommended since Next.js applications have multiple entry points, which will not prevent nested route segments and Server Actions from being accessed."*

Yani: `app/dashboard/layout.tsx`'teki AAL2 kontrolü, SADECE "layout render edilirse çalışan" bir kontrol — ama bir Server Action, tarayıcının o layout'u hiç render ETMEDEN, doğrudan kendi endpoint'ine bir POST isteğiyle çağrılabilir (bu, Next.js Server Actions'ın KENDİ tasarımının bir sonucu — her `"use server"` fonksiyonu kendi başına bağımsız bir HTTP endpoint'idir). Sonuç: `requireStoreAdminAccess()`/`requireAdmin()`'in üzerine inşa edildiği `requireSession()` AAL2'ye hiç bakmadığı için, geçerli ama AAL1'de kalmış (MFA tamamlanmamış) bir oturum çerezi, dashboard'ı HİÇ AÇMADAN, doğrudan `setStoreMaintenanceModeAction`/`changeUserRoleAction` DIŞINDAKİ (bunlar zaten ayrıca şifre re-auth istiyor) HER Server Action'ı çağırabilir.

---

## 8. CRITICAL 2 — AAL2 Architecture

**Tasarım prensibi (kullanıcının talimatına birebir uyarak):** "Her Server Action'a körü körüne MFA kontrolü eklemek zorunda değilsin" — bunun yerine AAL2 kontrolü, action'ların ZATEN çağırdığı ORTAK gate fonksiyonlarına (`requireStoreAdminAccess`, `requireAdmin`) EKLENİR; yeni bir kod tekrarı yaratılmaz.

**Yeni merkezi yardımcı (illüstratif — repoya yazılmadı):**

```ts
// lib/auth/require-aal2.ts (YENİ dosya, illüstratif)
import "server-only";
import { redirect } from "next/navigation";
import { getAalStatus, needsMfaChallenge } from "@/lib/auth/mfa";

/**
 * requireSession()'ın AAL2 karşılığı — aynı desen (redirect, throw değil).
 * SADECE MFA'yı GERÇEKTEN kaydetmiş (verified factor'ı olan) kullanıcıları
 * etkiler: needsMfaChallenge() zaten "nextLevel==='aal2' && currentLevel!=='aal2'"
 * demek — yani MFA'sı olmayan bir kullanıcı için bu her zaman false döner
 * (Supabase Auth'un kendi sunucu tarafı davranışıyla AYNI: bkz. Context7
 * ile bu turda doğrulanan supabase/auth kaynak kodu, internal/api/user.go —
 * "if user.HasMFAEnabled() && !session.IsAAL2()" — AAL2 zorunluluğu SADECE
 * MFA kayıtlı kullanıcılar için tetiklenir, mimari olarak Supabase'in
 * kendisiyle TUTARLI).
 */
export async function requireAal2(): Promise<void> {
  const status = await getAalStatus();
  if (needsMfaChallenge(status)) {
    redirect("/mfa-challenge");
  }
}
```

**Merkezi gate'lere entegrasyon** (illüstratif diff — repoya yazılmadı):

```ts
// lib/auth/require-store-access.ts içinde SADECE requireStoreAdminAccess'e eklenir:
export async function requireStoreAdminAccess(storeId: string): Promise<StoreAccessContext> {
  const { user } = await requireSession();
  await requireAal2(); // <-- YENİ: Level 3+ gate'lerin hepsi buradan geçer
  const customerId = await resolveStoreCustomerId(storeId);
  // ... (geri kalanı değişmiyor)
}
// requireStoreAccess() ve requireStoreEditorAccess()'e EKLENMİYOR (Level 1/2 —
// bkz. §9 matris, bilinçli olarak AAL2 istemiyor).
```

Aynı `await requireAal2();` satırı `lib/auth/require-admin.ts`'in `requireAdmin()` fonksiyonuna da eklenir (platform_admin tüm işlemler Level 3+ kabul ediliyor — bkz. §9).

**"AAL2 requirement'ın Server Action gerçekten çağrıldığında doğrulanmasını garanti et" talimatı nasıl karşılanıyor:** `requireAal2()`, page/layout'ta DEĞİL, `requireStoreAdminAccess()`/`requireAdmin()`'in İÇİNDE çağrılıyor — ve bu iki fonksiyon zaten HER Level-3+ Server Action'ın kendi gövdesinin İLK satırında çağrılıyor (mevcut kod deseni, §1/§5 Final Review'da doğrulandı). Yani AAL2 kontrolü artık "sayfa render edildiğinde bir kere" değil, "her action invocation'ında, action'ın kendi kod yolunda" çalışıyor — tam olarak Next.js'in DAL önerisinin ("centralizes... authorization checks" within a "server-only module" the action itself calls) birebir uygulanması.

**Residual/bilinçli sınır (dürüstçe belirtilmeli):** `needsMfaChallenge()` sadece MFA KAYITLI kullanıcılar için true dönebilir — hiç MFA kaydetmemiş bir platform_admin/store_admin için bu kontrol HİÇBİR ZAMAN engellemez (bugünkü davranışla AYNI). Bu, CRITICAL 2'nin kapsamı DIŞINDA, AYRI bir bulgu (Final Review §6 MFA-backup/M3 ile aynı aile) — **"MFA enrollment'ı platform_admin/store_admin için ZORUNLU kılma"** ayrı bir mimari karar/onay gerektirir (kullanıcı deneyimi + kurtarma akışı tasarımı gerektirdiği için bu planın kapsamı dışında bırakıldı, ayrı bir talep olarak önerilir).

**Level 4 için ek katman — `requireReauthentication()`:** Mevcut `lib/auth/reauthenticate.ts`'teki `reauthenticateWithPassword()` DEĞİŞMİYOR — sadece hangi action'ların onu çağırması gerektiği §9'da netleştiriliyor. **Ek olarak (MEDIUM, Final Review M2 ile aynı bulgu):** `changeUserRoleAction`/`setStoreMaintenanceModeAction`'ın reauth çağrıları, projenin ZATEN VAR OLAN `rateLimit()` yardımcı fonksiyonuyla (login/mfa-challenge'da kullanılan AYNI fonksiyon, `lib/security/rate-limit.ts` — yeni bağımlılık gerekmiyor) sarmalanmalı: `rateLimit(`reauth:${user.id}`, { limit: 5, windowMs: 15*60*1000 })` gibi, login'inkiyle tutarlı bir pencere.

**Yeni bulgu (bu planlama turunda tespit edildi) — MFA settings Level 4 kapsamına dahil edilmeli:** `unenrollTotpFactor()` (`lib/auth/mfa.ts`) bugün SADECE `requireSession()` seviyesinde bir sayfadan çağrılıyor (kod okumasıyla doğrulandı — Server Action'ın kendisi ayrı bir gate çağırmıyor, sadece dashboard layout'un AAL2 kontrolüne güveniyor, ki bu CRITICAL 2'nin ta kendisi). Kullanıcının kendi listesinde "MFA settings" açıkça Level 4 örneği olarak verilmiş — bu nedenle `unenrollTotpFactor` çağıran Server Action'a da `requireReauthentication()` (kullanıcının kendi ikinci faktörünü KALDIRMASI, tıpkı rol değişikliği kadar hassas) eklenmesi ÖNERİLİR. Bu, CRITICAL 2'nin ana düzeltmesiyle (requireAal2 merkezi gate'e eklenmesi) AYNI COMMIT'te ele alınabilecek küçük bir ek kapsam.

---

## 9. Authorization Level Matrix

| Level | Tanım | Gerekli helper zinciri | Örnek action'lar (mevcut kod) |
|---|---|---|---|
| **0** | Public/read (anon) | (yok — sadece anon RLS policy) | `getStoreBySlug`, `getPublicStoreNavigation`, `getPublicStoreBranding`, `getPublicHomepageSections` |
| **1** | Normal authenticated read | `requireSession()` (+ `requireStoreAccess()` üye kontrolü) | Dashboard sayfa render'ları, Profile/Settings/Branding/Navigation/Homepage GÖRÜNTÜLEME (viewer dahil) |
| **2** | Normal store editing (geri alınabilir içerik) | `requireSession()` + `requireStoreEditorAccess()` (role: store_editor+) | `createNavigationItemAction`/`updateNavigationItemAction`/`toggleNavigationItemActiveAction`, `moveNavigationItemAction`, `createHomepageSectionAction`/`updateHomepageSectionAction`/`toggleHomepageSectionActiveAction`/`moveHomepageSectionAction`, branding update |
| **3** | Hassas store-admin işlemleri (kritik ayar veya kalıcı silme, ama tek-mağaza kapsamlı) | `requireSession()` + `requireAal2()` **(YENİ)** + `requireStoreAdminAccess()` (role: SADECE store_admin) | Store Profile/Settings update, `deleteNavigationItemAction`/`deleteNavigationMenuAction`, `deleteHomepageSectionAction`, `setStoreStatusAction` |
| **4** | Kritik güvenlik/finansal işlemler (tenant-genelinde veya kimlik/erişim etkisi) | `requireSession()` + `requireAal2()` **(YENİ, `requireAdmin()`/`requireStoreAdminAccess()` üzerinden)** + `requireReauthentication()` + `rateLimit()` | `changeUserRoleAction` (mevcut), `setStoreMaintenanceModeAction` (mevcut — kullanıcının kendi örneğiyle birebir), `unenrollTotpFactor` (**ÖNERİLEN EKLEME**, §8); gelecekte: mağaza/müşteri kalıcı silme, ödeme ayarları, webhook secret'ları, API key yönetimi |

**Not:** Level 3 ve Level 4 arasındaki fark, kullanıcının talimatındaki ayrımla birebir örtüşüyor — Level 3 "sensitive store admin actions" (rol kontrolü + AAL2 yeterli), Level 4 "critical security/financial actions" (rol + AAL2 + AYRICA anlık şifre re-auth + rate limit). Level 2'ye AAL2 EKLENMİYOR çünkü içerik düzenleme geri alınabilir (aktif/pasif toggle, tekrar düzenlenebilir) — kullanıcının "körü körüne her action'a MFA ekleme" talimatına uygun.

---

## 10. Next.js Security Update

**Context7 + resmi Next.js blog'u (bu turda WebFetch ile doğrulandı, Context7'nin kendi index'i henüz Ağustos 25 güncellemesini içermiyor — bu nedenle birincil kaynak olarak doğrudan `nextjs.org/blog` kullanıldı):**

- **Önerilen hedef sürüm:** `16.3.3` (kurulu `16.3.0` için doğru patch hattı — proje `next: "16.3.0"` kullanıyor, 15.x DEĞİL).
- **Neden gerekli:** Vercel'in resmi duyurusu (`nextjs.org/blog/nextjs-security-release-august-2026-update`, 25 Ağustos 2026 yayınlandı, bu oturumda doğrudan fetch edilerek doğrulandı): *"two critical severity vulnerabilities"* — ilk duyuru (`upcoming-nextjs-security-release-august-2026`, 20 Ağustos) tek bir CRITICAL öngörüyordu, ama *"a newly identified issue prompted us to move the release forward"* denilerek ikinciye çıkarıldı. **ÖNEMLİ DÜRÜSTLÜK NOTU:** bu iki zafiyetin TEKNİK detayları (CVE numarası, etki mekanizması, hangi kod yolunun etkilendiği) resmi blog gönderisinde HENÜZ YAYINLANMAMIŞTI — post'un kendisi *"Later today, we will publish the patched versions alongside full advisory details"* diyor. Yani bu planın yazıldığı anda TAM advisory (CVE dahil) kamuya açık değil; **production'a geçmeden hemen önce `nextjs.org/blog` yeniden kontrol edilip tam advisory (CVE, etkilenen kod yolu, gerçekten bu projeyi etkileyip etkilemediği) okunmalı.** Referans emsal: aynı proje ailesinde Aralık 2025'te CVSS 10.0 bir RCE (`CVE-2025-66478`, "React2Shell", App Router + RSC kullanan TÜM 15.x/16.x uygulamalarını etkilemişti, 16.0.7'de düzeltilmişti) yaşanmış olması, Next.js'in App Router/RSC katmanındaki kritik zafiyetlerin bu projeyi (App Router + Server Actions yoğun kullanan bir mimari) doğrudan etkileme potansiyeli olduğunu gösteriyor — bu nedenle 16.3.3'ün "muhtemelen ilgisiz" varsayılmaması, advisory yayınlanır yayınlanmaz aktif olarak takip edilmesi önerilir.
- **Breaking change ihtimali:** `16.3.0 → 16.3.3` bir PATCH sürüm artışı (aynı minor, `16.3.x`) — semver kurallarına göre breaking change BEKLENMEZ. **Ama** bu projenin kendi `AGENTS.md`'si açıkça uyarıyor: *"This is NOT the Next.js you know... Read the relevant guide in `node_modules/next/dist/docs/`"* — bu nedenle güncelleme SONRASI (uygulanmadan önce değil, kurulu paketin kendi CHANGELOG'u okunarak) `node_modules/next/dist/docs/` içindeki ilgili sürüm notları/CHANGELOG'un mutlaka kontrol edilmesi gerekiyor; güvenlik yamaları bazen davranışsal bir sıkılaştırma (ör. bir header kontrolünün sıkılaştırılması) içerebilir ki bu teknik olarak "breaking" olmasa da gözlemlenebilir bir davranış değişikliği olabilir.
- **Package/lockfile değişiklikleri:** Sadece `package.json`'daki `"next": "16.3.0"` → `"next": "16.3.3"` (veya `"^16.3.3"`, mevcut pinning stiline göre) ve `package-lock.json`'un `npm install next@16.3.3` ile yeniden üretilmesi. `react`/`react-dom`/`@types/react` gibi bağımlı sürümlerin bu patch ile değişmesi BEKLENMİYOR (major/minor bump değil).
- **Test planı (güncelleme SONRASI, bu plan kapsamında UYGULANMIYOR):** (1) `npm run build` başarıyla tamamlanmalı; (2) `npm run lint`/tip kontrolü hatasız; (3) tam smoke test: login → MFA challenge → dashboard → her Phase 2 CRUD akışı (Profile/Settings/Branding/Navigation/Homepage) → logout; (4) Server Actions'ın CSRF/Origin kontrolünün hâlâ beklendiği gibi çalıştığının doğrulanması (bu, önceki security review'da PASS olarak işaretlenmişti — regresyon olmadığından emin olunmalı); (5) `npm audit` çalıştırılması (Final Review §14'te "NOT TESTED" olarak işaretlenmişti — bu güncellemeyle birlikte yapılması doğal bir fırsat).
- **Rollback planı:** `package.json`/`package-lock.json` değişikliği TEK BİR commit'te izole edilirse, `git revert <commit>` ile anında geri alınabilir (kod değişikliği YOK, sadece bağımlılık sürümü — rollback riski minimal). Vercel/deploy platformunda önceki deployment'a "instant rollback" (build-time bağımlılık değişikliği olduğu için tam bir yeniden deploy gerekir, ama önceki build artifact'i genelde saklanır) da bir seçenek.
- **Bu plan kapsamında YAPILMADI:** `npm install`/`npm update` ÇALIŞTIRILMADI, `package.json`/`package-lock.json` DEĞİŞTİRİLMEDİ — talimat gereği sadece hedef sürüm + gerekçe + test/rollback planı sunuldu.

---

## 11. Migration Plan

**Kapsam:** SADECE `store_navigation_items`/`store_navigation_menus`'un composite FK'si (§4) ve (opsiyonel) URL scheme CHECK constraint'i (§6). **0001-0007'ye ve 0008/0009/0011'e HİÇBİR dokunuş YOK.**

**Senaryo A — 0010 hâlâ hiçbir ortamda uygulanmamışsa (bugünkü doğrulanmış durum, Final Review §0 madde 3):**
- **Forward path:** 0010'un dosyasının kendisi düzeltilir — `store_navigation_menus`'un `create table` bloğuna `(id, store_id)` unique constraint eklenir; `store_navigation_items`'ın `menu_id uuid not null references ...` tekil FK tanımı, composite FK ile değiştirilir (tablo tanımının İÇİNDE, ayrı bir `alter table` gerekmeden — henüz hiç uygulanmadığı için "temiz" bir migration dosyası yazılabilir); `url text not null` satırına CHECK constraint eklenir (§6). **Yeni migration numarası GEREKMİYOR.**
- **Rollback:** Migration hiç uygulanmadığı için "rollback" kavramı yok — dosya düzeltilip normal 0010 olarak ilk kez uygulanacak.
- **Mevcut veri uyumluluğu:** Sıfır satır (tablo hiç var olmadığı için) — uyumluluk sorunu YOK.
- **Constraint validation:** Boş tabloda constraint eklemek anlıktır, kilit/performans riski YOK.
- **Production risk:** MINIMAL — henüz hiçbir gerçek veri/trafik bu tabloları kullanmıyor.

**Senaryo B — 0010 SİZİN bilginiz dışında BAŞKA bir ortamda (ör. bir geliştirme/staging Supabase projesi) zaten uygulanmışsa ve test verisi içeriyorsa (ihtiyati senaryo, bu sandbox'tan doğrulanamaz):**
- **Forward path:** Yeni bir düzeltme migration'ı **0012** olarak eklenir (0010'un kendisi artık "uygulanmış geçmiş" sayılır, geriye dönük değiştirilmez). 0012 şu adımları İZLENEN sırayla içerir: (1) mevcut `store_navigation_items` satırlarında `store_id ≠ (select store_id from store_navigation_menus where id = menu_id)` olan satırları TESPİT ET (salt-okunur bir SELECT ile önce raporla, OTOMATİK silme/düzeltme YAPMA — bu, veri kaybı riski taşıyan bir karar, kullanıcının onayını gerektirir); (2) eğer ihlal eden satır YOKSA, composite FK'yi `NOT VALID` OLMADAN doğrudan ekle; (3) eğer ihlal eden satır VARSA, önce bu satırları kullanıcıyla birlikte tek tek değerlendirip (yanlışlıkla mı girilmiş, yoksa gerçek bir istismar mı) temizledikten SONRA constraint eklenir.
- **Production-safe ekleme deseni (Postgres resmi dokümantasyonunun önerdiği, veri VARSA kilit riskini azaltan yöntem):**
  ```sql
  -- İllüstratif — sadece Senaryo B gerçekleşirse ve veri varsa kullanılır.
  alter table public.store_navigation_items
    add constraint store_navigation_items_menu_store_fkey
    foreign key (menu_id, store_id)
    references public.store_navigation_menus (id, store_id)
    not valid;              -- anında eklenir, YENİ satırları hemen zorlar, ESKİ satırları henüz taramaz
  alter table public.store_navigation_items
    validate constraint store_navigation_items_menu_store_fkey; -- ayrı adım, SHARE UPDATE EXCLUSIVE kilidi (tam tablo kilidi DEĞİL)
  ```
- **Rollback:** `alter table ... drop constraint store_navigation_items_menu_store_fkey;` — anında, veri kaybı yok.
- **Mevcut veri uyumluluğu:** Yukarıdaki (1) adımıyla ÖNCEDEN doğrulanır, sürpriz bir "constraint eklenemedi" hatası production'da YAŞANMAZ.
- **Production risk:** DÜŞÜK-ORTA (veri varsa) — `NOT VALID`+`VALIDATE` deseni sayesinde uzun bir ACCESS EXCLUSIVE kilidi yaşanmaz.

**Bu plan kapsamında hangi senaryonun geçerli olduğu DOĞRULANMALI** (SİZİN VS Code oturumunuzdan, gerçek `origin/main`/tüm ortamların migration geçmişini kontrol ederek) — bu sandbox'ın kendisi bunu kesin olarak bilemiyor (Final Review §0 madde 1'deki git-remote kısıtlaması burada da geçerli).

---

## 12. Test Plan

Final Review'daki AYNI, kanıtlanmış metodoloji (gerçek `authenticated`/`anon` Postgres rolü, `begin;...rollback;`, her kimlik değişiminde `request.jwt.claims`'in açıkça set/clear edilmesi) CRITICAL 1 testleri için AYNEN kullanılmalı. **CRITICAL 2 testleri İÇİN FARKLI bir metodoloji GEREKİYOR** — bu, "stale JWT" uyarısının bu turdaki en önemli uygulaması: **AAL2, Postgres RLS rolü/`request.jwt.claims` seviyesinde DEĞİL, Supabase Auth'un (GoTrue) kendi JWT'sindeki `aal` claim'inde yaşıyor.** `set_config('request.jwt.claims', ...)` ile bir Postgres oturumunu "sanki AAL2'ymiş gibi" taklit etmek, `requireAal2()`'nin GERÇEKTE çağırdığı `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` (JS SDK, gerçek bir Supabase Auth oturumuna karşı çalışır) yolunu HİÇ test ETMEZ — bu, tam olarak kullanıcının uyardığı "yanlış kimlik/servis katmanıyla test edip yanlış PASS almak" hatasının YENİ bir versiyonu olurdu.

| Test | Kullanılacak identity | Kullanılacak katman | Beklenen |
|---|---|---|---|
| **TEST 1** — Petra store_admin → Store C menu_id ile INSERT | Gerçek Petra store_admin, `set local role authenticated` + gerçek `request.jwt.claims` | Postgres (composite FK devrede) | **DENIED** (foreign key violation) |
| **TEST 2** — Petra store_editor → Store C menu_id ile UPDATE | Gerçek Petra store_editor kimliği | Postgres (composite FK + RLS `with check`) | **DENIED** |
| **TEST 3** — Petra → Store C navigation SELECT | Gerçek Petra kimliği (herhangi bir store rolü) | Postgres RLS (`is_store_member`) | **DENIED** (0 satır) |
| **TEST 4** — Anon → kötü niyetli navigation URL (`javascript:...` içeren bir satır, test fixture'ı olarak DB'ye zaten var — ör. önceki rollback edilmemiş bir kayıt DEĞİL, bu testin kendi fixture'ı) | Gerçek `anon` rolü, temizlenmiş `request.jwt.claims` | Postgres RLS + (varsa) DB CHECK constraint + Zod (uygulama katmanında, ayrı bir birim testi olarak) | **never visible / never insertable** — hem "kötü URL hiç DB'ye giremiyor" (Zod+CHECK) hem "girse bile anon'a görünmüyor" (RLS, zaten mevcut policy) iki ayrı iddia, ayrı ayrı test edilmeli |
| **TEST 5** — Authenticated AAL1 (MFA kayıtlı ama bu oturumda challenge tamamlanmamış) → Level 3 Server Action (`updateStoreProfileAction` gibi) | **GERÇEK Supabase Auth API'si** — test kullanıcısına `supabase.auth.mfa.enroll()`+`challengeAndVerify()` ile ÖNCE bir TOTP factor kaydedilir, SONRA `supabase.auth.signInWithPassword()` ile YENİ bir oturum açılır (bu yeni oturum, factor kayıtlı olduğu için otomatik olarak `nextLevel: 'aal2', currentLevel: 'aal1'` döner — challenge tamamlanmadığı sürece) | **Next.js Server Action katmanı** (Postgres DEĞİL) — action'ın kendisi, bu AAL1 oturumun çerezi/token'ıyla doğrudan (dashboard UI'dan geçmeden) çağrılır | **DENIED** — `requireAal2()` içindeki `redirect("/mfa-challenge")` tetiklenmeli |
| **TEST 6** — Authenticated AAL2 (TEST 5'teki AYNI kullanıcı, ŞİMDİ `challengeAndVerify()` ile TOTP kodu girilerek AAL2'ye yükseltilmiş) → AYNI action | Aynı kullanıcı, `currentLevel: 'aal2'` | Next.js Server Action katmanı | **ALLOWED** (role uygunsa) |
| **TEST 7** — AAL1 oturumun, dashboard UI'ı HİÇ AÇMADAN, action'ın HTTP endpoint'ine doğrudan bir istekle (ör. `curl`/`fetch` ile Server Action'ın kendi POST endpoint'ine, geçerli ama AAL1 session cookie'siyle) çağrılması | TEST 5'teki AAL1 kullanıcı | Next.js Server Action katmanı, **layout/dashboard render'ı BYPASS edilerek** | **DENIED** — bu, CRITICAL 2'nin TAM OLARAK kanıtlamak istediği senaryo: layout hiç çalışmasa bile `requireAal2()` action'ın kendi kod yolunda çalışıyor mu? |
| **TEST 8** — Cross-tenant Server Action, manipüle edilmiş `store_id` ile (Petra'nın kimliği, Store C'nin `storeId`'siyle `updateStoreProfileAction` çağrısı) | Gerçek Petra kimliği | Next.js Server Action + Postgres RLS birlikte | **DENIED** — bu zaten Final Review'da PASS olarak doğrulanmıştı (§1/§2), CRITICAL 1/2 düzeltmelerinin bunu BOZMADIĞINI doğrulamak için regresyon testi olarak tekrarlanmalı |

**TEST 5-7 için pratik not:** Bu testler, `mcp__Supabase__execute_sql` (ham SQL) ile YAPILAMAZ — gerçek bir Next.js runtime'ı (ya lokal `next dev`/staging deploy, ya da Server Action'ları taklit eden bir entegrasyon test ortamı, ör. Playwright + gerçek bir test Supabase projesi) ve gerçek Supabase Auth API çağrıları gerektirir. Bu, düzeltme UYGULANDIKTAN SONRA, kod değişikliği yapan oturumda (sizin VS Code Claude Code oturumunuz) ayrı bir "entegrasyon test" adımı olarak planlanmalı — bu planlama belgesi kapsamında ÇALIŞTIRILMADI.

---

## 13. Rollback Plan

| Değişiklik | Rollback |
|---|---|
| Composite FK (§4) | Senaryo A: henüz hiç uygulanmadıysa "rollback" yok, dosya tekrar düzenlenir. Senaryo B: `alter table store_navigation_items drop constraint store_navigation_items_menu_store_fkey;` — anında, veri kaybı yok. |
| URL CHECK constraint (§6) | `alter table store_navigation_items drop constraint store_navigation_items_url_scheme_check;` — anında. |
| Zod `.refine()` URL validasyonu (§6) | Git revert — kod değişikliği, migration değil. |
| `requireAal2()` merkezi gate (§8) | Git revert — `requireStoreAdminAccess()`/`requireAdmin()`'den `await requireAal2();` satırının kaldırılması, TEK satırlık geri alma. |
| `unenrollTotpFactor`'e reauth eklenmesi (§8) | Git revert. |
| Next.js 16.3.3 (§10) | `package.json`/`package-lock.json` için git revert + `npm install`. |

**Genel gözlem:** HİÇBİR önerilen değişiklik geri dönüşü zor/imkansız bir işlem DEĞİL — hepsi ya bir DB constraint'in `drop`'u (anında) ya da bir git revert (anında). Bu, "SAFE TO IMPLEMENT" kararını destekleyen önemli bir faktör.

---

## 14. Production Risk

| Değişiklik | Risk seviyesi | Gerekçe |
|---|---|---|
| Composite FK ekleme (Senaryo A) | **ÇOK DÜŞÜK** | Boş tablo, henüz production'a hiç uygulanmamış migration |
| Composite FK ekleme (Senaryo B) | **DÜŞÜK-ORTA** | `NOT VALID`+`VALIDATE` deseni kilit riskini azaltıyor, ama önce mevcut veri denetlenmeli |
| URL CHECK constraint | **ÇOK DÜŞÜK** | Dar kapsamlı (sadece bilinen tehlikeli şema önekleri), Zod zaten aynı/daha geniş kısıtlamayı önce uyguluyor — CHECK'in production'da GERÇEKTEN reddedeceği bir satır normal akışta hiç oluşmamalı |
| Zod URL allowlist | **DÜŞÜK** | Meşru kullanım senaryolarının (iç sayfa linki, harici https linki) hepsi allowlist'te — ama gerçek kullanıcı verisiyle (ör. `mailto:` linki kullanmak isteyen bir editör) test edilmeden deploy edilmemeli; bu nedenle §15'te "önce staging'de gerçek içerikle dene" adımı var |
| `requireAal2()` merkezi gate | **ORTA — dikkatli deploy gerektirir** | Bugün MFA kaydı olan (varsa) platform_admin/store_admin kullanıcılar, bu değişiklik deploy edildiği anda AAL1 kalan aktif oturumlarında Level 3+ action'lara erişemez hale gelir (beklenen/istenen davranış) — ama bu kullanıcılara ÖNCEDEN haber verilmesi (ör. "bundan sonra kritik ayarlara erişmeden önce MFA challenge'ı tamamlamanız istenecek") iyi bir pratik. **Bugün hiç MFA kaydı olmayan kullanıcılar İÇİN davranış DEĞİŞMİYOR** (§8 residual not). |
| Reauth'a rate limit eklenmesi | **ÇOK DÜŞÜK** | Mevcut, zaten production'da kullanılan aynı `rateLimit()` fonksiyonu, sadece iki yeni çağrı noktası |
| Next.js 16.3.3 | **BELİRSİZ (advisory henüz tam yayınlanmadı)** | §10'da detaylandırıldı — advisory yayınlanınca yeniden değerlendirilmeli |

---

## 15. Implementation Order

Bağımlılıkları ve riski minimize edecek sıra:

1. **Next.js 16.3.3 advisory'sinin tam metnini bekle/kontrol et** (bağımsız, diğer hiçbir adımı bloklamıyor ama paralel takip edilmeli — advisory'nin gerçekten bu projenin kod yollarını etkileyip etkilemediği netleşmeden büyük bir "acil upgrade" kararı verilmemeli, ama rutin bir sonraki bakım penceresinde uygulanması ÖNERİLİR).
2. **Zod URL allowlist'i yaz ve BAĞIMSIZ birim testleriyle doğrula** (§6/§12 TEST 4'ün Zod kısmı) — hiçbir migration/DB değişikliği gerektirmiyor, en düşük riskli, en hızlı uygulanabilir adım.
3. **Composite FK'yi §11 Senaryo A/B'ye göre uygula** (hangi senaryonun geçerli olduğunu ÖNCE VS Code oturumunuzdan doğrulayın) — Zod katmanı zaten devredeyken bu, "veri zaten temiz" garantisini DB seviyesine taşır.
4. **(Opsiyonel) URL CHECK constraint'i ekle** — 3. adımla aynı migration'da, ek risk yok.
5. **TEST 1-4'ü canlıya karşı (`begin;...rollback;`) çalıştırıp CRITICAL 1'in kapandığını doğrula.**
6. **`requireAal2()` yardımcı fonksiyonunu yaz, `requireStoreAdminAccess()`/`requireAdmin()`'e ekle, `unenrollTotpFactor`'e reauth ekle** — bu, kod-only bir değişiklik (migration yok), 3-5'ten BAĞIMSIZ paralel de yapılabilir.
7. **TEST 5-8'i gerçek Supabase Auth API'siyle (staging/test ortamında) çalıştırıp CRITICAL 2'nin kapandığını doğrula.**
8. **Regresyon:** Final Review'daki TÜM önceki PASS testlerini (RBAC matrisi, cross-tenant izolasyon, audit log, vb.) yeniden çalıştır — yeni constraint'lerin/gate'lerin MEVCUT meşru akışları BOZMADIĞINDAN emin ol.
9. **Ancak BUNDAN SONRA** — tüm testler PASS ise — production migration + git commit/push kararı yeniden gözden geçirilebilir (bu karar, kodu yazan/test eden oturumun kendi raporuyla, YENİ bir "post-remediation verification" turu gerektirir; bu planın kapsamı bunu İÇERMİYOR).

---

## 16. Final Recommendation

# **SAFE TO IMPLEMENT**

Her iki CRITICAL bulgu için de mimariyi yeniden tasarlamayı gerektirmeyen, mevcut kod/migration desenleriyle tutarlı, geri alınabilir (rollback'i anında olan) çözümler mevcut:

- **CRITICAL 1**, resmi PostgreSQL dokümantasyonunda tanımlı standart bir mekanizmayla (composite foreign key) DB seviyesinde kalıcı olarak kapatılabilir, migration 0010 henüz production'a hiç uygulanmadığı için **yeni bir migration numarasına bile gerek yok** (Senaryo A). URL güvenliği, mevcut `resolveSafeNextPath()` deseniyle tutarlı bir allowlist + ince bir DB backstop ile ek bir katman kazanır.
- **CRITICAL 2**, Next.js'in kendi resmi Data Access Layer önerisiyle birebir örtüşen, TEK bir yeni yardımcı fonksiyon (`requireAal2()`) + onun mevcut İKİ merkezi gate fonksiyonuna (`requireStoreAdminAccess`, `requireAdmin`) eklenmesiyle kapatılabilir — "her action'a ayrı ayrı MFA kontrolü" tekrarı YOK, mimari zaten bunu merkezi hale getirmeye uygun.
- **HIGH (Next.js)**, bağımsız bir bakım/güncelleme kararı — CRITICAL 1/2'yi bloklamıyor, paralel takip edilebilir.

**Mimari değişiklik GEREKMİYOR** — mevcut üç kademeli RBAC modeli (`is_store_member`/`is_store_editor_member`/`is_store_admin_member`), mevcut `require*Access()` gate deseni, mevcut `rateLimit()`/`reauthenticateWithPassword()` yardımcıları AYNEN korunuyor; sadece (a) bir composite FK, (b) bir URL allowlist, (c) mevcut gate'lere tek satırlık bir AAL2 kontrolü ekleniyor.

**Bu planın kapsamı dışında bırakılan, ayrı onay gerektiren gelecek işler (kod DEĞİL, sadece not):** MFA'nın platform_admin/store_admin için ZORUNLU kılınması (§8 residual), MFA backup/recovery akışı (Final Review M3), Redis-tabanlı kalıcı rate limiting (mevcut in-memory çözümün kendi dürüstlük notu).

**Bu belge kapsamında hiçbir kod yazılmadı, hiçbir migration oluşturulmadı, production'a hiçbir değişiklik yapılmadı, hiçbir git commit/push yapılmadı — yukarıdaki tüm SQL/TypeScript parçaları illüstratif tasarım örnekleridir.**
