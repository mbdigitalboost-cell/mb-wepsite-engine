# PHASE 9.4 — Medya / Storage Raporu

**Kapsam:** Petra CMS için gerçek Supabase Storage medya altyapısı — bucket kurulumu, `media_assets` tablosunun gerçek dosyalarla ilişkilendirilmesi, dashboard'un gerçek upload sistemine bağlanması.

**Durum özeti:** Bucket ve erişim kontrolü altyapısı gerçek Petra Supabase projesinde kuruldu ve SQL seviyesinde doğrulandı. Dashboard kodu tamamen yeniden yazıldı. **Ancak gerçek bir binary dosya upload/download HTTP round-trip'i bu oturumda hiçbir şekilde test edilemedi** — bu, aşağıda ayrıntılı açıklanan gerçek bir sandbox kısıtlaması, varsayım değil.

---

## 1. Şema yeterlilik analizi

`media_assets` tablosu (migration 0003) zaten şu kolonları içeriyordu: `id`, `file_name`, `file_url`, `storage_path`, `alt_text`, `type`, `width`, `height`, `created_at`. Bu alanlar gerçek Storage entegrasyonu için **tamamen yeterliydi** — hiçbir kolon eklenmedi, hiçbir kolon değiştirilmedi. Eksik olan tek şey, bu metadata'nın işaret ettiği gerçek dosya baytlarının duracağı bir yerdi; bunu `storage.buckets`'a eklenen `media` bucket'ı sağlıyor.

**Sonuç: `media_assets` şeması için migration gerekmedi.** Tek migration, Supabase'in kendi yönettiği `storage.buckets` tablosuna bir satır eklemekten ibaret.

## 2. Uygulanan migration

`supabase/customer-template/migrations/0006_media_storage_bucket.sql` — gerçek Petra Supabase projesine (`wahbjfhvizalenyxjywb`) `mcp__Supabase__apply_migration` ile uygulandı ve başarı doğrulandı:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/svg+xml','image/gif'])
on conflict (id) do nothing;
```

Uygulama sonrası SQL sorgusu ile doğrulandı:

| id | public | file_size_limit | allowed_mime_types |
|---|---|---|---|
| media | true | 5242880 | image/jpeg, image/png, image/webp, image/svg+xml, image/gif |

**`storage.objects` üzerinde bilinçli olarak hiçbir RLS policy eklenmedi** — `leads` ve `tracking_settings` (0005) ile aynı "yalnızca service-role yazar" deseni. Bucket `public = true` olduğu için GET-by-URL zaten `storage.objects` RLS'ini hiç görmeden çalışıyor (Supabase'in belgelenmiş davranışı); anon/authenticated için ayrı bir SELECT policy'sine gerek yok.

## 3. Erişim kontrolü — SQL seviyesinde canlı doğrulama

Gerçek Petra DB'sinde `set local role anon;` tekniğiyle (Phase 9.3'te `tracking_settings` için kullanılan aynı yöntem):

| Test | Sonuç |
|---|---|
| `storage.objects` üzerinde policy sayısı | 0 (hiç policy yok) |
| `storage.objects.relrowsecurity` | `true` (RLS açık) |
| anon rolüyle `select count(*) from storage.objects where bucket_id='media'` | `0` satır (RLS tarafından tamamen gizleniyor) |
| anon rolüyle `insert into storage.objects (...)` | `ERROR 42501: new row violates row-level security policy` — **reddedildi** |
| `storage.buckets.public` | `true` (public GET-by-URL RLS'i bypass eder) |

Bu sonuçlar, anon/authenticated rollerin `storage.objects` üzerinde hiçbir INSERT/UPDATE/DELETE/LIST/SELECT yapamadığını, yalnızca service-role client'ın (dashboard server actions'ların kullandığı) Storage'a yazabildiğini metadata seviyesinde kanıtlıyor.

## 4. Dashboard kodu — yapılan değişiklikler

- `lib/media/constants.ts` (yeni): `ALLOWED_MEDIA_MIME_TYPES`, `MAX_MEDIA_FILE_SIZE_BYTES` (5 MiB), `MEDIA_FOLDERS`, `MEDIA_STORAGE_BUCKET` — bucket'ın kendi limitleriyle bire bir aynı, form/validation/bucket üç yerde senkron.
- `lib/validation/content.ts`: eski URL-tipli `mediaAssetFormSchema` kaldırıldı; yerine `mediaUploadFormSchema` (folder + altText) ve `mediaAssetUpdateFormSchema` (fileName + altText) eklendi.
- `app/dashboard/customers/[customerId]/media/actions.ts` — tamamen yeniden yazıldı:
  - `uploadMediaAssetAction`: MIME/boyut validasyonu → dosya adı güvenli hale getirilir (küçük harf, güvenli karakterler, benzersiz `crypto.randomUUID()` eki) → `connection.client.storage.from("media").upload(...)` (service-role client) → `getPublicUrl()` → `media_assets` satırı eklenir (`width`/`height` **ölçülmedi, `null` bırakıldı** — uydurulmadı) → DB insert başarısız olursa Storage'daki dosya best-effort geri silinir (orphan önleme).
  - `updateMediaAssetAction`: yalnızca `file_name`/`alt_text` günceller, Storage nesnesine dokunmaz.
  - `deleteMediaAssetAction`: önce Storage nesnesini siler (best-effort), sonra `media_assets` satırını siler.
- `app/dashboard/customers/[customerId]/media/media-form.tsx`: URL/storagePath text-input formundan gerçek `<input type="file">` + klasör `<select>` (MEDIA_FOLDERS) + alt metin formuna dönüştürüldü.
- `app/dashboard/customers/[customerId]/media/media-asset-row.tsx` (yeni): her medya satırı için "URL Kopyala" (clipboard), "Düzenle" (açılır inline form → `updateMediaAssetAction`), "Sil" (→ `deleteMediaAssetAction`) — "Kullanımda"/"Kullanılmıyor" göstergesi korundu.
- `app/dashboard/customers/[customerId]/media/page.tsx`: satır render'ı `MediaAssetRow` bileşenine devredildi, geri kalan mantık (kullanım taraması, `CmsUnavailableNotice` fallback) değişmedi.

Public site'taki mevcut statik görseller bu fazda **değiştirilmedi** — talimata uygun olarak yalnızca altyapı kuruldu.

## 5. Test sonuçları

| Test | Sonuç |
|---|---|
| `npm run lint` | PASS (hata yok) |
| `npx tsc --noEmit` | PASS (hata yok) |
| `npm run build` | PASS — 21 route başarıyla derlendi, `/dashboard/customers/[customerId]/media` dinamik (ƒ) route olarak listelendi |
| `next start` → `GET /` | 200 |
| `next start` → `/hizmetler`, `/projeler`, `/kampanyalar`, `/cozumler`, `/iletisim`, `/hakkimizda` | hepsi 200 |
| `next start` → `GET /dashboard/customers/x/media` (oturumsuz) | **307 → `/login`** (beklenen — `requireCustomerAccess` → `requireSession()` ilk adımda durduruyor) |
| Client bundle secret taraması (`.next/static`) — `SERVICE_ROLE`/`service_role`/`META_CAPI_TOKEN`/JWT header deseni | **Bulunamadı — temiz** |
| Client bundle'da gerçek `SUPABASE_SERVICE_ROLE_KEY_PETRA` değerinin kendisi | **Bulunamadı — temiz** |
| `git status` | Hiçbir commit/push yapılmadı — yalnızca çalışma dizini değişiklikleri (talimata uygun) |

### Test edilemeyen / test edilebilirliği sınırlı olan konular — açıkça belirtiliyor

Kullanıcının fazın sonunda özellikle istediği dürüstlük kuralına uyarak:

1. **Gerçek bir binary dosya upload'ı (örn. bir PNG dosyasının gerçekten Storage'a HTTP ile yüklenmesi) bu oturumda hiçbir şekilde çalıştırılamadı veya doğrulanamadı.** Bunun iki bağımsız nedeni var:
   - Supabase MCP araç setinde Storage dosya yükleme/indirme/listeleme için **hiçbir araç yok** (`execute_sql`, `apply_migration`, `list_tables`, `get_advisors`, `search_docs`, edge functions, branch/proje yönetimi var — dosya transferi yapan hiçbir araç yok). Bu, bu oturumun başında `ToolSearch` ile "storage upload file bucket object" araması yapılarak tekrar doğrulandı.
   - Bu sandbox'ın ağ erişimi `*.supabase.co` alan adlarını allowlist dışı bırakıyor (build loglarında görülen `Host not in allowlist: wahbjfhvizalenyxjywb.supabase.co` / `wnedgbbyqpvylfiwkwen.supabase.co` mesajları bunu her fazda tutarlı şekilde teyit ediyor). Yani bu ortamdan `fetch`/`curl` ile gerçek bir Storage API çağrısı da yapılamıyor.
   
   Bu nedenle **`uploadMediaAssetAction`'ın gerçekten çalıştığı — yani `connection.client.storage.from("media").upload(...)` çağrısının gerçek bir dosyayı gerçekten Storage'a yazdığı — bu oturumdan doğrulanamadı.** Kod, Supabase JS SDK'sının belgelenen Storage API'sini standart şekilde kullanıyor ve aynı `connection.client` her yerde (diğer tüm dashboard yazma işlemlerinde) zaten çalıştığı kanıtlanmış durumda, ancak bu **kod incelemesine dayalı bir güven**dir, **çalıştırılmış bir test değildir**. Kullanıcının gerçek bir dosya yükleyerek (dashboard üzerinden, tarayıcıdan) bunu doğrulaması gerekiyor.
2. Aynı nedenle: yüklenen bir dosyanın public URL'den gerçekten erişilebilir olduğu (`getPublicUrl()` ile üretilen URL'in tarayıcıda 200 döndüğü) de test edilemedi.
3. **Yetkisiz customer erişimi** yalnızca "oturum yok → 307 login" senaryosuyla test edildi (yukarıdaki tablo). "Customer A'nın oturum açmış kullanıcısı, Customer B'nin `/media` sayfasına erişmeye çalışırsa ne olur" senaryosu, bu sandbox'ta tarayıcı tabanlı bir login akışı kurulamadığı için gerçek bir HTTP testiyle doğrulanamadı — ancak bu, `requireCustomerAccess`'in kod incelemesiyle güvence altına alınmış durumda (bkz. `lib/auth/require-customer-access.ts`: `isMemberOfThisCustomer` kontrolü + Platform RLS'in bağımsız ikinci savunma katmanı, Phase 1'de 6 senaryoyla doğrulanmıştı) — Phase 9.3'teki dashboard auth testleriyle aynı metodoloji ve aynı sınırlama.

**Özet: Storage'ın erişim kontrolü (kim yazabilir/silebilir) SQL seviyesinde gerçek Petra DB'sinde kanıtlandı. Ancak gerçek dosya baytlarının uçtan uca (tarayıcı → server action → Storage → public URL) akışı bu sandbox'tan doğrulanamadı — başarılı olduğu varsayılmıyor, açıkça bilinmiyor olarak işaretleniyor.**

## 6. Yapılmayanlar (talimata uygun)

- Yeni müşteri oluşturma, Ahsen entegrasyonu, yeni domain — yapılmadı.
- Projects/Campaigns şema genişletmesi — yapılmadı (bu, Phase 9.2'de planlanan ve onaya bağlı olan Phase 9.6'nın konusu).
- Gereksiz migration — yapılmadı; tek migration yalnızca `storage.buckets`'a bir satır ekliyor, `media_assets` şemasına dokunmuyor.
- Git commit/push — yapılmadı.
- Petra public sitesindeki statik görseller değiştirilmedi.
- Doğrulanmamış Petra görselleri/içerikleri uydurulmadı — `width`/`height` alanları bilerek `null` bırakıldı (ölçülmediği için).

## 7. Önerilen sonraki adım

Kullanıcının dashboard üzerinden (gerçek tarayıcısından) en az bir görsel yükleyip:
1. Listede göründüğünü,
2. "URL Kopyala" ile alınan public URL'in tarayıcıda gerçekten açıldığını,
3. "Sil"in hem Storage'dan hem listeden kaldırdığını

manuel olarak doğrulaması, bu fazın gerçek uçtan uca kapanışı için gerekli — bu sandbox'ın yapısal olarak yapamadığı tek şey bu.

---

**Onay bekleniyor.** Onaylanırsa sıradaki adım Phase 9.5 (Leads).
