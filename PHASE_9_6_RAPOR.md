# PHASE 9.6 — Projects/Campaigns Şema Genişletmesi Raporu

**Kapsam:** Phase 9.2'de tespit edilen `projects`/`campaigns`/`solutions` CMS şema eksiklerini, gerçekten gerekli olup olmadığını koddan doğrulayarak, kontrollü şekilde çözmek.

**Migration adlandırma notu (önemli):** Talimatta migration dosyası `0006_projects_campaigns_fields.sql` olarak istendi. Ancak `0006` numarası artık boş değil — Phase 9.4'te `0006_media_storage_bucket.sql` zaten bu numarayı kullandı ve gerçek Petra DB'sine uygulandı. Zaten uygulanmış bir migration'ı yeniden numaralandırmak riskli olacağından, bu migration `0007_projects_campaigns_solutions_fields.sql` olarak oluşturuldu. Dosya adı da kapsamı biraz genişletildiği için ("solutions" da dahil, aşağıda açıklanıyor) buna göre adlandırıldı.

---

## 1. Şema yeterlilik analizi — her alan için kod kanıtı

Migration'a hiçbir alan eklemeden önce, her birinin gerçekten kullanılıp kullanılmadığını ilgili component/type dosyalarından doğrudan okuyarak doğruladım:

| Alan | Kod kanıtı | Sonuç |
|---|---|---|
| `projects.category` | `components/sections/projects.tsx`: `project.category ? <span>...badge...</span> : null` — UI gerçekten koşullu bir rozet render ediyor. `lib/data/petra/types.ts`'teki `PetraProject.category: string \| null` zaten nullable tasarlanmış. | **Gerekli** — eklendi |
| `campaigns.price_label` | `components/sections/campaigns.tsx`: `campaign.priceLabel ? <p>...fiyat...</p> : null` — UI koşullu render ediyor. `PetraCampaign.priceLabel: string \| null`. | **Gerekli** — eklendi |
| `campaigns.cta_label` / `cta_href` | `components/sections/campaigns.tsx`: her kampanya kartı `<Button href={campaign.ctaHref}>{campaign.ctaLabel}</Button>` render ediyor — `PetraCampaign` tipinde bu ikisi **zorunlu** (non-nullable) alanlar. Mevcut mapper (`mapCampaignRows`) bunları motor-geneli sabit bir değere ("İletişime Geç" → `/iletisim`) donduruyordu — dashboard'da müşteri bunu kampanya bazında özelleştiremiyordu. | **Gerekli** (özelleştirme imkânı olarak) — eklendi, nullable, null ise eski sabit davranışa düşer |
| `/cozumler` kısa/uzun açıklama ayrımı | `components/sections/solutions.tsx` (liste kartı): `solution.shortDescription` kullanıyor. `app/(public)/cozumler/[slug]/page.tsx` (detay sayfası): `solution.longDescription` kullanıyor. `lib/data/petra/solutions.ts`'teki gerçek 6 statik çözüm verisinde bu ikisi **gerçekten farklı metinler** (kısa tek cümle vs. uzun paragraf). CMS tarafında `solutions` tablosunda tek bir `description` kolonu vardı — mevcut `mapSolutionRows` bunu hem short hem long'a aynı şekilde kopyalıyordu (kozmetik bir eksiklik, `cozumler/[slug]/page.tsx`'te zaten yorum olarak belgelenmişti). | **Gerekli** — `solutions.short_description` eklendi |

Hiçbir varsayımsal/spekülatif alan eklenmedi — örneğin "belki ileride şunlar da lazım olur" türünden bir alan yok; her biri gerçek, çalışan bir UI ihtiyacına karşılık geliyor.

## 2. Uygulanan migration

`supabase/customer-template/migrations/0007_projects_campaigns_solutions_fields.sql` — gerçek Petra Supabase projesine (`wahbjfhvizalenyxjywb`) uygulandı:

```sql
alter table public.projects add column category text;
alter table public.campaigns add column price_label text;
alter table public.campaigns add column cta_label text;
alter table public.campaigns add column cta_href text;
alter table public.solutions add column short_description text;
```

Hepsi **nullable**, hiçbir `NOT NULL`/zorunlu `default` yok — talimattaki "nullable/default yaklaşımı" birebir uygulandı. `description` kolonu (solutions) **değiştirilmedi/yeniden adlandırılmadı** — hâlâ uzun/detay metnini taşıyor, yeni `short_description` yalnızca eklendi.

### Uygulama sonrası doğrulama

```
information_schema.columns sorgusu:
campaigns.cta_href        text  nullable
campaigns.cta_label       text  nullable
campaigns.price_label     text  nullable
projects.category         text  nullable
solutions.short_description text nullable
```

Mevcut veri kontrolü: migration öncesi/sonrası `solutions` tablosunda **6 satır**, `projects`/`campaigns`'te **0 satır** — hiçbir satır kaybolmadı, `short_description` yeni satırlarda beklendiği gibi `null`.

## 3. RLS canlı doğrulaması (gerçek Petra DB'sinde)

Yeni kolonların RLS güvenliğini bozmadığını kanıtlamak için geçici test satırları eklendi, `set local role anon` ile test edildi, sonra silindi:

| Test | Sonuç |
|---|---|
| `projects`'e 1 draft + 1 published satır (yeni `category` kolonuyla) eklendi, anon ile SELECT | Yalnızca **published** satır göründü (`category` değeri dahil), draft satır tamamen gizliydi |
| `campaigns`'a 1 draft + 1 published satır (yeni `price_label` kolonuyla) eklendi, anon ile SELECT | Yalnızca **published** satır göründü (`price_label` değeri dahil), draft satır tamamen gizliydi |
| `solutions`'taki gerçek bir satıra (`split-klimalar`, durumu **draft**) `short_description` yazıldı, anon ile SELECT | Satır **hiç görünmedi** (çünkü draft) — yeni kolon draft gizleme kuralını bozmadı |
| anon rolüyle `projects`'e INSERT denemesi (yeni `category` alanıyla) | `ERROR 42501: new row violates row-level security policy` — reddedildi |
| Tüm test satırları temizliği sonrası | `projects`/`campaigns` 0 satır, `solutions.short_description` tekrar `null` — DB migration öncesi haliyle birebir aynı |

**Sonuç:** Yeni kolonlar `0005_customer_rls.sql`'deki satır-seviyeli (`status = 'published'`) RLS politikalarını hiçbir şekilde etkilemiyor — Postgres RLS, izin verilen bir satırın **her kolonuna** otomatik uygulanıyor, yeni kolon için ayrı bir policy gerekmiyor. Bu migration'da RLS dosyasına hiç dokunulmadı.

## 4. Kod değişiklikleri

- **`lib/cms/customer-types.ts`**: `SolutionRow`, `ProjectRow`, `CampaignRow` — `NamedContentRow`'u genişleten, yalnızca ilgili tabloya özel yeni alanları ekleyen üç yeni tip. `services` tablosu değişmedi, hâlâ `NamedContentRow` kullanıyor. `CustomerDatabase.Tables`'ta solutions/projects/campaigns bu yeni tiplere güncellendi.
- **`lib/cms/adapters/{solutions,projects,campaigns}.ts`**: `NamedContentRow` yerine ilgili yeni satır tipini kullanacak şekilde güncellendi (tek satırlık jenerik tip parametresi değişikliği, `shared.ts`'e dokunulmadı).
- **`lib/cms/petra/mappers.ts`**:
  - `mapSolutionRows`: `shortDescription: row.short_description ?? row.description ?? ""` — yeni kolon varsa onu, yoksa eskisi gibi `description`'a düşer (hiçbir CMS satırı boş kart göstermez).
  - `mapProjectRows`: `category: row.category` (artık gerçek değer, `null` sabiti değil).
  - `mapCampaignRows`: `priceLabel: row.price_label`, `ctaLabel: row.cta_label ?? "İletişime Geç"`, `ctaHref: row.cta_href ?? "/iletisim"` — eski motor-geneli varsayılan **kaldırılmadı**, yalnızca artık öncelik CMS değerinde.
- **Public sayfalar** (`app/(public)/{cozumler,projeler,kampanyalar}/page.tsx`, `app/(public)/page.tsx`, `lib/cms/petra/resolve-solutions.ts`): `NamedContentRow` cast'leri ilgili yeni tiplere (`SolutionRow`/`ProjectRow`/`CampaignRow`) güncellendi.
- **`app/(public)/cozumler/[slug]/page.tsx`**: artık çözülmüş olan "aynı metin iki yerde de görünüyor" kozmetik sınırlamasını belgeleyen yorum güncellendi.
- **`lib/cms/dashboard/content-types.ts`** (dashboard CMS editörü): jenerik alan-config listesine yeni alanlar eklendi —
  - `solutions`: `short_description` (textarea, opsiyonel, "Kısa Açıklama") + mevcut `description` artık "Uzun Açıklama" olarak etiketlendi.
  - `projects`: `category` (text, opsiyonel).
  - `campaigns`: `price_label`, `cta_label`, `cta_href` (hepsi text, opsiyonel). `cta_href` bilinçli olarak `kind: "url"` değil `"text"` — çünkü varsayılan değer (`/iletisim`) site-içi göreli bir yol, `"url"` alanları Zod ile mutlak URL zorunluluğu istiyor (`lib/validation/content.ts`), bu da göreli yolu reddederdi. `hero_sections.cta_primary_href` ile aynı desen.
  
  Bu dosya tamamen config-driven olduğu için (`app/dashboard/customers/[customerId]/content/[type]/*` — form, validation, create/update/status action'ları hepsi `CONTENT_TYPES` config'inden türüyor), yalnızca bu config'i güncellemek dashboard'daki formu, Zod şemasını ve create/update action'larını otomatik olarak yeni alanları destekler hale getirdi — **başka hiçbir dosyada değişiklik gerekmedi**.

## 5. Test sonuçları

| Test | Sonuç |
|---|---|
| `npm run lint` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS — 21 route derlendi |
| Gerçek Petra DB şema testi | 5 yeni kolon da doğru tip/nullable ile mevcut, mevcut 6 `solutions` satırı bozulmadı |
| RLS testi (yeni kolonlarla) | draft gizli, published görünür, anon yazamıyor — §3'te ayrıntılı |
| Draft/published testi | Aynı RLS testi kapsamında yapıldı (bkz. §3) — ayrıca aşağıda bir önemli sınırlama var, açıklanıyor |
| `next start` → public route'lar (`/`, `/hizmetler`, `/projeler`, `/kampanyalar`, `/cozumler`, `/iletisim`, `/hakkimizda`) | hepsi 200 |
| `next start` → `/dashboard/customers/x/content/projects` (oturumsuz) | 307 → `/login` |
| Client bundle secret taraması (`.next/static`) | `SERVICE_ROLE`/`service_role`/`META_CAPI_TOKEN` deseni ve gerçek `SUPABASE_SERVICE_ROLE_KEY_PETRA` değeri — bulunamadı, temiz |
| `git status` | Yeni commit/push yok — yalnızca çalışma dizini değişiklikleri + yeni migration dosyası |

### Draft/published testi hakkında önemli bir sınırlama — açıkça belirtiliyor

`/projeler` ve `/kampanyalar` (ve `/cozumler`, `/hizmetler`, ana sayfa) build çıktısında **statik (○)** olarak işaretleniyor — yani CMS verisi yalnızca **build anında** bir kez çekiliyor, her istekte değil. Bu sandbox'ta build sırasında `*.supabase.co`'ya ağ erişimi yasak olduğu için (build loglarında "Host not in allowlist" hatası), bu sayfalar bu sandbox'ta **her zaman** statik fallback'e düşüyor — gerçek DB'de published bir satır olsa bile, bu build onu göstermiyor olurdu.

Bu nedenle "draft görünmüyor, published görünüyor" kuralını gerçek bir sayfa render'ıyla uçtan uca test edemedim — bunun yerine (Phase 9.3/9.5'te de kullanılan aynı yöntemle) **SQL seviyesinde** kesin olarak doğruladım (§3): anon rolü draft satırları hiç göremiyor, published satırları (yeni kolonlar dahil) görebiliyor. Bu, RLS'in doğru çalıştığını kanıtlıyor; sayfanın gerçek CMS verisiyle build edildiğinde doğru göründüğünü ise yalnızca gerçek ağ erişimi olan bir ortamda (örn. Vercel production build'i) doğrulamak mümkün — **bu sandbox'ta değil**. Bu, önceki fazlarda da tekrarlanan, bu ortama özgü yapısal bir kısıt; başarılı olduğu varsayılmıyor.

## 6. Eklenmeyen / uydurulmayan veri

- Gerçek Petra proje/kampanya bilgisi olmadığından **seed'e hiçbir veri eklenmedi** — `projects`/`campaigns` hâlâ 0 satır.
- `solutions` tablosundaki 6 gerçek satırın `short_description` alanı **doldurulmadı** — `null` kaldı, mapper mevcut `description`'a düşüyor (görsel bir bozulma yok, önceki davranışla birebir aynı).
- `category`/`price_label`/`cta_label`/`cta_href` için hiçbir örnek/placeholder değer girilmedi.

## 7. Yapılmayanlar (talimata uygun)

- Petra public sitesi bozulmadı — tüm route testleri 200, statik fallback davranışı migration öncesiyle birebir aynı (0 published satır olduğu için hâlâ boş durum gösteriliyor).
- Git commit/push yapılmadı.
- Gereksiz alan eklenmedi — her alan §1'deki kod kanıtına dayanıyor.
- `0005_customer_rls.sql`'e dokunulmadı.

---

**9.7'ye geçmiyoruz — talimatınız gereği burada duruyorum.** Bu rapor onaylandıktan sonra, gerçekten ihtiyaç olup olmadığını birlikte değerlendirip bir sonraki fazı netleştirelim.
