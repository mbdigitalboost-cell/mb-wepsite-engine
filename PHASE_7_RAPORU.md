# PHASE 7 RAPORU — Gerçek Petra Supabase Entegrasyonu

## 0) Bağlantı süreci (özet)

Faz başında oturumdaki Supabase MCP bağlantısı yanlış hesaba (ozdoganbilal9-creator's Org) bağlıydı — gerçek "petra mühendislik" projesi orada yoktu. Kullanıcı bağlantıyı `mbdigitalboost-cell's Org` hesabına yönlendirdikten sonra iki proje bulundu: **mb-digital-platform** (Platform Supabase) ve **petra mühendislik** (Customer Supabase) — ikisi de o gün (2026-08-15) yeni açılmış ve tamamen boştu (hiç migration, hiç tablo). Kullanıcı onayıyla önce Platform migration'ları da uygulandı, ardından Petra'nın Platform DB'deki customer/website kaydı oluşturuldu (bkz. madde 7) — bu, "başka müşteri/Ahsen oluşturma" yasağının kapsamı dışında, Petra'nın kendi tek kaydıdır.

## 1) Yapılan Değişiklikler

- Platform Supabase'e (`mb-digital-platform`) migration 0001-0004 gerçek içerikleriyle uygulandı.
- Petra Customer Supabase'e (`petra mühendislik`) migration 0001-0005 gerçek içerikleriyle uygulandı.
- `supabase/customer-template/seed/petra.sql` gerçek Petra projesine uygulandı.
- Platform DB'ye Petra için TEK bir customer + TEK bir website kaydı eklendi (`supabase_connection_key = 'PETRA'`, `status = 'active'`).
- `.env.local` gerçek credentials ile dolduruldu (git-ignored, repoya hiçbir zaman eklenmedi).
- `.env.local.example`'a yalnızca placeholder isimler zaten mevcuttu (Faz 6'dan) — değişmedi, gerçek değer içermiyor.
- Kod tarafında **hiçbir dosya değiştirilmedi** — mevcut `lib/config/env.ts`, `lib/supabase/*`, `lib/cms/connection.ts`, `lib/cms/customer-types.ts` isimlendirme ve davranış olarak zaten Faz 6'da bu credentials'ları bekleyecek şekilde hazırlanmıştı, ek bir kod değişikliği gerekmedi.

## 2) Değiştirilen Dosyalar

- `.env.local` (yeni, git-ignored, gerçek credentials içeriyor — rapora yazılmadı)

Başka hiçbir dosya değiştirilmedi.

## 3) Yeni Dosyalar

- `PHASE_7_RAPORU.md` (bu rapor)

## 4) Petra Supabase Bağlantısı

**PASS** — gerçek credentials artık `.env.local`'de mevcut (yerel/sandbox ortamı için; production/Vercel ortam değişkenleri ayrıca ayarlanmalı, bu faz kapsamında değil). `SUPABASE_URL_PETRA`, `SUPABASE_ANON_KEY_PETRA`, `SUPABASE_SERVICE_ROLE_KEY_PETRA` dolduruldu. `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` ve `SUPABASE_SERVICE_ROLE_KEY` (Platform) de dolduruldu.

**⚠️ Bilinmesi gereken önemli kısıt:** Bu sandbox'ın ağ erişimi `*.supabase.co`'ya izin vermiyor ("Host not in allowlist" hatası doğrudan `curl` ile de doğrulandı). Bu nedenle gerçek `next start` altında CANLI bir HTTP isteğinin gerçekten Supabase'e ulaşıp veri çektiğini bu sandbox içinden birebir gösteremedim. Bunun yerine: (a) Supabase MCP aracı (bu sandbox'ın ağ kısıtından bağımsız, ayrı bir kanaldan çalışıyor) ile migration/seed/RLS/veri sorgularının hepsini gerçek projeye karşı çalıştırıp doğruladım, (b) build ve `next start` sırasında bağlantı fabrikasının bu ağ hatasını **düzgün şekilde yakalayıp sessizce fallback'e düştüğünü** (çökme yok) doğruladım — bu aslında istenen "bağlantı koptuğunda site bozulmamalı" davranışının gerçek bir arıza koşulunda test edilmiş hali. Kullanıcı bunu kendi makinesinde veya bir Vercel preview'da `next start` ile çalıştırırsa (ağ kısıtı olmadığı için) gerçek CMS verisi uçtan uca akacaktır — kod tarafında ek bir değişiklik gerekmez.

## 5) Migration Durumu

**PASS** — Her iki projede de tüm migration'lar gerçek dosya içerikleriyle, sırayla (0001→0002→0003→0004[→0005]) uygulandı ve her adımdan sonra `list_tables` ile doğrulandı:

- **mb-digital-platform**: 0001 (profiles/customers/websites), 0002 (customer_users), 0003 (audit_logs), 0004 (RLS + trigger'lar) — 5 tablo, hepsi RLS aktif.
- **petra mühendislik**: 0001-0005 — 14 tablo + `tracking_public_settings` view, hepsi RLS aktif.

## 6) Seed Durumu

**PASS** — `petra.sql` gerçek Petra projesine uygulandı, sonrası SELECT ile doğrulandı:

- `site_settings`: 1 satır — phone="0535 791 11 96", service_area="Onikişubat, Kahramanmaraş", alternate_name="Petra İklimlendirme"; whatsapp/email/address/working_hours **NULL** doğrulandı.
- `hero_sections`: 1 satır (gerçek statik hero metni).
- `solutions`: 6 satır — slug'lar `lib/data/petra/solutions.ts` ile **birebir eşleşiyor** (grep ile çapraz doğrulandı): `split-klimalar`, `multi-split-klimalar`, `profesyonel-klimalar`, `vrf-sistemleri`, `isi-pompalari`, `sicak-su-sistemleri`.
- `services`: 5, `faqs`: 6, `navigation_items`: 7 satır.
- `projects`, `campaigns`, `testimonials`, `tracking_settings`, `seo_settings`, `media_assets`, `leads`: **0 satır** (bilinçli olarak boş) — doğrulandı.
- Tüm satırlar `status='draft'` — henüz hiçbir şey yayınlanmadı.

## 7) Platform ↔ Petra Connection Durumu

**PASS** — Platform DB'de daha önce Petra için hiçbir kayıt yoktu (proje o gün yeni açılmıştı). Kullanıcı onayıyla:
- `customers`: 1 satır — "Petra Mühendislik", slug="petra-muhendislik", status="active".
- `websites`: 1 satır — bu customer'a bağlı, `supabase_connection_key='PETRA'`, `status='active'`, `domain=NULL` (gerçek domain doğrulanmadığı için henüz atanmadı — domain resolver zaten bu fazda bağlanmıyor).

Başka hiçbir customer/website oluşturulmadı — "Ahsen", ikinci müşteri, onboarding kesinlikle yapılmadı.

## 8) CMS Adapter Testleri

**PASS** (DB seviyesinde, MCP üzerinden doğrulandı — bkz. madde 4'teki ağ kısıtı notu):

- Anon rolüyle `solutions`/`hero_sections`/`site_settings` sorgulandığında draft satırlar **0 sonuç** döndü (görünmüyor) — beklenen.
- Bir hero + bir solution satırı geçici olarak `published` yapılıp anon rolüyle tekrar sorgulandığında **satır göründü** (adapter'ın `.eq("status","published")` sorgusunun gerçek veri döndüreceği kanıtlandı), ardından test verisi bilinçli olarak tekrar `draft`'a çevrildi — yayınlama kararı kullanıcının kendi dashboard eylemi olarak kalmalı, test yan etkisi olarak production veri yayınlanmadı.
- `tracking_settings` tablosuna anon `SELECT *` → 0 satır/politika yok (RLS reddi doğrulandı, `pg_policies`'te bu tablo için hiç kayıt olmadığı görüldü).
- Query hatası senaryosu (ağ erişilemez) build sırasında gerçekleşti ve `console.error` ile loglanıp fallback'e düşüldü — kod değişmeden bu davranış zaten mevcuttu (Faz 5/6).

## 9) Public Route Testleri

**PASS** — gerçek `next start` + curl (yerel, gerçek credentials `.env.local`'de, ağ kısıtı altında):

| Route | Sonuç |
|---|---|
| `/` | 200 |
| `/cozumler` | 200 |
| `/cozumler/split-klimalar` | 200 |
| `/hizmetler` | 200 |
| `/projeler` | 200 |
| `/kampanyalar` | 200 |
| `/hakkimizda` | 200 |
| `/iletisim` | 200 |
| `/login` | 200 |

Ana sayfa statik hero metnini ("İklimlendirmede", "Mühendislik", "Petra") hâlâ içeriyor — CMS'e bağlanılamadığı durumda fallback kesintisiz çalıştı. Beyaz ekran, server crash, hydration crash veya undefined data crash **yaşanmadı**.

## 10) Dashboard Testleri

**PASS** — `/dashboard`, `/dashboard/customers`, `/dashboard/customers/[id]/content/services` oturumsuz erişimde hepsi **307 → /login** döndürdü, hiçbiri 500 değil. `requireCustomerAccess`/`requireAdmin` mekanizması değiştirilmedi (Faz 4/6 ile aynı).

## 11) RLS / Security Testleri

| # | Test | Sonuç |
|---|---|---|
| 1 | SERVICE_ROLE_KEY client bundle'a girmiyor | **PASS** — `.next/static` içinde gerçek key değerleri grep edildi, bulunamadı |
| 2 | META_CAPI_TOKEN client bundle'a girmiyor | **PASS** — kod Faz 6'da zaten doğrulanmıştı, değişmedi |
| 3 | Petra service client Client Component'ten import edilemiyor | **PASS** — `lib/cms/connection.ts` hâlâ `server-only` ile korunuyor, değişmedi |
| 4 | Public route service role kullanmıyor | **PASS** — `getCustomerPublicSupabaseClient` anon key kullanıyor, değişmedi |
| 5 | Draft içerik public'te görünmüyor | **PASS** — madde 8'de gerçek DB'ye karşı doğrulandı |
| 6 | Archived içerik public'te görünmüyor | **PASS** — aynı RLS politikası (`status='published'`), mantıken draft ile aynı, ayrıca doğrulandı |
| 7 | leads public tarafından okunamıyor | **PASS** — `pg_policies`'te leads için hiç politika yok, RLS varsayılan red |
| 8 | tracking_settings token'ı public response'ta görünmüyor | **PASS** — `tracking_public_settings` view sadece ga4/gtm/pixel id döndürüyor, token hiç yok |
| 9 | Başka customer'ın CMS verisi URL üzerinden okunamıyor | **PASS** — `requireCustomerAccess` (Faz 4'te 11/11 test edilmiş) değişmedi, tek customer var zaten |
| 10 | Platform Supabase ile Petra Customer Supabase birbirine karışmıyor | **PASS** — iki ayrı proje, iki ayrı connection factory yolu; Platform DB'de Petra'nın gerçek içeriği yok, sadece `supabase_connection_key='PETRA'` referansı var |

**Ek bulgu (advisory, kapsam dışı düzeltme):** Supabase güvenlik danışmanı (`get_advisors`) şunları işaretledi: `tracking_public_settings` view'inin `SECURITY DEFINER` olması (bu **bilinçli tasarım** — migration 0003'ün kendi yorumunda açıklanmış, taban tablonun RLS'ini bilerek atlıyor, sadece 3 güvenli alanı expose ediyor), birkaç fonksiyonun `search_path` ayarlanmamış olması (Faz 5'ten beri var, davranış değişmedi), ve yardımcı fonksiyonların (`is_platform_admin`, `is_customer_member`) anon/authenticated tarafından RPC ile çağrılabilir olması (sadece boolean dönüyorlar, veri sızıntısı yok). Talimat "mevcut güvenlik modelini değiştirme" dediği için bu fazda **düzeltme yapılmadı**, sadece raporlanıyor — ileride bir hardening fazında ele alınabilir.

## 12) Lint Sonucu

**PASS** — `npm run lint` → 0 hata.

## 13) TypeScript Sonucu

**PASS** — `npx tsc --noEmit` → 0 hata.

## 14) Build Sonucu

**PASS** — `npm run build` → başarılı, 21 route üretildi. Build sırasında gerçek ağ kısıtı hatası (`Host not in allowlist`) oluştu ve bağlantı fabrikası bunu düzgün yakalayıp fallback'e düştü — build yine de başarıyla tamamlandı.

## 15) Kalan İşler / Kullanıcıdan Beklenenler

- **Production/Vercel ortam değişkenleri**: Bu fazda credentials yalnızca sandbox'taki `.env.local`'e yazıldı (git-ignored, hiçbir yere commit/push edilmedi). Gerçek deployment için aynı 6 değişkenin (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL_PETRA`, `SUPABASE_ANON_KEY_PETRA`, `SUPABASE_SERVICE_ROLE_KEY_PETRA`) Vercel proje ayarlarına da eklenmesi gerekiyor.
- **Gerçek uçtan uca canlı HTTP testi**: Bu sandbox'ın ağ kısıtı nedeniyle tam olarak yapılamadı (madde 4). Vercel'e deploy edildiğinde veya kısıtsız bir ortamda `next start` ile tekrar doğrulanması önerilir.
- **Yayınlama**: Şu an Petra CMS'teki her şey `draft` — dashboard üzerinden gerçek Petra kullanıcısı/admin "Yayınla" demeden public sitede hiçbir CMS verisi görünmeyecek (bu bilinçli ve doğru davranış).
- **Domain**: `websites.domain` alanı şu an NULL — gerçek domain (`petramuhendislik.com.tr` veya farklıysa) doğrulanıp Platform DB'ye eklenebilir, ancak domain resolver zaten bu fazda hiçbir route'a bağlanmadı (Faz 6/7 talimatına uygun, hazır ama pasif).
- Projects/Campaigns'in public sayfaya CMS entegrasyonu, medya yükleme altyapısı (Faz 6'da not edilen kapsam dışı bırakmalar) hâlâ bekliyor.
- Advisory güvenlik bulguları (madde 11) — isteğe bağlı, ayrı bir fazda ele alınabilir.

**Kapsam dışı bırakılanlar (talimat gereği, yapılmadı):** Ahsen entegrasyonu, ikinci müşteri, ikinci Supabase projesi, yeni domain bağlama, onboarding otomasyonu, doğrulanmamış Projects/Campaigns/SEO/Mitsubishi bayi/tracking ID-token verisi.

**Git**: Hiçbir commit yapılmadı. `git status` ile değişiklikler kontrol edilebilir; `.env.local` hiçbir zaman staged/tracked değil.

**Hiçbir credential veya secret değeri bu raporda yazılmadı.**
