# PHASE 11 — PRE-AUDIT: Production Deployment Zinciri

Salt-okunur denetim. Hiçbir dosya değiştirilmedi, hiçbir migration çalıştırılmadı, hiçbir Supabase verisi (Platform veya Petra) değiştirilmedi, git commit/push yapılmadı, GitHub kimlik doğrulaması istenmedi/denenmedi, domain değiştirilmedi. Kontroller: bu bulut ortamındaki yerel kod/git durumu, Vercel API (salt-okunur uçlar), canlı `https://petra-muhendislik.vercel.app` sitesine yapılan GET istekleri, ve Supabase MCP üzerinden iki projeye (Platform + Petra) yapılan salt-okunuz `SELECT`/liste sorguları.

**Önemli bir kapsam notu:** Bu bulut oturumunun kendi `/home/claude/mb-website-engine` çalışma kopyası, GitHub'daki gerçek repo ile **aynı git geçmişine sahip değil** (aşağıda madde 1'de detaylandırıldı) — yani "VS Code'daki proje" ile bu audit'in bakabildiği yerel dosyalar aynı şey değil. Bu yüzden GitHub/Vercel/Supabase tarafı **API üzerinden gerçek/canlı durumu** okuyarak doğrulandı; yalnızca yerel git durumu bu sandbox'a özel.

---

## 1. GitHub Repository ve Branch

- Vercel'in production deployment metadata'sından doğrulandı: repo **`mbdigitalboost-cell/mb-wepsite-engine`** (GitHub, public), branch **`main`**, son push commit SHA `32f6c186c65f98b2649e0f8aeb87e4b9be463c21` ("Faz 9.1-9.5: CMS içerik bağlama, SEO/tracking, medya Storage, leads denetimi").
- **[WARNING]** Bu bulut sandbox'ının kendi yerel git kopyası bu repo'ya **bağlı değil** (`git remote -v` boş) ve HEAD commit'i **farklı bir SHA** (`4961ec4fc0b18b134ce706798bd2e1cd14b53a39`) — commit mesajı aynı ("Faz 9.1-9.5...") ama gerçek GitHub geçmişiyle ortak atası yok. Yani bu sandbox'taki kod, GitHub'daki repo'nun bir "clone"u değil, ayrı bir anlık görüntü. **Sonuç: bu sandbox'tan GitHub'a push yapmaya çalışmak (istenmedi, denenmedi) mevcut geçmişle çakışırdı — VS Code'daki gerçek local repo'nuzdan push/pull yapılmalı.**
- Sandbox'ta yerel olarak Faz 9.6 → Faz 10 arası yapılan tüm değişiklikler (Poppins, 404 sayfası, empty-state, görsel entegrasyonları, `sizes`/OG düzeltmeleri) sadece bu sandbox'ta duruyor, GitHub'a hiç gitmedi — bu beklenen bir durum, hiçbir işlem yapılmadı.

## 2. Vercel'in Doğru Repo/Branch'e Bağlı Olup Olmadığı

- **[PASS]** Vercel projesi `petra-muhendislik` (`prj_fr6R2ymc6gor8QjljRl67GlF76N9`, `mbdigitalboost` team) doğru repo'ya bağlı: son production deployment'ın `githubOrg=mbdigitalboost-cell`, `githubRepo=mb-wepsite-engine`, `githubCommitRef=main` — VS Code'dan bu repo'ya yapılacak bir push, doğru şekilde Vercel'i tetikleyecek.

## 3. Vercel'deki Mevcut Deployment ve Build Durumu

- **[PASS (READY)]** Son production deployment `dpl_EbqS5z9oLUP3gbDTPqS4ZB1nDVBZ` — durum: `READY`, hedef: `production`, build başarılı (30sn), 21 route üretildi, runtime hatası yok (`get_runtime_errors` → temiz).
- **[BLOCKER — production kod olarak GÜNCEL DEĞİL]** Deploy edilen commit, yerel Faz 9.6-10 çalışmasından **öncesi**. Yani şu an canlıda: Poppins fontu yok, markalı 404 sayfası yok, empty-state tutarlılığı yok, entegre edilen görseller (hero/split/VRF/sıcak-su/bakım-servis) yok, `sizes`/OG-Twitter düzeltmeleri yok. Bu bir kod hatası değil — sadece VS Code'daki gerçek repo'da bu commit'ler henüz push edilmemiş/deploy tetiklenmemiş demek. **Push edildiğinde otomatik olarak yeni bir production deployment tetiklenecek** (Git entegrasyonu doğru kurulu, madde 2).
- Build loglarında **kritik bir bulgu** var — bkz. madde 9.

## 4-7. Vercel Environment Variables / Supabase URL-Key'leri

- **[WARNING — doğrudan doğrulanamadı]** Bu MCP araç setinde Vercel environment variable'larını isim/değer olarak listeleyen bir araç yok (bilinen, Faz 9.1'de de tespit edilmiş kısıt). İsim/değerler Vercel panelinden görülebilir.
- Ancak **dolaylı olarak, build logları ve canlı health-check üzerinden** aşağıdakiler kanıtlandı:
  - **[PASS]** `NEXT_PUBLIC_SUPABASE_URL` (Platform) → doğru ve geçerli: `/api/health/supabase` canlıda `{"ok":true,"configured":true,"supabaseUrl":"https://wnedgbbyqpvylfiwkwen.supabase.co/...","error":null}` döndürdü — bu URL Supabase MCP'nin listelediği gerçek Platform projesiyle (`mb-digital-platform`, ref `wnedgbbyqpvylfiwkwen`, `ACTIVE_HEALTHY`) birebir eşleşiyor.
  - **[PASS]** `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Platform) → geçerli: aynı health-check endpoint'i bu key ile Supabase Auth'a gerçek bir round-trip yapıyor ve başarılı dönüyor (`ok:true`).
  - **[BLOCKER]** `SUPABASE_SERVICE_ROLE_KEY` (Platform) → **geçersiz**. Production build loglarında (deployment `dpl_EbqS5z9oLUP3gbDTPqS4ZB1nDVBZ`, satır satır tekrarlanan) şu hata var: `[cms/connection] Platform lookup failed for connectionKey: PETRA Invalid API key`. Bu hata, `lib/cms/connection.ts`'in `resolveActiveConnectionKey()` fonksiyonunun kullandığı `createSupabaseAdminClient()` (Platform `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` çifti) çağrısından geliyor. URL doğru olduğuna göre (yukarıdaki PASS), sorun kesinlikle **service role key değerinin** — muhtemelen eski/rotate edilmiş ya da yanlış kopyalanmış bir değer olarak — Vercel'de yanlış girilmiş olması. Gerçek değeri bu raporda yazılmadı.

## 8. Platform Supabase Bağlantısı

- **[PASS]** Platform Supabase projesi (`wnedgbbyqpvylfiwkwen`, `mb-digital-platform`, `eu-west-3`→ aslında `eu-west-1`, Postgres 17.6, `ACTIVE_HEALTHY`) gerçek ve erişilebilir (Supabase MCP ile doğrudan sorgulandı).
- **[PASS]** `public.websites` tablosunda Petra kaydı mevcut ve doğru: `supabase_connection_key = 'PETRA'`, `status = 'active'`, `domain = null` (henüz domain bağlanmadığı için beklenen), müşteri: `Petra Mühendislik` / slug `petra-muhendislik`.
- **[PASS]** Platform migration'ları (0001-0004) canlı projede uygulanmış ve yerel `supabase/platform/migrations/` ile birebir eşleşiyor — eksik/fazla migration yok.
- **[BLOCKER]** Ama madde 4-7'de açıklandığı gibi, bu doğru/aktif kayda rağmen Vercel'deki service role key geçersiz olduğu için **production hiçbir zaman bu kaydı okuyamıyor** — lookup, veriye ulaşmadan "Invalid API key" ile en baştan reddediliyor.

## 9. Petra Supabase Production Bağlantısı

- **[PASS — proje gerçek ve sağlıklı]** Petra'nın kendi ayrı Supabase projesi (`wahbjfhvizalenyxjywb`, "petra mühendislik", `eu-west-3`, Postgres 17.6, `ACTIVE_HEALTHY`) **gerçekten var ve çalışıyor** — Faz 8'de kurulmuş.
- **[PASS]** Customer-template migration'ları (0001-0007) canlı projede uygulanmış, yerel `supabase/customer-template/migrations/` ile birebir eşleşiyor (0006 `media_storage_bucket`, 0007 `projects_campaigns_solutions_fields` dahil) — eksik migration yok, bu fazda migration çalıştırmaya gerek yok.
- **[BLOCKER — pratikte erişilemiyor]** Ancak Petra projesine erişim, önce Platform DB'deki `websites` kaydının doğrulanmasından geçiyor (madde 8) — o adım "Invalid API key" ile şu an her zaman başarısız olduğu için, kod hiçbir zaman `SUPABASE_URL_PETRA` / `SUPABASE_SERVICE_ROLE_KEY_PETRA` değerlerini okumaya bile sıra gelmiyor. Yani **Petra projesinin kendisi sağlıklı olsa da, production ona hiç ulaşamıyor.**

## 10-11. Production'da CMS Verisi Okunuyor mu / Public Site Supabase'e Bağlı mı

- **[BLOCKER]** Hayır. Madde 4-9'daki zincir kırık olduğu için, `getHero`/`getSolutions`/`getTestimonials`/`getFaqs`/`getSiteSettings` gibi tüm CMS adaptörleri her zaman `null`/boş dönüyor ve site **%100 statik fallback veriyle** çalışıyor (`lib/data/petra/*`). Bu, Faz 6-9'da CMS'e girilmiş herhangi bir içerik (varsa) production'da hiç görünmüyor demek. Canlı ana sayfa testinde H1 metni statik veriyle birebir eşleşti — bu da bunu doğruluyor.
- Bu, sitenin çökmesine sebep OLMUYOR (mimari tam da bunun için "fail-soft" tasarlanmış) — sadece "CMS'ten mi statik veriden mi geliyor" ayrımını üretim ortamında şu an anlamsız kılıyor.

## 12. Lead Formunun Production'da `leads` Tablosuna Yazması

- **[BLOCKER — doğrulandı, yazmıyor]** `submitDiscoveryRequest()` (`lib/leads/submit-discovery-request.ts`) leads insert'inden önce `getCustomerSupabaseClient("PETRA")` çağırıyor — bu da aynı kırık `resolveActiveConnectionKey()` zincirinden geçiyor (madde 8-9). Sonuç: `client === null`, insert hiç denenmiyor bile.
- Petra Supabase projesindeki `leads` tablosu şu an **0 satır** (`count(*) = 0`, `max(created_at) = null`) — bu, formun bugüne kadar hiç gerçek bir kayıt yazamadığının doğrudan kanıtı (test verisi eklenmedi, sadece sayıldı).
- Kullanıcı formu doldurup gönderdiğinde arayüzde "başarılı" mesajı görüyor (bilinçli fail-soft tasarım) ama **lead hiçbir yere kaydolmuyor** — sadece Vercel'in kendi sunucu loglarına (`console.info`) düşüyor, o da sadece kısa süre (Vercel plan'a göre 1 saat–3 gün) saklanıyor.

## 13. Storage / Medya Bağlantısı

- **[PASS (altyapı) / kullanılmıyor]** Petra projesinde Storage bucket'ı mevcut (`storage.buckets`: 1 satır, Faz 9.4'te kurulmuş), `storage.objects`: 0 satır — henüz hiç medya yüklenmemiş (beklenen, gerçek görsel yok). Bu altyapı da aynı "Invalid API key" zincirine bağımlı olduğu için, dashboard'dan bir görsel yüklenmeye çalışılırsa o da şu an başarısız olur.

## 14. SEO / Tracking Production Durumu

- **[PASS]** `robots.ts`, `sitemap.ts`, statik `title`/`description`/`canonical`/`OG` metadata production build'de doğru üretiliyor (bunlar CMS'e bağımlı değil, kod içinde statik).
- **[WARNING]** `TrackingScripts` (GTM/GA4/Meta Pixel) CMS'ten (`tracking_public_settings` view) ID okumaya çalışıyor — madde 10-11'deki kırık zincir yüzünden bu da her zaman boş dönüyor, sadece `NEXT_PUBLIC_GTM_ID`/`NEXT_PUBLIC_GA4_ID`/`NEXT_PUBLIC_META_PIXEL_ID` env değişkenleri (varsa) devreye girer. Bu değişkenlerin Vercel'de dolu olup olmadığı bu audit'ten görülemedi (madde 4-7'deki araç kısıtı).
- Faz 10'da eklenen sayfa-bazlı OG/Twitter varsayılanları ve LocalBusiness JSON-LD henüz deploy edilmedi (madde 3).

## 15. Domain / Cloudflare Bağlantısı

- **[PASS (bilgi) — bağlı değil, beklenen]** Vercel projesinde sadece otomatik `*.vercel.app` domain'leri var (`petra-muhendislik.vercel.app` ve 2 varyant); özel bir domain eklenmemiş. Bu ortamda Cloudflare için bağlı bir MCP aracı yok, dolayısıyla DNS tarafı hiç kontrol edilemedi — zaten kullanıcı henüz gerçek bir domain onaylamadı, bu beklenen bir durum, sorun değil.
- **[WARNING (bilgi, Faz 8'den beri bilinen)]** Vercel Authentication (SSO koruması) proje ayarlarında `all_except_custom_domains` olarak aktif — yani gerçek bir custom domain eklendiğinde bu koruma o domain için otomatik kalkacak. Bugün empirik olarak `petra-muhendislik.vercel.app` şifresiz/girişsiz erişilebilir durumda (bu audit'te canlı GET ile doğrulandı) — bir sorun yok, sadece Cloudflare/domain bağlama sırasında hatırlanması gereken bir davranış.

## 16. Build Sırasında Fallback / Bağlantı Problemi

- **[BLOCKER — doğrulandı]** Evet: build logları her sayfa üretiminde `[cms/connection] Platform lookup failed for connectionKey: PETRA Invalid API key` hatasını tekrar tekrar basıyor (21 route'un static generation adımında). Bu, madde 4-7'deki service role key sorununun build zamanındaki somut kanıtı. Build yine de başarıyla tamamlanıyor çünkü mimari bunu "fail-soft" olarak yutuyor — ama build logu, sorunun varlığını kesin olarak gösteriyor.

---

## ÖZET

### PASS
- Vercel projesi doğru GitHub repo/branch'e bağlı, Git entegrasyonu sağlıklı.
- Son production deployment READY, build hatasız tamamlanıyor, runtime hata kaydı yok.
- Platform Supabase projesi gerçek, sağlıklı, migration'ları eksiksiz; Petra website kaydı doğru (`PETRA`, `active`).
- Petra'nın kendi ayrı Supabase projesi gerçek, sağlıklı, migration'ları (0001-0007) eksiksiz uygulanmış.
- `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Platform) Vercel'de doğru ve çalışıyor.
- SEO temel altyapısı (robots/sitemap/statik metadata) production'da doğru çalışıyor.
- Site herhangi bir hata sayfası göstermiyor, tamamen ayakta (fail-soft tasarım işini yapıyor).
- Storage/medya altyapısı (bucket) kurulu, henüz kullanılmadığı için veri kaybı riski yok.
- Domain/Cloudflare hiç bağlanmamış — bu beklenen, hiçbir şey uydurulmadı.

### WARNING
- Bu bulut sandbox'ının yerel git geçmişi GitHub'daki gerçek repo ile ortak atası yok — push işlemi VS Code'daki gerçek local repo'dan yapılmalı.
- Vercel environment variable'larını isim/değer olarak listeleyen bir araç yok — SUPABASE_SERVICE_ROLE_KEY dışındaki değişkenlerin (GTM/GA4/Pixel ID'leri, META_CAPI, SUPABASE_*_PETRA) Vercel'deki gerçek durumu bu audit'ten doğrudan görülemedi.
- Tracking (GTM/GA4/Pixel) production'da CMS'ten okunamıyor (aynı kırık zincir), sadece env fallback'i varsa çalışır.
- Vercel Authentication (`all_except_custom_domains`) — custom domain eklendiğinde davranış değişecek, o an hatırlanmalı.
- Petra Supabase projesinde `tracking_public_settings` view'ı Supabase linter'da ERROR seviyeli "Security Definer View" olarak işaretli — Faz 9'da bilinçli tasarım, ama Supabase panelinde bir uyarı olarak görünecektir.

### BLOCKER
1. **`SUPABASE_SERVICE_ROLE_KEY` (Platform) Vercel'de geçersiz** — "Invalid API key" hatası, production build loglarında kanıtlı. Bu tek değişken, aşağıdaki tüm zincirin kök nedeni.
2. **Production, hiçbir CMS verisini okuyamıyor** — site %100 statik fallback ile çalışıyor (site çökmüyor, ama CMS'ten hiçbir şey yansımıyor).
3. **Lead formu production'da hiçbir kaydı `leads` tablosuna yazamıyor** — Petra projesinde `leads` tablosu doğrulandı: 0 satır. Kullanıcıya "başarılı" gösteriliyor ama veri kayboluyor.
4. **Production kodu güncel değil** — deploy edilmiş commit, yerel Faz 9.6-10 çalışmasından (Poppins, 404, empty-state, görseller, SEO düzeltmeleri) önce. Bunlar henüz canlıda değil.

**Not:** Bu dört BLOCKER'ın kök nedeni **tek bir yanlış/eski Vercel environment variable** (`SUPABASE_SERVICE_ROLE_KEY`, Platform) — Petra Supabase projesinin kendisi veya kod mimarisi ile ilgili bir sorun değil.

---

## PRODUCTION'DA YAPILMASI GEREKENLER

1. **Vercel Dashboard → `petra-muhendislik` → Settings → Environment Variables**: `SUPABASE_SERVICE_ROLE_KEY` değerini kontrol edin. Supabase Dashboard → `mb-digital-platform` projesi → Project Settings → API → **service_role** key'ini alıp (secret, dikkatli kopyalayın) Vercel'deki değeri bununla **güncelleyin** (muhtemelen eski/yanlış yapıştırılmış). Production (ve Preview) ortamı için kaydedin.
2. Aynı ekranda `SUPABASE_URL_PETRA`, `SUPABASE_ANON_KEY_PETRA`, `SUPABASE_SERVICE_ROLE_KEY_PETRA` değerlerinin de doğru Petra projesinden (`wahbjfhvizalenyxjywb`) alınıp doğru girildiğini teyit edin — bu audit'ten bunların Vercel'deki değeri görülemedi, sadece Platform tarafındaki hata kanıtlanabildi.
3. Env değişkeni güncellendikten sonra **Vercel'de "Redeploy" tetikleyin** (env değişikliği otomatik yeni deploy başlatmaz) — sonra build loglarında "Invalid API key" satırının kaybolduğunu doğrulayın.
4. VS Code'daki gerçek local repo'dan Faz 9.6-10 commit'lerini `main` branch'ine push edin — bu otomatik yeni bir production deployment tetikleyecek (Git entegrasyonu zaten doğru kurulu, madde 2).
5. Redeploy sonrası: `/api/health/supabase` tekrar kontrol edilmeli (zaten PASS), ayrıca gerçek bir CMS alanı (ör. bir `hero_sections` satırı) `published` yapılıp anasayfada göründüğü doğrulanmalı — CMS'in gerçekten uçtan uca çalıştığını kanıtlayacak ilk somut test bu olur.
6. Lead formu, gerçek bir kullanıcı tarafından production'da bir kez test edilip Petra `leads` tablosunda satır oluştuğu (Supabase Dashboard'dan) teyit edilmeli.

## KULLANICIDAN BEKLENENLER

- **`SUPABASE_SERVICE_ROLE_KEY` (Platform) için doğru/güncel değer** — Supabase Dashboard'dan alınmalı, bu raporda yazılmadı.
- Vercel panelinden **mevcut env değişkenlerinin tam listesinin** teyidi (bu audit araçlarla göremedi) — özellikle `SUPABASE_URL_PETRA` / `SUPABASE_ANON_KEY_PETRA` / `SUPABASE_SERVICE_ROLE_KEY_PETRA` üçlüsünün gerçekten girilip girilmediği.
- VS Code'daki gerçek local repo'nun güncel durumu — bu sandbox'taki Faz 9.6-10 değişikliklerinin GitHub'a nasıl taşınacağına (VS Code'dan push, ya da bu değişikliklerin dosya olarak size iletilip sizin commit etmeniz) karar verilmeli.
- Phase 10'da listelenen diğer eksikler (gerçek adres/e-posta/çalışma saatleri/WhatsApp, gerçek logo, gerçek yüksek çözünürlüklü fotoğraflar, GTM/GA4/Pixel gerçek ID'leri, domain) hâlâ geçerli, bu fazda tekrar doğrulandı, değişmedi.

---

## Phase 10'daki Tespitin Bugünkü Durumu

> Phase 10 raporu: *"gerçek Petra Supabase projesi henüz bağlı değil / form hiçbir yere kayıt yazmıyor"*

**Kesin sonuç: Kısmen güncel değildi, kısmen hâlâ doğru.**

- **"Petra Supabase projesi henüz bağlı değil" — artık DOĞRU DEĞİL.** Petra'nın kendi ayrı Supabase projesi (`wahbjfhvizalenyxjywb`) Faz 8'de zaten kurulmuş, migration'ları eksiksiz uygulanmış, `ACTIVE_HEALTHY` durumda. Phase 10 raporu bunu muhtemelen kod içindeki eski bir yorum satırından (`lib/leads/submit-discovery-request.ts`: "no real Petra Supabase project exists yet") referans alarak yazmış — o yorum artık güncel değil, gerçek durumu yansıtmıyor.
- **"Form hiçbir yere kayıt yazmıyor" — bugün de DOĞRU, ama sebebi farklı.** Sorun "proje yok" değil; Platform Supabase'deki `SUPABASE_SERVICE_ROLE_KEY` Vercel'de geçersiz olduğu için, kod Petra projesine hiç ulaşamadan en baştaki doğrulama adımında (`resolveActiveConnectionKey`) başarısız oluyor. Sonuç kullanıcı için aynı ("form kayıt yazmıyor") ama kök neden bambaşka ve **tek bir env değişkeni düzeltmesiyle** (yukarıdaki madde 1) çözülebilir — yeni bir Supabase projesi kurmaya gerek yok.

---

*Kod veya migration değişikliği yapılmadı. Supabase verisi değiştirilmedi (sadece `SELECT`/liste sorguları). Test verisi eklenmedi. GitHub repo'ya dokunulmadı, kimlik doğrulama istenmedi. Domain değiştirilmedi. Secret değerleri bu raporda yazılmadı.*
