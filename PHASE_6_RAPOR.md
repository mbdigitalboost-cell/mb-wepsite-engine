# Faz 6 Raporu — Gerçek Petra CMS Bağlantısı ve Dashboard İçerik Yönetimi

## 1) Gerçek Petra Supabase Bağlantı Durumu

**Bu sandbox'ta gerçek bir Petra Supabase projesi ve gerçek credentials YOKTUR.** Hiçbir şekilde uydurulmadı.

- Beklenen ortam değişkenleri: `SUPABASE_URL_PETRA`, `SUPABASE_ANON_KEY_PETRA`, `SUPABASE_SERVICE_ROLE_KEY_PETRA` — bu isimler `.env.local.example` dosyasına belgeleyici olarak eklendi (boş değerlerle, `.env.local` git-ignore'lu, gerçek `.env.local` dosyası da mevcut değil).
- `lib/cms/connection.ts`'deki bağlantı fabrikası, Phase 5'te kurulan genel yapıyı aynen kullanıyor: bir `connectionKey` önce Platform DB'de (`websites.supabase_connection_key`, status=`active`) doğrulanıyor, ancak o zaman ilgili env değişkenleri okunuyor. Petra için bu adım her zaman başarısız oluyor (env yok) → fonksiyon `null` döndürüyor, hiçbir yerde `throw` etmiyor.
- Sonuç: **"Petra Supabase bağlantısı bekleniyor"** — dashboard'daki her CMS sayfası bu durumda `<CmsUnavailableNotice />` bileşenini gösteriyor, public sitede ise adapter'lar sessizce statik fallback'e düşüyor (bkz. madde 9).
- Gerçek bir Petra Supabase projesi oluşturulduğunda yapılması gereken TEK şey: (a) o projede `supabase/customer-template/migrations/0001-0005`'i uygulamak, (b) `supabase/customer-template/seed/petra.sql`'i uygulamak, (c) yukarıdaki 3 env değişkenini doldurmak, (d) Platform DB'de Petra'nın website kaydına `supabase_connection_key = "PETRA"` ve `status = "active"` yazmak. Kod tarafında hiçbir değişiklik gerekmiyor.

## 2) Migration Durumu

Phase 5'in customer-template migration'ları (0001-0005) bu fazda değiştirilmedi — Petra için "apply-ready" zaten öyleydiler (jenerik, Petra'ya özgü hiçbir şey içermiyorlar). Şema kontrolü tekrar yapıldı: 14 tablo (site_settings, pages, hero_sections, services, solutions, projects, campaigns, testimonials, faqs, seo_settings, tracking_settings, media_assets, navigation_items, leads) + `tracking_public_settings` view mevcut, RLS migration 0005'te aktif. Gerçek Petra projesi olmadığı için bu fazda tekrar canlı Postgres'e uygulanmadı ama Phase 5'te zaten uçtan uca test edilmişti; bu faz sadece seed script'i (madde 3) yeni bir local Postgres'e karşı tekrar doğruladı.

## 3) Seed Edilen Veri (Petra)

`supabase/customer-template/seed/petra.sql` — gerçek local Postgres'e karşı test edildi (migration 0001-0005 + seed script uygulanıp psql ile satırlar doğrulandı, sonra test veritabanı silindi).

**Seed edilenler (hepsi `status='draft'`):**
- `site_settings`: company_name="Petra Mühendislik", alternate_name="Petra İklimlendirme", phone="0535 791 11 96", service_area="Onikişubat, Kahramanmaraş" — whatsapp/email/address/working_hours **NULL** (doğrulandı).
- `hero_sections`: mevcut gerçek statik hero metni (page_id NULL).
- `solutions`: 6 satır, slug'lar `lib/data/petra/solutions.ts`'den birebir kopyalandı: `split-klimalar`, `multi-split-klimalar`, `profesyonel-klimalar`, `vrf-sistemleri`, `isi-pompalari`, `sicak-su-sistemleri`.
- `services`: 5 satır (jenerik slug üretimi).
- `faqs`: 6 satır, `lib/data/petra/faqs.ts`'den birebir.
- `navigation_items`: 7 satır, `lib/data/petra/navigation.ts`'den birebir.

**Bilinçli olarak seed EDİLMEYENLER:** projects, campaigns, testimonials, tracking_settings, seo_settings, media_assets, leads — hepsi boş bırakıldı, hiçbir mockup veri yazılmadı.

**⚠️ Önemli uyarı — slug farkı:** Talimat metninizde örnek olarak "isi-pompasi" geçiyor, ancak gerçek statik dosyadaki (`lib/data/petra/solutions.ts`) slug **"isi-pompalari"**. Gerçek route'ları bozmamak için gerçek statik dosyadaki slug kullanıldı — bu bilinçli bir tercih, talimat metnindeki yazım farkından kaynaklanıyor.

**Kesinlikle seed edilmeyen/uydurulmayan bilgiler** (talimatta yasaklanan liste): doğrulanmamış email/adres/WhatsApp/çalışma saatleri, "1000+ müşteri", "500+ proje", "15+ yıl", "50.900 TL", yanlış telefonlar (0850 203 76 44 / 0344 503 00 90 / 0531 193 03 02), "Yetkili Bayi ve Servis" iddiası, herhangi bir gerçek olmayan proje/kampanya.

## 4) Çalışan Dashboard CMS Bölümleri

`/dashboard/customers/[customerId]/` altında:
- `content` (hub) → `content/hero` (tekil hero editörü), `content/[type]` (services/solutions/projects/campaigns/testimonials/faqs için tek jenerik CRUD motoru: liste, oluştur, düzenle, taslak/yayınla/arşivle)
- `media` (medya kütüphanesi — metadata kaydı)
- `seo` (SEO paneli)
- `tracking` (GA4/GTM/Meta Pixel/Meta CAPI paneli)
- `leads` (talep listesi + durum değiştirme)
- `settings` (site ayarları — telefon/adres/renk vb.)

Tüm sayfalar `requireCustomerAccess(customerId)` ile korunuyor (admin: tüm müşteriler, customer: sadece kendi müşterisi) — bu, Phase 4'te zaten test edilmiş aynı yetkilendirme fonksiyonu. Her sayfa/action dosyasında ayrı ayrı doğrulandı (grep ile: content/media/seo/tracking/leads/settings altındaki her page.tsx ve actions.ts dosyası bu fonksiyonu çağırıyor — UI-only gizleme değil, sunucu tarafı zorunlu kontrol).

Petra Supabase bağlantısı olmadığı için bu sayfalar şu an gerçek veri gösteremiyor — her biri `<CmsUnavailableNotice />` gösteriyor ve site çökmüyor.

## 5) Medya Kütüphanesi Durumu

`/dashboard/customers/[customerId]/media` route'u hazır: dosya adı/URL/storage_path/alt metin/tip/genişlik/yükseklik alanları ile kayıt formu, silme, ve "Kullanımda"/"Kullanılmıyor" durumu (site_settings/hero_sections/services/solutions/projects/campaigns/testimonials'daki tüm görsel kolonlarını tarayarak). Beklenen klasör yapısı (`brand/ hero/ solutions/ services/ projects/ campaigns/ banners/`) storage_path validasyonuna gömülü.

**Gerçek dosya yükleme YOK** — bu faz sadece metadata kaydı yapıyor; gerçek görseller siz sağladığınızda bucket/upload altyapısı ayrı bir adım olarak eklenecek. Sahte URL üretilmedi, üretilmeyecek.

## 6) SEO Durumu

`/dashboard/customers/[customerId]/seo` — title/description/canonical/og_image/robots_index/robots_follow, site geneli (page_id NULL), status kolonu yok (config, taslak/yayın kavramı yok). Boş alan `null` olarak saklanıyor; adapter tarafı boş/null gördüğünde mevcut statik SEO fallback'ini kullanmaya devam ediyor — hiçbir SEO metni uydurulmadı.

## 7) Tracking Durumu

`/dashboard/customers/[customerId]/tracking` — GA4/GTM/Meta Pixel ID + Meta CAPI enabled + token. Token güvenliği:
- Input `type="password"`, sunucu tarafında yalnızca service-role bağlantısıyla okunuyor.
- Client component'e SADECE `hasToken: boolean` gönderiliyor — gerçek token değeri hiçbir zaman prop olarak geçmiyor.
- Boş gönderim = "değiştirme"; sadece dolu gönderim üzerine yazıyor.
- Audit log metadata'sında token değeri YOK, sadece `tokenChanged: boolean`.
- Build sonrası client bundle'da grep ile doğrulandı: gerçek token değeri veya SERVICE_ROLE_KEY yok, sadece form alanı adı ("metaCapiToken" string'i, form input `name`/`id` attribute'u — beklenen ve zararsız).

## 8) Leads Durumu

`/dashboard/customers/[customerId]/leads` — isim/telefon/email/mesaj/kaynak/durum/tarih listesi, durum değiştirme (`new`/`contacted`/`closed` — gerçek DB enum'una göre; talimattaki "qualified" örneği enum'da yok, gerçek şemaya sadık kalındı). Public keşif formu (`submit-discovery-request.ts`) mevcut `console.info` davranışını AYNEN koruyor, ayrıca Petra için kontrollü `"PETRA"` connectionKey ile leads tablosuna best-effort insert deniyor (bağlantı yoksa sessizce loglanıp geçiliyor, ziyaretçiye hata gösterilmiyor). Gerçek HTTP testiyle doğrulandı: form gönderimi hâlâ `{"ok":true}` dönüyor, console.info satırı çalışıyor.

## 9) Public Site CMS Entegrasyonu

Ana sayfa (`app/(public)/page.tsx`) artık async ve Hero/Solutions/Testimonials/Faq/SiteSettings(whatsapp) için CMS adapter'larını paralel çağırıyor; `isCmsRow()` ile "gerçek CMS satırı mı yoksa statik fallback mi" ayrımı yapılıyor. Component'lerin API'leri minimal değişti (her biri tek bir opsiyonel prop aldı, varsayılan hâlâ statik import) — component'ler CMS için yeniden yazılmadı.

**Bilinçli kapsam dışı bırakma:** Projects ve Campaigns bu fazda public sayfaya bağlanmadı — CMS tablo şemaları (projects: `category` yok, campaigns: CTA alanları yok) mevcut component'lerin ihtiyaç duyduğu her alanı taşımıyor; eksik alanları uydurmak yerine dürüstçe bu iki bölüm statik veriyle bırakıldı. Sonraki fazda tablo şeması genişletilerek eklenebilir.

## 10) Fallback Durumu

Petra Supabase bağlantısı olmadığından, public sitede şu an fiilen HER ZAMAN statik fallback kullanılıyor — beklenen ve doğru davranış. `npm run build` çıktısında bu açıkça görülüyor: her adapter çağrısı "Platform admin client unavailable" hatasını `console.error` ile logluyor ama build/sayfa render'ı kesintisiz tamamlanıyor, ana sayfa statik (○) olarak üretiliyor. Gerçek HTTP testinde ana sayfa 200 döndü ve statik hero metni ("İklimlendirmede", "Mühendislik", "Petra") aynen mevcut.

## 11) Güvenlik Testleri

| Test | Sonuç |
|---|---|
| Müşteri A kullanıcısı → Müşteri B URL'i → 404 | `requireCustomerAccess` mekanizması (Phase 4'te 11/11 test edilmiş) her yeni CMS sayfası/action'ında aynen kullanılıyor; grep ile tüm content/media/seo/tracking/leads/settings dosyalarının bunu çağırdığı doğrulandı |
| Admin → tüm müşteriler/websiteler → erişim | Aynı mekanizma, `isAdmin` her zaman geçer |
| Anon → taslak → görünmez / yayınlanan → görünür | Migration 0005 RLS (Phase 5'te 9 senaryo ile canlı Postgres'te doğrulanmıştı, değişmedi) |
| Anon → leads insert | Sadece güvenli server action (`submitDiscoveryRequest`) üzerinden, service-role ile; RLS'de anon/authenticated'ın leads'e doğrudan yazma politikası yok |
| Client bundle → SERVICE_ROLE_KEY yok | `npm run build` sonrası `.next/static/chunks` grep edildi — yok |
| Client bundle → META_CAPI_TOKEN değeri yok | Aynı grep — sadece form alanı adı string'i var, gerçek değer yok |
| Dashboard route'ları oturumsuz erişimde çökmüyor | Gerçek HTTP: tüm `/dashboard/...` route'ları 307 (login'e yönlendirme), hiçbiri 500 değil |

## 12) lint / tsc / build

- `npm run lint` → **temiz, 0 hata**
- `npx tsc --noEmit` → **temiz, 0 hata** (bu fazda kritik bir kök neden bulunup düzeltildi — bkz. madde 14)
- `npm run build` → **başarılı**, 21 route üretildi, ana sayfa dahil hiçbir sayfa CMS bağlantısızlığından dolayı çökmedi

## 13) HTTP Testleri (gerçek `next start` + curl)

Public route'lar (hepsi 200): `/`, `/cozumler`, `/cozumler/split-klimalar`, `/cozumler/multi-split-klimalar`, `/cozumler/profesyonel-klimalar`, `/cozumler/vrf-sistemleri`, `/cozumler/isi-pompalari`, `/cozumler/sicak-su-sistemleri`, `/hizmetler`, `/projeler`, `/kampanyalar`, `/hakkimizda`, `/iletisim`, `/login`.

Dashboard route'ları (oturumsuz, hepsi 307 → login, çökme yok): `/dashboard`, `/dashboard/customers`, `/dashboard/customers/[id]`, `/dashboard/customers/[id]/content`, `/dashboard/customers/[id]/content/services`, `/dashboard/customers/[id]/media`, `/dashboard/customers/[id]/seo`, `/dashboard/customers/[id]/tracking`, `/dashboard/customers/[id]/leads`, `/dashboard/customers/[id]/settings`.

Discovery request API: `POST /api/forms/discovery-request` → `{"ok":true}`, 200 — hem `console.info` çalıştı hem de Petra bağlantısı olmadığından leads insert denemesi sessizce loglandı, ziyaretçiye hata yansımadı.

## 14) Değiştirilen/Eklenen Dosyalar (özet)

**Kritik düzeltme:** `lib/cms/customer-types.ts` — tüm `interface X extends Y` tanımları `type X = Y & {...}` olarak değiştirildi. Kök neden: TypeScript'te `interface`, `Record<string, unknown>` gibi index-signature tipine uygun sayılmıyor (interface'ler açık/merge edilebilir olduğu için implicit index signature almıyor); bu da `@supabase/postgrest-js`'in `GenericTable` kısıtını sağlamayı engelliyor ve `.from(...)` çağrılarının (literal string olanlar dahil!) dönüş tipini sessizce `never`'a çöktürüyordu. Bu, Faz 6'nın ~20 dosyasında onlarca "Property does not exist on type 'never'" hatasına yol açmıştı. Düzeltme sonrası neredeyse tüm hatalar kayboldu; kalan birkaçı (dinamik `type: string` parametresi olan jenerik içerik motoru, `seo/actions.ts`'deki bir tip uyuşmazlığı, `lib/validation/content.ts`'de bir Zod tip daraltma hatası, `media/page.tsx`'de dinamik `.select()` string'i) ayrı ayrı düzeltildi.

Yeni dosyalar: `lib/cms/resolve-customer-connection.ts`, `lib/cms/dashboard/require-customer-connection.ts`, `components/cms/cms-unavailable-notice.tsx`, `supabase/customer-template/seed/petra.sql`, `lib/cms/dashboard/content-types.ts`, `lib/validation/content.ts`, `components/navigation/customer-cms-nav.tsx`, `lib/audit/action-labels.ts` (genişletildi), `app/dashboard/customers/[customerId]/content/**` (hub + hero + jenerik `[type]` motoru), `app/dashboard/customers/[customerId]/{settings,seo,tracking,media,leads}/**`, `lib/cms/petra/mappers.ts`.

Değiştirilen dosyalar: `app/(public)/page.tsx` (async + CMS entegrasyonu), `components/sections/{hero,solutions,testimonials,faq}.tsx` (birer opsiyonel prop), `lib/leads/submit-discovery-request.ts` (best-effort Petra insert eklendi), `.env.local.example` (Petra env değişkenleri belgeleyici olarak eklendi).

## 15) Sıradaki Faz İçin Öneri

Petra'nın gerçek Supabase projesi kurulduğunda: (1) migration + seed'i o projeye uygulamak, (2) env değişkenlerini doldurmak, (3) Platform DB'de website kaydını aktifleştirmek — kod tarafında ek değişiklik gerekmez. Ayrıca: gerçek görseller sağlandığında medya yükleme altyapısının (gerçek Supabase Storage bucket bağlantısı) eklenmesi, Projects/Campaigns için CMS şemasının genişletilip public sayfaya bağlanması, ve domain resolver'ın (`lib/cms/resolve-website.ts`, hâlâ hiçbir route'a bağlı değil) gerçek bir ikinci müşteri geldiğinde devreye alınması düşünülebilir. Bu faz kapsamında talep edildiği gibi: yeni müşteri, "Ahsen" entegrasyonu, ikinci Supabase projesi, yeni domain veya onboarding otomasyonu **yapılmadı** — kapsam tamamen Petra'yı uçtan uca sağlamlaştırmaya ayrıldı.

---

**Petra'nın mevcut public sitesi bu faz boyunca hiçbir noktada bozulmadı** — tüm public route'lar hem `npm run build` hem de gerçek `next start` + curl testlerinde önceki fazlardaki gibi 200 döndü, ana sayfanın statik metni değişmedi, CMS bağlantısızlığı her adımda sessizce statik fallback'e düştü.
