# PHASE 9.2 RAPORU — Public Sayfaların CMS'e Bağlanması

Faz 9.1 audit'inde tespit edilen dört sayfayı (`/cozumler`, `/hizmetler`, `/projeler`, `/kampanyalar` — liste ve `/cozumler/[slug]` detay dahil) CMS adapter'larına bağladım. Mevcut mimari (Platform Supabase, Petra Customer Supabase, RLS, migration'lar) hiç değiştirilmedi/yeniden kurulmadı; sadece bu 4-5 route dosyası + 1 mapper dosyası + 2 component dosyası + 1 tip dosyası düzenlendi.

## 0) Önce yapılan inceleme

- `supabase/customer-template/migrations/0002_content_tables.sql` yeniden okundu: `services`/`solutions`/`projects`/`campaigns` dört tablo da aynı ortak şemayı paylaşıyor — `title, slug, description, image, sort_order, status, created_at, updated_at`. Ekstra alan yok.
- `lib/cms/customer-types.ts`, `lib/cms/adapters/{services,projects,campaigns,solutions}.ts`, `lib/cms/adapters/shared.ts` (`fetchPublishedList` — server-side `status='published'` filtresi + müşteri DB'sindeki RLS ile çifte koruma) yeniden okundu — hepsi Faz 5'te doğru yazılmış, hiç değiştirmedim.
- `lib/data/petra/types.ts`, `solutions.ts`, `services.ts`, `projects.ts`, `campaigns.ts` ve ilgili section component'leri (`Solutions`, `Projects`, `Campaigns`) okunarak her sayfanın gerçekte hangi alanlara ihtiyaç duyduğu çıkarıldı.
- Gerçek Petra Customer DB'de mevcut veri durumu salt-okunur SQL ile kontrol edildi (`execute_sql`, sadece `select ... group by status`, hiçbir satır değiştirilmedi):

  | Tablo | draft | published |
  |---|---|---|
  | services | 5 | 0 |
  | solutions | 6 | 0 |
  | projects | 0 | 0 |
  | campaigns | 0 | 0 |

  Yani bugün itibarıyla Petra'nın gerçek CMS'inde hiçbir satır `published` değil (projects/campaigns'de hiç satır bile yok — seed dosyasında gerçek proje/kampanya verisi olmadığı için, Faz 7'de bilinçli olarak boş bırakılmıştı). Bu, kodun doğru çalışıp çalışmadığını etkilemez ama önemli bir sonucu var: **bu değişiklik canlıya çıksa bile, birileri dashboard'dan içerik "Yayınla" demeden public sitede hiçbir görsel fark olmayacak** — hâlâ statik fallback görünecek. Bu beklenen ve istenen davranış (draft asla public'te görünmemeli).

## 1) Şema Yeterlilik Analizi — Sayfa Bazında

| Sayfa | İhtiyaç duyduğu alanlar | CMS'te var mı? | Sonuç |
|---|---|---|---|
| `/hizmetler` | `title`, `description` | Evet (`services.title`, `services.description`) | **Tam uyumlu** — hiçbir alan eksik değil |
| `/cozumler` (liste) | `slug`, `title`, `shortDescription`, `image` | Evet, ama `shortDescription` ayrı bir kolon değil — tek `description` var | **Uyumlu, kozmetik sınır**: kart metni artık detay sayfasıyla aynı metni kullanacak (bkz. §2) |
| `/cozumler/[slug]` (detay) | `slug`, `title`, `longDescription` | Aynı `description` kolonu | **Uyumlu, kozmetik sınır** (yukarıdaki ile aynı neden) |
| `/projeler` | `id`, `title`, `category`, `image` | `category` YOK | **Eksik alan var** — bkz. §3, migration planlandı, uydurulmadı |
| `/kampanyalar` | `id`, `title`, `description`, `priceLabel`, `ctaLabel`, `ctaHref`, `image` | `priceLabel`/`ctaLabel`/`ctaHref` YOK | **Eksik alan var** — bkz. §4, migration planlandı, uydurulmadı |

## 2) `/cozumler` — kısa/uzun açıklama sınırı (bilgi amaçlı, veri uydurulmadı)

`solutions` tablosunda tek bir `description` kolonu var; statik veri modelinde ise `shortDescription` (kart için) ve `longDescription` (detay sayfası için) ayrı alanlar. Faz 6'da homepage için zaten yazılmış olan `mapSolutionRows()` bu ikisini aynı `description` değerine eşliyor — ben de aynı mapper'ı `/cozumler` ve `/cozumler/[slug]` için kullandım (yeni bir mapper icat etmedim). Sonuç: bir çözüm CMS'ten geliyorsa, kart ve detay sayfasında aynı metin görünür. Bu bir hata değil, gerçek bir şema sınırı — istenirse ayrı `short_description`/`long_description` kolonları eklenebilir (bkz. §5, planlı migration).

## 3) `/projeler` — `category` alanı eksik (uydurulmadı)

`projects` tablosunda `category` kolonu yok. `PetraProject.category` tipini `string` → `string | null` olarak güncelledim (tek kullanım yeri: `components/sections/projects.tsx`), CMS'ten gelen projeler için `category: null` set ediliyor (`lib/cms/petra/mappers.ts` → `mapProjectRows`), component de `category` `null` ise kategori etiketini hiç render etmiyor — sahte bir kategori metni ("Konut", "Ticari" vb.) UYDURULMADI. Statik `petraProjects` (bugün boş dizi) etkilenmedi.

## 4) `/kampanyalar` — `priceLabel`/`ctaLabel`/`ctaHref` eksik (kısmen uydurulmadı, kısmen bilinçli motor varsayılanı)

- `priceLabel`: CMS'te karşılığı yok → her zaman `null` (component zaten `priceLabel` `null` ise fiyat satırını hiç göstermiyor — statik veride de aynı kural geçerli, "doğrulanmamışsa gösterme"). **Hiçbir fiyat uydurulmadı.**
- `ctaLabel` / `ctaHref`: Bunlar müşteriye özel bir *iş verisi* değil, bir buton için genel bir UI davranışı — sitenin başka yerlerinde de aynı desen var (`/cozumler/[slug]` detay sayfasındaki "Keşif Talep Et" → `/iletisim` butonu gibi). Bu yüzden CMS'ten gelen her kampanya için sabit bir motor-seviyesi varsayılanı kullandım: `ctaLabel: "İletişime Geç"`, `ctaHref: "/iletisim"`. Bunu bir "veri" olarak değil, "her kampanya kartının bir eylem butonuna ihtiyacı var, en güvenli hedef zaten var olan iletişim sayfası" kararı olarak değerlendirdim. **İsterseniz bunu da kabul etmeyip her kampanya için ayrı CTA'yı zorunlu kılan bir migration'a çevirebiliriz** — bkz. §5.

## 5) Planlanan (UYGULANMAYAN) Migration — sonraki fazın kararına bırakıldı

Aşağıdaki migration hiçbir yerde çalıştırılmadı, hiçbir tabloya dokunulmadı — yalnızca bir **öneri** olarak burada bırakılıyor, onayınızla ayrı bir fazda uygulanabilir:

```sql
-- ÖNERİ — henüz uygulanmadı
alter table public.projects add column category text;

alter table public.campaigns
  add column price_label text,
  add column cta_label text,
  add column cta_href text;

-- opsiyonel, /cozumler kart/detay ayrımı isteniyorsa:
alter table public.solutions
  add column short_description text,
  add column long_description text;
-- (mevcut `description` kolonu geriye dönük uyumluluk için kalabilir,
--  ya da adapter/mapper'da fallback olarak kullanılabilir)
```

Bu migration'lar RLS'yi etkilemez (0005'teki `public.<table>_public_select` politikaları kolon bazlı değil, satır bazlı — yeni nullable kolon eklemek public görünürlüğü değiştirmez).

## 6) Yapılan Kod Değişiklikleri (dosya dosya)

| Dosya | Değişiklik |
|---|---|
| `lib/data/petra/types.ts` | `PetraProject.category`: `string` → `string \| null` |
| `components/sections/projects.tsx` | Opsiyonel `projects` prop eklendi (varsayılan: statik `petraProjects` — Hero/Solutions'taki mevcut desenle birebir aynı); `category` `null` ise etiket render edilmiyor |
| `components/sections/campaigns.tsx` | Opsiyonel `campaigns` prop eklendi (varsayılan: statik `petraCampaigns`), `campaigns.length === 0` kontrolü artık prop üzerinden |
| `lib/cms/petra/mappers.ts` | `mapServiceRows`, `mapProjectRows`, `mapCampaignRows` eklendi (gerekçeleri kod içi yorumlarda) |
| `app/(public)/hizmetler/page.tsx` | `async`, `getServices()` + fallback, CMS satırı varsa `mapServiceRows` |
| `app/(public)/projeler/page.tsx` | `async`, `getProjects()` + fallback, `<Projects projects={...} />` |
| `app/(public)/kampanyalar/page.tsx` | `async`, `getCampaigns()` + fallback, boş-durum kontrolü ve `<Campaigns campaigns={...} />` çözümlenen listeye göre |
| `app/(public)/cozumler/page.tsx` | `async`, `getSolutions()` + fallback, `<Solutions solutions={...} />` |
| `app/(public)/cozumler/[slug]/page.tsx` | `generateStaticParams`/`generateMetadata`/sayfa gövdesi artık ortak bir `resolvePetraSolutions()` yardımcı fonksiyonundan besleniyor (CMS öncelikli, statik fallback); route/slug yapısı BOZULMADI — aynı 6 slug (`split-klimalar`, `multi-split-klimalar`, `profesyonel-klimalar`, `vrf-sistemleri`, `isi-pompalari`, `sicak-su-sistemleri`) aynı şekilde üretiliyor. `dynamicParams` varsayılan `true` olduğu için CMS'e ileride eklenecek yeni bir çözüm, kod değişmeden otomatik çalışır. |

Hiçbir mevcut route/slug/URL yapısı değişmedi. Hiçbir dashboard/CMS-editor dosyasına dokunulmadı.

## 7) Published/Draft Ayrımı — nasıl garanti ediliyor

İki bağımsız katman, değişmedi:
1. `lib/cms/adapters/shared.ts` → `fetchPublishedList()` her sorguya `.eq("status", "published")` ekliyor (server-side filtre).
2. `supabase/customer-template/migrations/0005_customer_rls.sql` → `anon`/`authenticated` rolleri için her içerik tablosunda `using (status = 'published')` RLS politikası (veritabanı seviyesi, uygulama kodu bypass edilse bile geçerli).

Bu ikisi Faz 5/7'de kuruldu ve bu fazda dokunulmadı. Bu spesifik oturumda gerçek DB'ye karşı canlı bir "publish → görünür, unpublish → kaybolur" testi TEKRARLANMADI (Faz 7'de zaten uçtan uca test edilmişti — anon draft görmüyor, published görüyor — ve veri o testten beri tekrar değişmedi, madde 0'daki sorgu bunu doğruluyor: her şey hâlâ draft). Bu bilinçli bir kapsam kararı: talimat gereği bu fazda Supabase verisine dokunulmadı.

## 8) Testler

### Lint

**PASS** — `npm run lint` → 0 hata.

### TypeScript

**PASS** — `npx tsc --noEmit` → 0 hata.

### Build

**PASS** — `npm run build` → 21/21 route başarıyla üretildi. Build logunda beklenen `[cms/connection] Platform lookup failed ... Host not in allowlist` satırları vardı (Faz 7/8'den beri bilinen, değişmeyen sandbox ağ kısıtı) — build'i düşürmedi, her yerde statik fallback'e düşüldüğü build çıktısından (21/21 başarı) doğrulandı.

### HTTP Testleri (gerçek `next start`, yerel sandbox)

| Route | Sonuç |
|---|---|
| `/` | 200 |
| `/cozumler` | 200 |
| `/cozumler/split-klimalar` | 200 |
| `/cozumler/multi-split-klimalar` | 200 |
| `/cozumler/isi-pompalari` | 200 |
| `/cozumler/nonexistent-slug` | **404** (beklenen — olmayan slug hâlâ doğru şekilde 404 dönüyor) |
| `/hizmetler` | 200 |
| `/projeler` | 200 |
| `/kampanyalar` | 200 |
| `/hakkimizda` | 200 |
| `/iletisim` | 200 |
| `/login` | 200 |
| `/dashboard` | 307 → login (değişmedi) |
| `/robots.txt`, `/sitemap.xml` | 200 |

İçerik doğrulaması (curl + grep, gerçek response body üzerinden):
- `/hizmetler` → statik "Satış" başlığı mevcut (fallback çalışıyor, sandbox CMS'e ulaşamadığı için beklenen).
- `/projeler` → boş-durum metni ("Tamamlanan projelerimiz yakında burada yer alacak") doğru render ediliyor.
- `/kampanyalar` → boş-durum metni ("Şu anda aktif bir kampanyamız bulunmuyor") doğru render ediliyor.
- `/cozumler` → 6 statik çözüm başlığının tamamı sayfada mevcut.
- `/cozumler/isi-pompalari` → statik uzun açıklama metni doğru render ediliyor.

Not: Bu sandbox'ın ağ kısıtı nedeniyle CMS'ten gerçekten veri gelen bir "published" senaryosu bu ortamdan test edilemiyor (Faz 7/8'de tespit edilen, değişmeyen kısıt) — kodun CMS-öncelikli dalı (`isCmsRow(...) ? map...Rows(...) : fallback`) statik analiz + Faz 6'daki homepage'in aynı deseni + Faz 7'deki gerçek DB testleriyle dolaylı olarak doğrulanmış durumda. Vercel ortamında (gerçek ağ erişimiyle) bir satır `published` yapıldığında bu dalın tetiklendiği doğrudan gözlemlenebilir.

## 9) Kapsam Dışı Bırakılanlar / Yapılmayanlar (talimat gereği)

- Hiçbir migration çalıştırılmadı (§5'teki öneri yalnızca metin, uygulanmadı).
- Hiçbir Supabase verisi (Platform veya Petra) değiştirilmedi — yalnızca salt-okunur `select` sorgusu çalıştırıldı.
- Mevcut Platform/Petra Supabase mimarisi, RLS politikaları, connection factory yeniden kurulmadı/değiştirilmedi.
- Çalışan Petra public sitesinin mevcut statik davranışı bozulmadı — her sayfa CMS boşken (bugünkü gerçek durum) tam olarak öncekiyle aynı görünüyor.
- `/hizmetler`, `/projeler`, `/kampanyalar` için yeni bir detay (`[slug]`) route'u EKLENMEDİ — bunlar bugün de yoktu, kapsam "mevcut route/slug yapısını bozma" talimatına göre yalnızca var olan `/cozumler/[slug]`'ı CMS'e bağlamakla sınırlı tutuldu.
- Git commit/push yapılmadı.

## 10) Sıradaki Karar Noktaları

1. §5'teki planlı migration (kategori + kampanya CTA/fiyat alanları, opsiyonel kısa/uzun açıklama ayrımı) uygulansın mı? Uygulanırsa PHASE 9.3 gibi ayrı, küçük bir faz olarak önerilir.
2. Kampanyalar için kullandığım sabit "İletişime Geç" / `/iletisim` CTA varsayımı kabul mü, yoksa her kampanya için CMS'ten override edilebilir bir CTA mı istiyorsunuz (§5'teki migration bunu çözer)?
3. Gerçek içerik ne zaman "Yayınla" edilecek? Bugün her şey draft olduğu için bu fazın etkisi yalnızca kod altyapısında — görsel fark, dashboard'dan gerçek published içerik girilene kadar ortaya çıkmayacak.

Sonucu bekliyorum.
