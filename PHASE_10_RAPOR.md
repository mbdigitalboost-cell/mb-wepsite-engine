# PHASE 10 — Production Readiness & Final QA Raporu

Petra Mühendislik web sitesinin production'a çıkmadan önceki genel denetimi. Bu fazda yeni özellik geliştirilmedi; mevcut kod, SEO, performans, güvenlik, environment değişkenleri, Supabase/migration durumu ve form/leads akışı denetlendi, yalnızca gerçekten gerekli olan düzeltmeler yapıldı. Git commit/push yapılmadı, Supabase migration oluşturulmadı, domain/gerçek işletme bilgisi uydurulmadı.

Denetim beş ayrı alanda (SEO+Analytics, Performance, Security+Env, Public Site QA+Mobile+Accessibility, Form/Leads+Supabase) yapıldı; sonuçlar aşağıda birleştirildi.

---

## 1. Düzeltilenler

Bu fazda kod tarafında yapılan somut değişiklikler:

- **`sizes` prop eksikliği** — `fill` modunda kullanılan ve `sizes` belirtmeyen 5 görsel (Solutions kartları, Projects kartları, Campaigns banner'ı, Mitsubishi bölümü, `/cozumler/[slug]` detay banner'ı) düzeltildi. Önceden Next.js varsayılan olarak `100vw` genişliğinde görsel indiriyordu; artık grid düzenine göre doğru boyut (`33vw`/`50vw`/`100vw` kırılımları) indiriliyor — mobilde ve masaüstünde gereksiz büyük görsel indirmenin önüne geçildi. Dosyalar: `components/sections/solutions.tsx`, `components/sections/projects.tsx`, `components/sections/campaigns.tsx`, `components/sections/mitsubishi-section.tsx`, `app/(public)/cozumler/[slug]/page.tsx`.
- **Open Graph / Twitter Card varsayılanları eklendi** — `app/(public)/layout.tsx`'e site geneli `openGraph` (siteName, locale: tr_TR, type: website) ve `twitter` (card: summary) varsayılanı eklendi. Daha önce sadece ana sayfanın kendi OG/Twitter meta'sı vardı; `/hizmetler`, `/projeler`, `/kampanyalar`, `/hakkımızda`, `/iletişim`, `/cozumler` gibi kendi OG tanımlamayan sayfalar artık bu varsayılanı miras alıyor (paylaşıldıklarında boş/generic önizleme yerine marka adı+açıklama görünüyor). Homepage'e ayrıca kendi `twitter` alanı eklendi. Hiçbir uydurma görsel/metin eklenmedi — zaten onaylı başlık/açıklama metninin tekrarı.
- **LocalBusiness (HVACBusiness) JSON-LD ana sayfaya bağlandı** — `lib/seo/structured-data.ts`'teki `petraLocalBusinessStructuredData()` fonksiyonu daha önce yazılmış ama hiçbir sayfada çağrılmıyordu. Artık `app/(public)/page.tsx`'te çağrılıyor; ancak fonksiyon adres onaylanmadığı sürece kendi içinde `null` döndürüyor (kod: `if (!petraContactInfo.address || !petraContactInfo.phone) return null`), yani şu an hiçbir şey render etmiyor — test edildi, doğrulandı. Gerçek adres onaylandığında kod değişikliği gerekmeden otomatik aktifleşecek.

Test edilen ve doğrulanan, ama kod değişikliği gerektirmeyen konular "PASS" kontroller altında listelendi.

---

## 2. PASS Kontroller

**Public Site QA**
- Header/mobil hamburger menü: gerçek `<button>`, `aria-expanded`, `aria-controls`, `aria-label`, `role="dialog" aria-modal`, Escape ile kapanıyor, scroll kilitli.
- Footer: `tel:`, `mailto:`, WhatsApp linkleri doğru protokollerle, `target="_blank" rel="noopener noreferrer"`.
- CTA'lar: hepsi gerçek `<a>`/`<button>` (div+onClick yok).
- Görsellerde anlamlı `alt` metni var, boş `alt=""` yok.
- 404 sayfası header/footer/CTA ile tam render oluyor, responsive.
- Her sayfada tek `<h1>` var (paylaşılan `PageHeader`/`Hero`/`Solutions` bileşenleri üzerinden — statik grep route dosyasında görünmese de doğrulandı).

**Mobile / Overflow**
- `app/` ve `components/` içinde mobilde taşmaya sebep olabilecek sabit piksel genişlik (`w-[NNpx]`) veya negatif margin bulunamadı.
- Büyük başlık font boyutları (hero, 404) her yerde mobile-first `sm:`/`md:`/`lg:` kırılımlarıyla ölçekleniyor.
- Breakpoint sırası tutarlı (mobile-first).

**Accessibility**
- İletişim formu: `<label htmlFor>`, `aria-invalid`, `aria-describedby`, hata için `role="alert"`, başarı için `role="status"`.
- Tüm interaktif elemanlarda `focus-visible` stili tanımlı.

**SEO**
- Tüm route'larda title/description dolu ve marka-spesifik.
- `alternates.canonical` her sayfada set.
- `app/robots.ts` doğru (`/dashboard` disallow, sitemap referansı).
- `app/sitemap.ts` statik + dinamik (`/cozumler/[slug]`, CMS-first) route'ları kapsıyor.
- 404 sayfası `robots: { index: false, follow: true }` — canlı testte doğrulandı.
- JSON-LD: FAQPage ve BreadcrumbList doğru render ediliyor.

**Performance**
- Hero görselinde `priority` var (LCP optimizasyonu).
- Görsellerde anlamlı `alt` var.
- Gereksiz `"use client"` kullanımı yok — her client component'in somut bir sebebi var (hook/state, analytics click handler, IntersectionObserver).
- `package.json` bağımlılıkları temiz, ağır/gereksiz kütüphane yok.
- Font dosyalarında `font-display: swap` var, kullanılmayan ağırlık yüklenmiyor.
- `public/images/petra/` toplam 344K, en büyük dosya 193KB — hiçbiri 500KB üzerinde değil.

**Security**
- `SUPABASE_SERVICE_ROLE_KEY` (platform ve müşteri) sadece `server-only` işaretli dosyalarda okunuyor, `NEXT_PUBLIC_` öneki yok, `readServerEnv()` tarayıcıda çağrılırsa hata fırlatıyor.
- `/dashboard/*` tek merkezden (`requireSession()`) korunuyor; müşteri bazlı yetkilendirme her server action'da `requireCustomerAccess()`/`requireAdmin()` ile yapılıyor.
- RLS: platform ve müşteri veritabanında `SECURITY DEFINER` fonksiyonlarla, `leads`/`tracking_settings` tabanı anon/authenticated için tamamen kapalı, içerik tabloları sadece `status = 'published'` satırları anon'a açık.
- Leads endpoint'i zod ile server-side doğrulanıyor, honeypot bot koruması var, parametreli insert (SQL injection riski yok).
- Upload endpoint'i MIME/boyut kontrolü yapıyor, dosya adı sanitize ediliyor.
- Meta CAPI token'ı (`META_CAPI_ACCESS_TOKEN`) server-only, hiçbir client/dashboard bundle'ına sızmıyor — dashboard sadece `hasToken` boolean'ı gösteriyor.
- `.env.local` `.gitignore`'da, hiçbir gerçek env dosyası hiç commit edilmemiş (`git ls-files` ile doğrulandı).

**Form/Leads**
- Client + server çift doğrulama (zod), honeypot, `role="alert"`/`role="status"` geri bildirimi.
- Fail-soft: server hatası olsa bile kullanıcıya jenerik başarı/hata state'i gösteriliyor, sayfa çökmüyor.
- Dashboard'daki lead listesi `requireCustomerAccess` ile korunuyor.

**Supabase/Migrations**
- Platform ve müşteri migration'ları net ayrılmış, kod ile senkron — yeni bir migration'a ihtiyaç yok.
- Draft/published ayrımı RLS'de tutarlı korunuyor.

**Kod Kalitesi**
- `npx tsc --noEmit` → temiz.
- `npx eslint .` → temiz.
- `npm run build` → başarılı, 21 route (8 public route + `/404`, `/api/*`, `/dashboard/*`, `/login`, `/sitemap.xml`, `/robots.txt`).
- Canlı sunucu testinde 8 route + 404: hepsi doğru HTTP kodu döndü (`/`, `/cozumler`, `/cozumler/split-klimalar`, `/hizmetler`, `/projeler`, `/kampanyalar`, `/hakkimizda`, `/iletisim` → 200; olmayan slug → 404).

---

## 3. WARNING'ler (production'ı engellemez, bilinçli not edildi)

1. **Favicon tek format** — sadece `app/favicon.ico` var; `app/icon.*`/`apple-icon.*` (PNG/SVG) yok. Bunu **düzeltmedim** çünkü gerçek Petra logosu (`lib/data/petra/brand-assets.ts`'te tüm alanlar `null`) henüz sağlanmadı — uydurma bir logo/ikon üretmek, projenin "gerçek işletme görseli uydurma" kuralına aykırı olurdu. Gerçek logo geldiğinde bundan üretilecek.
2. **`og:image` yok** — CMS'ten `seo.og_image` gelmediği sürece sosyal paylaşım önizlemesinde görsel yok (sadece başlık/açıklama). Aynı sebeple (gerçek görsel yok) şimdilik düzeltilmedi.
3. **`petraLocalBusinessStructuredData` şu an "sessizce" pasif** — adres onaylanana kadar bilinçli olarak `null` dönüyor (bkz. madde 1), bu bir hata değil, tasarım.
4. **`META_CAPI_ACCESS_TOKEN` tanımlı ama fiilen kullanılmıyor** — env değişkeni ve dashboard'da saklama mekanizması hazır, ama gerçek bir CAPI gönderim implementasyonu (server action/route) henüz yazılmamış. Güvenlik sorunu değil, eksik özellik.
5. **Lead PII console.log'a yazılıyor** (`lib/leads/submit-discovery-request.ts`) — sandbox'ta kabul edilebilir, gerçek production'da log aggregation/retention politikası olmadan PII loglamak riskli; Vercel'e geçmeden önce ya kaldırılmalı ya da PII maskelenmeli.
6. **`next.config.ts` boş stub** — `images.remotePatterns` tanımlı değil. Şu an sorun değil (tüm görseller local), ama dashboard/media modülü Supabase Storage'a görsel yüklemeyi destekliyor; ileride müşteri tarafından yüklenen bir görsel public sayfada `next/image` ile gösterilirse `remotePatterns` eklenmesi gerekecek.
7. **`lib/cms/resolve-website.ts` kullanılmayan kod** — kendi yorumunda "Phase 5 kapsamı" olarak işaretli, henüz hiçbir route'a bağlı değil; canlı bir routing'e bağlanmadan önce ayrı bir güvenlik gözden geçirmesi öneriliyor.
8. **Mobil klavye focus-trap testi yapılamadı** — mobil menü `role="dialog"` ve scroll-lock ile doğru kurulmuş görünüyor, ama gerçek Tab-tuşu davranışı bu sandbox'ta canlı olarak test edilemedi (bkz. madde 6, Mobile QA açıklaması).

---

## 4. Production BLOCKER'ları

**Kritik/engelleyici bir kod, güvenlik veya mimari sorun bulunamadı.** Denetlenen 5 alanda (SEO/Analytics, Performance, Security/Env, Public-Mobile-Accessibility, Form/Leads/Supabase) tek bir BLOCKER işaretlenmedi.

Ancak site'nin *gerçek* production'a çıkması için aşağıdaki maddeler **BLOCKER niteliğinde deployment/veri eksikleri** (kod eksikliği değil):

- Gerçek Petra Supabase projesi henüz bağlı değil — `submit-discovery-request.ts` şu an `client === null` durumunda sessizce hiçbir insert yapmıyor. Gerçek bir Supabase projesi kurulup env değişkenleri (`SUPABASE_URL_PETRA`, `SUPABASE_SERVICE_ROLE_KEY_PETRA` vb.) Vercel'e eklenmeden ve migration seti bu projeye `apply` edilmeden, iletişim formu **gerçekte hiçbir lead kaydetmez**.
- Gerçek işletme bilgileri (adres, e-posta, çalışma saatleri, WhatsApp numarası) hâlâ onaylanmamış — bu alanlar boş kaldığı sürece footer/iletişim sayfası ve LocalBusiness JSON-LD eksik kalmaya devam edecek (bu bilinçli bir tasarım, veri eksikliği).
- Gerçek Petra logosu yok — favicon/OG image bu yüzden eksik.

Bunlar kod değişikliğiyle çözülemez; kullanıcıdan/işletmeden gelecek gerçek veriye bağlıdır (bkz. madde 5).

---

## 5. Kullanıcıdan Beklenen Bilgiler

1. **Gerçek Petra Supabase projesi** — proje URL'si, anon key, service role key (üretim ortamı için).
2. **Onaylı adres** (Yusuflar Mahallesi mi, Şekerdere Caddesi mi Bulvarı mı, No:29/A — company reference doc'ta çelişkili format olduğu not edilmişti).
3. **Onaylı WhatsApp numarası** (Instagram'daki telefon numarasıyla aynı olduğu varsayılamaz).
4. **E-posta adresi ve çalışma saatleri.**
5. **Gerçek Petra logosu** (SVG/PNG, açık ve koyu zemin versiyonları) — favicon/OG image/header/footer için.
6. **Gerçek yüksek çözünürlüklü fotoğraflar** — hero, split klima, VRF, sıcak su, bakım-servis görselleri şu an moodboard'dan kırpılmış düşük çözünürlüklü (~500×200px) geçici dosyalar; Multi-Split, Isı Pompaları, Profesyonel Klimalar hâlâ ikon+gradyan placeholder.
7. **Doğrulanmış web sitesi domaini** (Instagram'daki görünen domain belirsiz/homograph riski taşıyor — "form-mhiklima.com" mu yoksa Cyrillic karakter içeren bir varyant mı, netleştirilmeli).
8. **Google Analytics / GTM / Meta Pixel ID'leri** (gerçek değerler — şu an env değişkeni/CMS'ten okunacak şekilde kodlandı ama gerçek ID girilmedi).
9. **Meta CAPI access token'ı** (varsa) — kod hazır, gönderim implementasyonu henüz yazılmadı, ihtiyaç teyit edilmeli.

---

## 6. Domain Bağlama İçin Gerekenler

- Şu an production URL olarak **mevcut Vercel adresi** (`*.vercel.app`) kullanılmalı — hiçbir gerçek domain uydurulmadı.
- Gerçek domain (madde 5.7'de bahsedilen, netleştirildikten sonra) satın alınıp/mevcutsa DNS kaydı Vercel'e yönlendirilmeli (Vercel Dashboard → Domains → Add).
- Domain bağlandıktan sonra `NEXT_PUBLIC_SITE_URL` (bkz. `lib/config/env.ts`) production env değişkeni gerçek domaine güncellenmeli — `metadataBase`, sitemap, canonical URL'ler bu değere bağlı.
- SSL Vercel tarafından otomatik sağlanıyor, ekstra ayar gerekmiyor.

---

## 7. Gerçek Görsel Eksikleri

(Faz 9.9 raporunda da belirtilmişti, hâlâ geçerli — bu fazda görsel üretilmedi/değiştirilmedi, sadece kod tarafındaki kullanımı optimize edildi.)

- Hero, split klima, VRF, sıcak su, bakım-servis: şu an moodboard'dan kırpılmış düşük çözünürlüklü (~500×200px) geçici görseller — gerçek yüksek çözünürlüklü fotoğrafla değiştirilmeli.
- Multi-Split Sistemler, Isı Pompaları, Profesyonel Klimalar: bu ortamda görsel üretme aracı olmadığı için hâlâ ikon+gradyan placeholder (gerçek fotoğraf gibi sunulmuyor).
- Mühendislik/süreç bölümü: ikon rozetleriyle tamamlandı, gerçek saha fotoğrafı yok.
- Gerçek logo yok → favicon/OG image eksik.
- Kod tarafı bu görseller gelince **sadece asset path değiştirerek** kullanılabilecek şekilde hazır (CMS-first + local fallback, `sizes` artık doğru, `fill`/`object-cover` yapısı korunuyor).

---

## 8. Sonraki Faz Önerisi

Kullanıcının kendi planı doğrultusunda: **Faz 10.1 — Görsel Cilalama (Visual Polish)**. Artık veritabanı/kod mimarisi değil; spacing, hero, kartlar, mobil görünüm, animasyonlar, ikonlar ve (sağlandığında) gerçek görseller üzerinde çalışılabilir. Bu fazda mimari/güvenlik tarafında bir BLOCKER çıkmadığı için bu geçiş uygun görünüyor — ancak madde 5'teki gerçek veriler (Supabase projesi, adres/iletişim bilgisi, logo, gerçek fotoğraflar) olmadan site hâlâ gerçek anlamda canlıya alınamaz.

**Standing kural gereği:** Bu faz onayınız olmadan bir sonraki faza geçilmeyecek.

---

*Not: Git commit/push yapılmadı, Supabase migration çalıştırılmadı, gerçek işletme/domain/marka bilgisi uydurulmadı, secret değerleri bu raporda yazılmadı.*
