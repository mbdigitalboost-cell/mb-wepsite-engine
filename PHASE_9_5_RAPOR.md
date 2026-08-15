# PHASE 9.5 — Leads Raporu

**Kapsam:** Public discovery/contact formundan gelen taleplerin Petra Customer Supabase'deki `leads` tablosuna güvenli şekilde kaydedilmesi, customer/admin'in yalnızca kendi müşterisinin lead'lerini görebilmesi, durum güncellemesinin audit log'a yazılması.

**Önemli bulgu — bu faz büyük ölçüde bir denetim fazı oldu:** Mevcut kodu incelerken, leads sisteminin **zaten önceki bir fazda (muhtemelen Phase 6/7) uçtan uca kurulmuş ve güvenli bir şekilde bağlanmış olduğunu** tespit ettim. Public form → API route → service-role insert → dashboard görüntüleme → durum güncelleme → audit log zinciri hâlihazırda çalışır durumdaydı. Bu fazda yeni bir sistem kurmadım; mevcut olanı satır satır denetledim, gerçek Petra DB'sinde RLS'i canlı test ettim, bir adet güncel olmayan (stale) UI metnini düzelttim ve tam test paketini çalıştırdım.

---

## 1. Şema / enum yeterlilik analizi

`supabase/customer-template/migrations/0004_leads.sql`:

```sql
create type public.lead_status as enum ('new', 'contacted', 'closed');

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  message text,
  source text,
  status public.lead_status not null default 'new',
  created_at timestamptz not null default now()
);
```

Gerçek Petra DB'sinde canlı sorgulanan enum değerleri **birebir eşleşiyor**: `new`, `contacted`, `closed`. Kullanıcının örnek olarak verdiği `qualified`/`won`/`lost` gibi değerler **migration'da yok** — talimata uygun olarak bu değerler uydurulmadı, kod hep mevcut 3 değerle çalışıyor (`lib/validation/content.ts`'teki `leadStatusSchema` ve `lead-status-select.tsx`'teki `STATUS_LABELS` ikisi de yalnızca bu 3 değeri tanıyor).

**Sonuç: `leads` şeması ve enum'u için migration gerekmedi, hiçbir kolon/değer eklenmedi.** `name`, `phone`, `email`, `message`, `source`, `status`, `created_at` alanları dashboard'un ve public formun ihtiyacı olan her şeyi zaten karşılıyordu.

## 2. RLS — mevcut politika (0005_customer_rls.sql)

```sql
-- leads — intentionally NO policy at all for anon/authenticated (neither
-- select nor insert). service_role only.
-- (no policies created for public.leads — RLS enabled + zero policies = full deny for anon/authenticated)
```

Bu, kullanıcının istediği "public kullanıcı hiçbir şekilde leads okuyamasın/değiştiremesin" kuralının tam karşılığı — ve bu fazda hiç değiştirilmedi.

### Gerçek Petra DB'sinde canlı RLS doğrulaması

Geçici bir test satırı eklenip (`TEST_RLS_LEAD`), `set local role anon` / `set local role authenticated` teknikleriyle (Phase 9.3/9.4'te de kullanılan aynı yöntem) test edildi, sonunda satır silindi:

| Test | Sonuç |
|---|---|
| `pg_policies` — `public.leads` üzerinde policy sayısı | 0 |
| anon rolüyle `select count(*) from public.leads` (satır gerçekte var iken) | **0** — tamamen gizli |
| anon rolüyle `insert into public.leads (...)` | `ERROR 42501: new row violates row-level security policy` — **reddedildi** |
| authenticated rolüyle `select count(*) from public.leads` | **0** — tamamen gizli |
| authenticated rolüyle `insert into public.leads (...)` | `ERROR 42501` — **reddedildi** |
| postgres/service-role eşdeğeri rolle `update ... set status='contacted'` | başarılı (RLS bypass — beklenen) |
| Test satırı temizliği sonrası `count(*)` | 0 (temiz) |

Bu, hem public/anon hem de authenticated (ama service-role olmayan) hiçbir rolün `leads` tablosunu okuyamadığını veya yazamadığını, sadece service-role client'ın (dashboard server actions + public form API route'unun kullandığı) erişebildiğini kanıtlıyor.

## 3. Public form → leads akışı (mevcut, değiştirilmedi)

- `components/forms/discovery-request-form.tsx` (client): yalnızca `fetch("/api/forms/discovery-request")` çağırıyor — hiçbir secret/servis-role client'a dokunmuyor. Aynı zod şemasıyla anlık istemci-taraflı doğrulama + gizli honeypot alanı (`company`).
- `app/api/forms/discovery-request/route.ts` (server): `discoveryRequestSchema.safeParse()` ile **gerçek** doğrulama (istemci doğrulaması güvenilmiyor). Honeypot doluysa sessizce `{ok:true}` döner, hiçbir şey yazmaz.
- `lib/leads/submit-discovery-request.ts` (server, `"server-only"` import'lu): `getCustomerSupabaseClient("PETRA")` ile **service-role** client alır (bkz. `lib/cms/connection.ts` — `server-only` sınırı bu client'ın hiçbir zaman tarayıcıya sızamayacağını garanti ediyor), `leads` tablosuna insert eder:
  ```ts
  { name, phone, email, message, source: service ? `discovery-form:${service}` : "discovery-form" }
  ```
  Insert başarısız olursa (örn. bağlantı yok) hata loglanır ama fonksiyon her zaman `{ok:true}` döner — ziyaretçiye asla iç hata sızdırılmaz; `console.info` ile her zaman bir yedek kayıt tutulur.

Bu akış, kullanıcının istediği "spam/invalid input için mevcut Zod validation altyapısını kullan; gereksiz yeni sistem kurma" talimatına zaten birebir uyuyordu — yeni bir doğrulama/spam sistemi kurulmadı.

## 4. Dashboard — yapılan tek değişiklik

`app/dashboard/customers/[customerId]/leads/page.tsx`'teki güncel olmayan (stale) açıklama metni düzeltildi:

- **Önce:** "Public keşif formu bu tabloya henüz bağlı değil — mevcut console.log davranışı korunuyor (bkz. Phase 6 raporu)." — bu artık **yanlış**tı, çünkü `submitDiscoveryRequest` gerçekten `leads` tablosuna insert ediyor.
- **Sonra:** "Public keşif formu bu tabloya kaydediyor (... service-role client ile) — bkz. PHASE_9_5_RAPOR.md."

Geri kalan her şey zaten talimata uygundu, değiştirilmedi:

- **Yetkilendirme:** `requireCustomerAccess(customerId)` — admin her müşteriyi görür, customer yalnızca kendi `customer_users` üyeliği olan müşteriyi görür (Platform RLS ile ikinci savunma katmanı, Phase 1'de doğrulanmıştı).
- **Görüntüleme:** her lead satırında ad, telefon/e-posta, kaynak (`source`), mesaj, tarih (`formatDateTimeTr(lead.created_at)`) ve durum seçici gösteriliyor — talep edilen tüm alanlar zaten mevcut.
- **Durum güncelleme:** `setLeadStatusAction` — `requireCustomerAccess` ile yetki kontrolü, `leadStatusSchema` ile mevcut enum'a karşı doğrulama, `connection.client` (service-role) ile update, ardından `logAuditEvent({action: "lead.status_change", entityType: "leads", entityId: leadId, metadata: {status}})` ile **Platform'un mevcut audit_logs sistemine** yazıyor — yeni bir audit sistemi kurulmadı, `lib/auth/audit-log.ts`'teki mevcut `logAuditEvent` helper'ı kullanıldı (Phase 9.4'teki media action'larıyla aynı desen).

## 5. Public form HTTP testleri (gerçek sunucuya karşı)

`next start` ile gerçek route'a POST edildi:

| Senaryo | Beklenen | Sonuç |
|---|---|---|
| Geçerli veri | `{ok:true}` | ✅ `{"ok":true}` |
| Honeypot (`company`) dolu | `{ok:true}`, sessizce hiçbir şey yazılmaz | ✅ `{"ok":true}` |
| Eksik zorunlu alan (`phone` yok) | `validation_failed` + alan hataları | ✅ `{"ok":false,"error":"validation_failed",...}` |
| Geçersiz JSON body | `invalid_json` | ✅ `{"ok":false,"error":"invalid_json"}` |

Sunucu logu, geçerli istekte önce `console.info("[petra:discovery-request]", ...)` satırının yazıldığını, ardından gerçek insert denemesinin sandbox ağ kısıtı yüzünden başarısız olup **sessizce yakalandığını** (throw etmediğini, `{ok:true}` yanıtını bozmadığını) doğruladı — aşağıdaki §7'de ayrıntılı.

## 6. Diğer zorunlu testler

| Test | Sonuç |
|---|---|
| `npm run lint` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS — `/dashboard/customers/[customerId]/leads` dahil 21 route derlendi |
| `next start` → public route'lar (`/`, `/hizmetler`, `/projeler`, `/kampanyalar`, `/cozumler`, `/iletisim`, `/hakkimizda`) | hepsi 200 |
| `next start` → `/dashboard/customers/x/leads` (oturumsuz) | 307 → `/login` |
| `next start` → `/dashboard/customers/x/media` (oturumsuz, karşılaştırma için) | 307 → `/login` |
| Client bundle secret taraması (`.next/static`) — `SERVICE_ROLE`/`service_role`/`META_CAPI_TOKEN` deseni | Bulunamadı — temiz |
| Client bundle'da gerçek `SUPABASE_SERVICE_ROLE_KEY_PETRA` değerinin kendisi | Bulunamadı — temiz |
| `git status` | Yeni commit/push yok — yalnızca çalışma dizini değişiklikleri |

## 7. Bu oturumda gerçekten doğrulanamayanlar — açıkça belirtiliyor

1. **Gerçek bir HTTP isteğiyle `leads` tablosuna satırın fiilen yazıldığı bu sandbox'tan doğrulanamadı.** Sunucu logu şunu gösterdi:
   ```
   [cms/connection] Platform lookup failed for connectionKey: PETRA
   Host not in allowlist: wnedgbbyqpvylfiwkwen.supabase.co.
   ```
   Bu, önceki tüm fazlarda (9.1-9.4) tutarlı şekilde görülen aynı sandbox ağ kısıtı — bu ortamdan `*.supabase.co`'ya hiçbir çıkış yapılamıyor. Kodun kendisi (`getCustomerSupabaseClient` → `.insert()`) standart Supabase JS SDK çağrısı ve aynı `connection.client` deseni dashboard'daki diğer tüm yazma işlemlerinde zaten kanıtlanmış durumda — ancak bu **kod incelemesine dayalı güven**dir, bu oturumdan **çalıştırılıp doğrulanmış bir test değildir**.
   - Bunun yerine yapılabilecek en güçlü doğrulama yapıldı: gerçek Petra DB'sinde SQL üzerinden manuel bir satır eklenip RLS/erişim davranışı canlı test edildi (§2) — bu, "kim okuyabilir/yazabilir" sorusunu kesin olarak cevaplıyor, ama "public form → gerçek insert" HTTP zincirinin uçtan uca çalıştığını kanıtlamıyor.
2. Aynı nedenle, dashboard'da gerçekten görüntülenen bir lead'in **gerçek bir public form gönderiminden geldiğini** uçtan uca (tarayıcı → form → API → DB → dashboard) doğrulamak bu oturumdan mümkün olmadı.
3. "Customer A oturumuyla Customer B'nin `/leads` sayfasına erişim" senaryosu, Phase 9.3/9.4'te olduğu gibi bu sandbox'ta gerçek bir login akışı kurulamadığından yalnızca "oturumsuz → 307" testiyle doğrulandı; asıl güvence `requireCustomerAccess` + Platform RLS'in kod/mimari incelemesinden geliyor (Phase 1'de 6 senaryoyla kanıtlanmıştı).

**Özet: `leads` tablosunun erişim kontrolü (kim okuyabilir/yazabilir) gerçek Petra DB'sinde SQL seviyesinde kesin olarak kanıtlandı. Ancak public formdan gerçek bir HTTP isteğiyle gerçekten bir satırın yazıldığı bu sandbox'tan doğrulanamadı — başarılı olduğu varsayılmıyor, açıkça bilinmiyor olarak işaretleniyor.**

## 8. Yapılmayanlar (talimata uygun)

- Enum'a yeni değer eklenmedi (`qualified`/`won`/`lost` gibi) — yalnızca mevcut `new`/`contacted`/`closed` kullanıldı.
- Migration yazılmadı — şema zaten yeterliydi.
- Yeni bir spam/validation sistemi kurulmadı — mevcut Zod şeması ve honeypot deseni kullanıldı.
- Yeni bir audit log sistemi kurulmadı — mevcut `logAuditEvent` helper'ı (zaten bağlıydı) kullanıldı.
- Git commit/push yapılmadı.
- Petra public sitesi bozulmadı — public route testleri hepsi 200.

---

**Onay bekleniyor.** Onaylanırsa sıradaki adım Phase 9.6 (Projects/Campaigns şema genişletmesi — Phase 9.2'de planlanmış, henüz uygulanmamış migration).
