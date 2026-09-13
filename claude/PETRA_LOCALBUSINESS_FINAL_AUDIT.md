# Petra — Faz C: LocalBusiness/HVACBusiness Final Audit + Address Confirmation

**Durum: TAMAMEN READ-ONLY.** Kod/DB/ENV/migration/deploy/commit/push hiçbirine dokunulmadı. Bu turda çalıştırılan tek "aktif" işlemler, gerçek Petra Supabase projesine (`wahbjfhvizalenyxjywb`) karşı çalıştırılan salt-okunur `SELECT` sorguları oldu.

**Kullanıcı tarafından bu turda teyit edilen kanonik adres:**
> Yusuflar, Şekerdere Blv 29/A, 46000 Onikişubat/Kahramanmaraş

Bu adres hiçbir yerde (repo kodu, statik veri, gerçek DB) değiştirilmedi, kısaltılmadı, varsayılmadı — sadece mevcut kaynaklarla karşılaştırıldı (§2).

---

## 1. Mevcut Structured Data Mimarisi — Tam Envanter

Tek kaynak dosya: `lib/seo/structured-data.ts`. Aşağıdaki tablo her şema tipi için dosya/fonksiyon/route/veri kaynağı/production durumunu gösteriyor.

| Şema Tipi | Dosya / Fonksiyon | Kullanıldığı Route(lar) | Veri Kaynağı | Production'da Aktif mi |
|---|---|---|---|---|
| `Organization` | `petraOrganizationStructuredData()` | SADECE `/` (homepage) | `petraSiteName`, `publicEnv.siteUrl`, `/icon.png`, `petraContactInfo.phone`, `petraContactInfo.address` (varsa), `petraSocialLinks` | ✅ EVET — production'da doğrulandı (bkz. aşağıdaki ham çıktı) |
| `WebSite` | `petraWebsiteStructuredData()` | SADECE `/` | `petraSiteName`, `publicEnv.siteUrl` | ✅ EVET |
| `FAQPage` | `petraFaqStructuredData(faqs)` | SADECE `/` | Homepage'in zaten render ettiği `faqs` dizisi (CMS-or-static) | ✅ EVET |
| `LocalBusiness` / `HVACBusiness` | `petraLocalBusinessStructuredData()` | `/` (koşullu render, `null` dönerse hiç basılmıyor) | `petraContactInfo.address`, `petraContactInfo.phone`, `petraSiteName`, `publicEnv.siteUrl`, `petraContactInfo.serviceArea` | ❌ HAYIR — `address` null olduğu için fonksiyon `null` dönüyor, homepage'de HİÇ render edilmiyor |
| `BreadcrumbList` | `petraBreadcrumbStructuredData(items)` | 12 sayfa: `/referanslar`, `/iletisim`, `/kampanyalar`, `/btu-hesaplama`, `/cozumler`, `/hakkimizda`, `/projeler`, `/kullanim-sartlari`, `/kvkk-aydinlatma-metni`, `/cerez-politikasi`, `/hizmetler`, `/cozumler/[slug]`, `/gizlilik-politikasi` — **homepage'de YOK (bilinçli, kök sayfa için hiyerarşi anlamsız)** | Her sayfanın kendi `{name, path}` dizisi | ✅ EVET (12 sayfada) |

**Diğer JSON-LD tipi yok** — repo genelinde `"@type":` için tam grep sonucu yukarıdaki 5 tipin dışında hiçbir şema döndürmüyor.

**Production'da ŞU AN gerçekten render edilen (bu turda taze curl ile doğrulandı, `https://www.petramuhendislik.com/`):**
```
"@type":"Answer"
"@type":"FAQPage"
"@type":"Organization"
"@type":"Question"
"@type":"WebSite"
```
`HVACBusiness`/`LocalBusiness` string'i sayfada SIFIR kez geçiyor (`grep -c "HVACBusiness\|LocalBusiness"` → `0`).

### `petraLocalBusinessStructuredData()` — Ayrıntılı İnceleme (İSTENDİĞİ GİBİ)

**Tam güncel kod (`lib/seo/structured-data.ts` satır 33-50):**
```ts
/**
 * Only emits `LocalBusiness` once both a real address and phone number
 * are confirmed — a partial/best-guess LocalBusiness entry is worse than
 * none, since search engines treat it as a factual claim.
 */
export function petraLocalBusinessStructuredData() {
  if (!petraContactInfo.address || !petraContactInfo.phone) return null;

  return {
    "@context": "https://schema.org",
    "@type": "HVACBusiness",
    name: petraSiteName,
    telephone: petraContactInfo.phone,
    address: petraContactInfo.address,
    url: publicEnv.siteUrl,
    ...(petraContactInfo.serviceArea ? { areaServed: petraContactInfo.serviceArea } : {}),
  };
}
```

**Kritik gözlem — `address` alanı bir DÜZ STRING, `PostalAddress` objesi DEĞİL:** `petraContactInfo.address` tipi `string | null` (bkz. `lib/data/petra/types.ts`). Eğer bu alan bugün doldurulsaydı (örn. tam adres metniyle), JSON-LD'ye `"address": "Yusuflar, Şekerdere Blv 29/A, ..."` biçiminde DÜZ BİR METİN olarak girerdi — schema.org/Google'ın beklediği yapılandırılmış `{"@type":"PostalAddress", streetAddress, addressLocality, ...}` objesi DEĞİL. Bu, §6'da ayrıntılı ele alınan gerçek bir mimari eksiklik — mevcut kod, adres string'ini asla parçalara ayırmıyor.

**Gate koşulu:** `!address || !phone` — AND mantığı, OR-fallback değil. Adres yokken `geo` dahil TÜM obje `null` olur (Faz-önceki geo audit'te de tespit edilmişti, bkz. `PETRA_SEO_GEO_COORDINATES_AUDIT.md`).

**`app/(public)/page.tsx`'teki çağrı yeri (satır 154-174, TAM kod):**
```tsx
const whatsappHref = buildWhatsappHref(whatsapp);
const faqJsonLd = petraFaqStructuredData(faqs);
// Faz 10: adres henüz onaylanmadığı için bu şu an her zaman `null`
// döner (bkz. lib/seo/structured-data.ts) — sahte bir işletme beyanı
// riski yok, gerçek adres onaylandığında kod değişikliği gerekmeden
// otomatik olarak render olacak.
const localBusinessJsonLd = petraLocalBusinessStructuredData();
// Faz SEO-3: site-wide kimlik şemaları — homepage'de bir kez render
// ediliyor (FAQ/LocalBusiness ile aynı yerleşim deseni), asla `null`
// dönmüyorlar (LocalBusiness'in aksine, eksik/onaysız bir alana bağımlı
// değiller — sadece zaten confirmed olan site adı/URL/telefon/sosyal
// hesap kullanıyorlar).
const organizationJsonLd = petraOrganizationStructuredData();
const websiteJsonLd = petraWebsiteStructuredData();

return (
  <>
    {faqJsonLd ? <JsonLd data={faqJsonLd} /> : null}
    {localBusinessJsonLd ? <JsonLd data={localBusinessJsonLd} /> : null}
    <JsonLd data={organizationJsonLd} />
    <JsonLd data={websiteJsonLd} />
    <Hero whatsappHref={whatsappHref} hero={hero} />
    ...
```

**`petraOrganizationStructuredData()` — TAM güncel kod (satır 63-74):**
```ts
export function petraOrganizationStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: petraSiteName,
    url: publicEnv.siteUrl,
    logo: `${publicEnv.siteUrl}/icon.png`,
    ...(petraContactInfo.phone ? { telephone: petraContactInfo.phone } : {}),
    ...(petraContactInfo.address ? { address: petraContactInfo.address } : {}),
    ...(petraSocialLinks.length > 0 ? { sameAs: petraSocialLinks.map((link) => link.url) } : {}),
  };
}
```

**`JsonLd` render bileşeni (`components/seo/json-ld.tsx`, TAM dosya) — her çağrı BAĞIMSIZ bir `<script>` bloğu üretiyor, `@graph` ile birleştirme YOK:**
```tsx
export function JsonLd({ data }: { data: unknown }) {
  const safeJson = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson }} />;
}
```
Bu, §7'deki Organization/LocalBusiness çakışma riskinin TEKNİK temeli: iki ayrı `<script>` bloğu, aralarında hiçbir `@id`/`@graph` bağlantısı olmadan aynı işletmeyi tarif edebilir.

---

## 2. Kanonik Adres Teyidi — A/B/C/D Karşılaştırması

**Gerçek DB sorgusu (bu turda çalıştırıldı, salt-okunur):**
```sql
select id, company_name, alternate_name, phone, whatsapp, email, address, service_area,
       working_hours, logo, logo_white, favicon, status, created_at, updated_at
from public.site_settings;
```
Ham sonuç:
```json
[{
  "id": "9d5037ec-9c20-4164-8ade-cc15dd5cb7c8",
  "company_name": "Petra Mühendislik",
  "alternate_name": "Petra İklimlendirme",
  "phone": "0535 791 11 96",
  "whatsapp": null,
  "email": null,
  "address": null,
  "service_area": "Onikişubat, Kahramanmaraş",
  "working_hours": null,
  "logo": null,
  "logo_white": null,
  "favicon": null,
  "status": "draft",
  "created_at": "2026-08-15 15:53:54.227007+00",
  "updated_at": "2026-08-15 15:53:54.227007+00"
}]
```

**A) Repo/DB'deki mevcut adres:**
- `lib/data/petra/site-config.ts`'in `petraContactInfo.address` → **`null`**
- Gerçek DB'deki `site_settings.address` → **`null`** (ve satırın kendisi `status:"draft"`, yani public'e hiç yansımıyor)
- **Sonuç: repo'da VE DB'de bugün HİÇBİR adres değeri yok** — çakışan/farklı bir adres YOK, sadece TAM BİR BOŞLUK var.

**B) Public sitede görünen adres:**
- Footer (`site-footer.tsx`) ve İletişim sayfası (`contact-details.tsx`): `address ?? serviceArea` mantığıyla, `address` null olduğu için **"Onikişubat, Kahramanmaraş"** (serviceArea) gösteriliyor + ayrı bir "Konumu Görüntüle" linki (`mapUrl`, koordinat tabanlı). Tam bir sokak adresi HİÇBİR YERDE public'te görünmüyor bugün.

**C) LocalBusiness helper'ın kullandığı adres:**
- `petraLocalBusinessStructuredData()`, `petraContactInfo.address`'i kullanıyor → bugün `null` → fonksiyon hiç çalışmıyor (§1).

**D) Kullanıcının teyit ettiği kanonik adres:**
> Yusuflar, Şekerdere Blv 29/A, 46000 Onikişubat/Kahramanmaraş

**ÖNEMLİ TESPİT — daha önceki bir fazda (Faz 4 / site-config.ts JSDoc'u) FARKLI FORMATLI bir aday adres zaten belgelenmişti, ama hiçbir zaman koda/DB'ye YAZILMADI:**
```
site-config.ts satır 30-35'teki mevcut yorum:
"address: still `null` — a candidate address IS visible in the
screenshot ("Yusuflar Mahallesi, Şekerdere Caddesi No:29/A"), but the
company reference doc flags conflicting formats (Cadde vs Bulvarı,
No:29/A) as unresolved. Per instruction, this stays pending/unset
rather than being written into contact info or structured data until
the customer confirms one canonical format."
```
Yani ÖNCEDEN belgelenmiş iki çelişkili aday vardı: **"Şekerdere Caddesi"** (screenshot'tan) vs bilinmeyen bir "Bulvarı" iddiası. Kullanıcının BU TURDA teyit ettiği kanonik adres bu belirsizliği KESİN olarak çözüyor: **"Şekerdere Blv" (Bulvarı), Caddesi DEĞİL.** Bu, körlemesine bir varsayım DEĞİL — kullanıcının doğrudan bu mesajda verdiği net teyit.

**Fark özeti:**
| Kaynak | Mahalle | Sokak/Cadde/Bulvar | No | Posta Kodu | İlçe | Şehir |
|---|---|---|---|---|---|---|
| A (repo/DB) | — | — | — | — | — | — |
| Faz 4 aday (screenshot, HİÇ ONAYLANMAMIŞ) | Yusuflar Mahallesi | Şekerdere **Caddesi** | 29/A | — | — | — |
| **D (bu turda teyit edilen KANONİK)** | Yusuflar | Şekerdere **Blv** (Bulvarı) | 29/A | **46000** | **Onikişubat** | **Kahramanmaraş** |

Kod veya DB'de değiştirilecek/düzeltilecek YANLIŞ bir adres YOK (çünkü hiçbiri hiçbir yerde yazılı değildi) — sadece EKSİK bir alanın artık NASIL doldurulacağı netleşti. Adres bu raporda hiçbir şekilde kısaltılmadı, değiştirilmedi veya varsayılmadı.

---

## 3. Telefon / URL / Logo / Diğer Business Alanları

| Alan | Teyitli/İstenen Değer | Kod Kaynağı | DB Kaynağı | Fark var mı |
|---|---|---|---|---|
| **Telefon** | `0535 791 11 96` | `petraContactInfo.phone` = `"0535 791 11 96"` (site-config.ts) | `site_settings.phone` = `"0535 791 11 96"` (yukarıdaki SQL sonucu) | ❌ FARK YOK — üçü de (istenen, kod, DB) birebir aynı |
| **Website** | `https://www.petramuhendislik.com` | `publicEnv.siteUrl` (ENV: `NEXT_PUBLIC_SITE_URL`) — hardcode YOK | — (ENV bazlı) | Production'da taze doğrulandı: `canonical href="https://www.petramuhendislik.com"` — vercel.app domaini hiçbir schema/canonical alanında YOK |
| **Email** | Teyit YOK | `petraContactInfo.email` = `null` | `site_settings.email` = `null` | Uydurulmadı, ikisi de null |
| **Logo** | Teyit YOK (gerçek logo dosyası yok) | `petraBrandAssets.logoSrcDark/Light` = `null`; Organization/LocalBusiness'ta kullanılan `logo` = `${siteUrl}/icon.png` (Petra'nın kendi hero fotoğrafından çıkarılmış gerçek marka ikonu, favicon fazında onaylanmış) | `site_settings.logo/logo_white` = `null` | `/icon.png` ve `/apple-icon.png` dosyaları gerçekten var (15282 byte, doğrulandı) |
| **Company name** | "Petra Mühendislik" | `petraSiteName` | `site_settings.company_name` = `"Petra Mühendislik"` | Fark yok |
| **Alternate name** | "Petra İklimlendirme" | `petraAlternateName` = `"Petra İklimlendirme"` (site-config.ts, AYRI bir export, `PetraContactInfo`'nun parçası DEĞİL) | `site_settings.alternate_name` = `"Petra İklimlendirme"` | Fark yok. **AMA: bugün HİÇBİR structured data fonksiyonu `alternateName` alanını KULLANMIYOR** — teyitli veri var ama şemaya hiç yansımıyor (§5'te fırsat olarak not edildi) |
| **sameAs** | Instagram: `https://www.instagram.com/petraamuhendislik` | `petraSocialLinks` (tek satır, Instagram) | — (navigation_items ile ilgisiz, ayrı bir CMS tablosu yok) | Sadece `petraOrganizationStructuredData()`'da kullanılıyor, `petraLocalBusinessStructuredData()`'da YOK |
| **Opening hours** | Teyit YOK | `petraContactInfo.workingHours` = `null` | `site_settings.working_hours` = `null` | Uydurulmadı |
| **priceRange** | Teyit YOK, hiç istenmedi | Kod tabanında hiçbir yerde YOK (`grep priceRange` → 0 sonuç) | — | Eklenmeyecek (veri yok) |
| **areaServed** | "Onikişubat, Kahramanmaraş" | `petraContactInfo.serviceArea` | `site_settings.service_area` = `"Onikişubat, Kahramanmaraş"` | Fark yok, zaten LocalBusiness'ta kullanılıyor |
| **image** | Teyit YOK | Hiçbir onaylı "işletme fotoğrafı" yok (Faz 4'ten beri değişmedi) | — | Eklenmeyecek (fabrikasyon riski) |

---

## 4. Geo Audit

**Kaynak dosya:** `lib/data/petra/site-config.ts`, satır 52:
```ts
mapUrl: "https://www.google.com/maps?q=37.58518,36.92165",
```
Bu, önceki "Faz C öncesi" geo audit'te (`PETRA_SEO_GEO_COORDINATES_AUDIT.md`) zaten TAM olarak doğrulanmıştı; bu turda hiçbir değişiklik YOK, koordinatlar aynı, tekrar teyit edildi.

- **DB'de tutuluyor mu? → HAYIR.** `site_settings` tablosunda `latitude`/`longitude`/`geo` diye bir SÜTUN bile YOK (yukarıdaki `select *`'e eşdeğer sorgu sonucunda görülen tüm sütunlar: company_name, alternate_name, phone, whatsapp, email, address, service_area, working_hours, logo, logo_white, favicon, status — geo/koordinat alanı YOK). Koordinatlar SADECE kod içinde, `mapUrl` string'inin İÇİNE gömülü.
- **Map/contact bileşeninde nasıl kullanılıyor? → Gerçek bir "harita bileşeni" (embed/iframe/JS harita) YOK.** Sadece düz bir `<a href={mapUrl}>Konumu Görüntüle</a>` linki — `components/sections/contact-details.tsx` (satır 75-85) ve `components/layout/site-footer.tsx` (satır 144-161). Tıklanınca kullanıcıyı Google Maps'e (`https://www.google.com/maps?q=37.58518,36.92165`) yönlendiriyor, sitede gömülü bir harita GÖRÜNTÜLENMİYOR.
- **Doğru formatta mı? → EVET.** `q=lat,lng` formatı Google Maps'in standart sorgu formatı, `37.58518,36.92165` ondalık derece (decimal degrees) formatında — schema.org `GeoCoordinates.latitude`/`longitude` alanları da AYNI ondalık derece formatını bekliyor, doğrudan sayısal olarak kullanılabilir.
- **LocalBusiness `geo` alanında güvenle kullanılabilir mi? → EVET.** Koordinatlar müşteri tarafından 2026-08-17'de doğrudan sağlanmış ve teyitli (site-config.ts JSDoc'u), bugün zaten 5 public bileşende (footer, iletişim, layout, contact-details, not-found) canlı olarak kullanılıyor — yeni/tahmini bir değer DEĞİL.

**Bu turda hiçbir koordinat değiştirilmedi, yeniden hesaplanmadı, haritadan farklı bir değer üretilmedi** — sadece mevcut, zaten teyitli kaynak (`mapUrl`) doğrulandı.

---

## 5. LocalBusiness / HVACBusiness Schema Tasarımı

**Doğru tip: `HVACBusiness`** — kod zaten bunu kullanıyor (`petraLocalBusinessStructuredData()`), değiştirmeye gerek yok. schema.org hiyerarşisinde `HVACBusiness` → `HomeAndConstructionBusiness` → `LocalBusiness` → `Organization` + `Place` — Petra'nın iş koluna (ısıtma/soğutma/iklimlendirme) tam uyan, Google'ın da tanıdığı spesifik bir alt tip.

**Önerilen alanlar ve gerekçeleri (SADECE mevcut/teyitli veri, hiçbir uydurma yok):**

| Alan | Değer | Gerekçe |
|---|---|---|
| `@context` | `https://schema.org` | Mevcut |
| `@type` | `HVACBusiness` | Mevcut, değişmiyor |
| `@id` | `${siteUrl}/#business` (YENİ, önerilen) | §7'deki entity çakışmasını çözmek için |
| `name` | `petraSiteName` = "Petra Mühendislik" | Mevcut, teyitli |
| `alternateName` | `petraAlternateName` = "Petra İklimlendirme" (YENİ EKLEME — veri zaten teyitli, sadece şemaya hiç yansıtılmamış) | Teyitli, dosyada zaten var, sadece structured data'ya bağlanmamış |
| `url` | `publicEnv.siteUrl` | Mevcut |
| `telephone` | `petraContactInfo.phone` = "0535 791 11 96" | Mevcut, teyitli |
| `logo` | `${siteUrl}/icon.png` | Mevcut (Organization'da zaten kullanılıyor), gerçek dosya var |
| `image` | **EKLENMEYECEK** | Onaylı bir "işletme fotoğrafı" yok, uydurma riski |
| `address` | Yeni `PostalAddress` objesi (§6) | Kullanıcı tarafından bu turda teyit edildi |
| `geo` | `{"@type":"GeoCoordinates","latitude":37.58518,"longitude":36.92165}` | Zaten teyitli (§4), sadece şemaya hiç bağlanmamış |
| `areaServed` | `petraContactInfo.serviceArea` = "Onikişubat, Kahramanmaraş" | Mevcut, değişmiyor |
| `sameAs` | `petraSocialLinks` (Instagram) | Bugün SADECE Organization'da var, HVACBusiness'a da eklenmeli (aynı teyitli veri) |
| `priceRange` | **EKLENMEYECEK** | Hiç teyitli veri yok |
| `openingHours` | **EKLENMEYECEK** | `workingHours` hâlâ `null` |

---

## 6. Address JSON-LD Formatı — PostalAddress Ayrıştırması

Kullanıcının önerdiği ayrıştırma:
```
streetAddress: Şekerdere Blv 29/A
addressLocality: Onikişubat
addressRegion: Kahramanmaraş
postalCode: 46000
addressCountry: TR
```

**TESPİT — bu ayrıştırma "Yusuflar" (mahalle) bilgisini TAMAMEN DÜŞÜRÜYOR.** schema.org'un `PostalAddress` tipinde ayrı bir "mahalle/neighborhood" alanı YOK (resmi property listesi: `streetAddress`, `addressLocality`, `addressRegion`, `postalCode`, `addressCountry`, `postOfficeBoxNumber` — mahalle için özel bir alan tanımlı değil). Kullanıcının verdiği körlemesine mapping'i olduğu gibi uygularsam, teyit edilen adresin bir PARÇASI ("Yusuflar") hiçbir alana yazılmadan kaybolur — bu, talimatın kendisinin yasakladığı "adresi kısaltma" ile aynı sonucu doğurur (sadece JSON-LD içinde, görünmez biçimde).

**Bu nedenle körlemesine mapping YAPMADIM ve önerimi ayrıca raporluyorum:**

Türkiye'de yaygın pratik (ve Google'ın da kabul ettiği), mahalle bilgisini `streetAddress` alanının İÇİNE, sokak/bulvar bilgisiyle birlikte yazmaktır — schema.org'un kendisi de `streetAddress`'i "the street address" olarak serbest metin kabul eder (alt-parçalara ayırma zorunluluğu yok). Önerilen (adresin HİÇBİR PARÇASINI kaybetmeyen) ayrıştırma:

```json
{
  "@type": "PostalAddress",
  "streetAddress": "Yusuflar, Şekerdere Blv. No:29/A",
  "addressLocality": "Onikişubat",
  "addressRegion": "Kahramanmaraş",
  "postalCode": "46000",
  "addressCountry": "TR"
}
```

Bu, kullanıcının teyit ettiği HER kelimeyi (Yusuflar, Şekerdere Blv, 29/A, 46000, Onikişubat, Kahramanmaraş) korur, sadece "Blv" kısaltmasını netlik için "Blv." biçiminde noktalıyor (kısaltma yok, sadece noktalama — istenirse aynen "Blv" de bırakılabilir, bu kozmetik bir tercih, karar kullanıcıya bırakılmalı).

**`addressCountry: "TR"` gerekçesi:** Kullanıcının verdiği ham adres metninde ülke adı hiç geçmiyor ("Türkiye" yazmıyor), ama schema.org'un ISO 3166-1 alpha-2 kod beklediği (`TR`) ve adresin geri kalanının (Kahramanmaraş, Onikişubat, 46000 posta kodu) zaten açıkça Türkiye'yi işaret ettiği biliniyor — bu bir "şehir/ilçe uydurma" değil, verilen coğrafi bilginin (posta kodu + il + ilçe) DOĞRUDAN ve tartışmasız sonucudur. Yine de bu, raporun şeffaf olması için AYRICA belirtiliyor: `addressCountry` kullanıcının kelimesi kelimesine yazdığı metinde YOK, çıkarımla ekleniyor.

**Kod mimarisi notu — mevcut veri modelinde bu ayrıştırma İÇİN alan YOK:**
- `PetraContactInfo.address` (types.ts) → `string | null` — DÜZ metin, alt alanlara ayrılmış DEĞİL.
- `site_settings.address` (DB) → `text` sütunu — DB şeması da ayrıştırılmış adres alanları (street/locality/region/postalCode) İÇERMİYOR.
- **Sonuç:** Ayrıştırılmış `PostalAddress` objesi bugünkü veri modelinde YOK, YENİ bir kod-içi sabit olarak eklenmesi gerekiyor (§10, minimum implementasyon planı) — mevcut `petraContactInfo.address` (görüntüleme string'i, footer/iletişim sayfası için) DEĞİŞTİRİLMEDEN, YANINA ayrı bir yapılandırılmış adres sabiti eklenmesi öneriliyor (bkz. §10).

---

## 7. Organization + LocalBusiness Entity Çakışması

**Bugünkü durum (risk YOK, çünkü LocalBusiness hiç render olmuyor):** Homepage'de sadece `Organization` (+ `WebSite`, `FAQPage`) render ediliyor. `HVACBusiness` `null` döndüğü için ikisi ASLA aynı anda basılmıyor bugün.

**Adres eklenip `petraLocalBusinessStructuredData()` gerçek veri döndürmeye başladığı AN ortaya çıkacak risk:** `HVACBusiness` schema.org hiyerarşisinde zaten bir `Organization`'dır (`name`/`url`/`logo`/`telephone`/`sameAs` alanlarının TAMAMINI miras alır). Eğer kod değiştirilmeden sadece `address` doldurulursa, homepage'de AYNI ANDA hem `Organization` hem `HVACBusiness` render olur — Google'a AYNI işletme için İKİ AYRI top-level entity beyan edilmiş olur (isim/URL/logo/telefon/sameAs bilgileri BİREBİR tekrar eder, aralarında `@id` bağlantısı da YOK — bkz. §1'in `JsonLd` bileşen notu).

**Önerilen en temiz yaklaşım — TEK ENTİTE (Organization'ı ayrı tutmak yerine):**

Petra tek-lokasyonlu, fiziksel bir işletme olduğu için, schema.org/Google'ın pratik önerisi ayrı bir `Organization` bloğu TUTMAK değil, SADECE en spesifik tipi (`HVACBusiness`) kullanmaktır (`HVACBusiness` zaten bir `Organization`). Somut plan:

- Homepage'de, `petraLocalBusinessStructuredData()` gerçek veri döndürdüğünde (`address` dolu), `petraOrganizationStructuredData()` YERİNE `HVACBusiness` render edilir — İKİSİ BİRDEN DEĞİL.
- `petraLocalBusinessStructuredData()` `null` döndüğü sürece (bugünkü gibi, adres onaysızken), mevcut davranış (`Organization` + `WebSite` + `FAQPage`) AYNEN korunur — sıfır regresyon riski.
- Her iki fonksiyona da aynı `@id` (`${siteUrl}/#business`) eklenir — ikisi ASLA aynı anda render olmayacağı için bu tek `@id` hiçbir çakışma yaratmaz, ama `WebSite`'ın ileride bir `publisher: {"@id": "..."}` referansı eklemesi gerekirse hazır bir bağlantı noktası sağlar (bu turda `WebSite`'a böyle bir alan EKLENMİYOR, sadece gelecekte mümkün olacağı not ediliyor).

**Alternatif (daha invaziv, ÖNERİLMEYEN):** Organization'ı `WebSite.publisher` referansına indirip HVACBusiness'ı birincil kimlik olarak tutmak — bu, `WebSite` fonksiyonuna da dokunmayı gerektirir, "minimum değişiklik" ilkesine aykırı, gerekli değil.

### Somut JSON-LD örneği — İKİ DURUM, `@id` dahil, YAN YANA

**Durum 1 — BUGÜN (adres hâlâ `null`, hiçbir kod değişmedi, bu tam olarak production'da şu an render edilen):**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://www.petramuhendislik.com/#business",
  "name": "Petra Mühendislik",
  "url": "https://www.petramuhendislik.com",
  "logo": "https://www.petramuhendislik.com/icon.png",
  "telephone": "0535 791 11 96",
  "sameAs": ["https://www.instagram.com/petraamuhendislik"]
}
```
*(`HVACBusiness` bloğu HİÇ render edilmiyor — `petraLocalBusinessStructuredData()` `null` döner.)*
Tek fark bugünküyle: `@id` alanı YENİ eklenir (bugün Organization'da `@id` YOK) — bu, tek başına Google'ın okumasını DEĞİŞTİRMEZ, sadece §7'deki karşılıklı-dışlayıcı geçişi güvenli hale getirir.

**Durum 2 — İMPLEMENTASYON SONRASI (adres eklendiğinde, önerilen nihai hal):**
```json
{
  "@context": "https://schema.org",
  "@type": "HVACBusiness",
  "@id": "https://www.petramuhendislik.com/#business",
  "name": "Petra Mühendislik",
  "alternateName": "Petra İklimlendirme",
  "telephone": "0535 791 11 96",
  "url": "https://www.petramuhendislik.com",
  "logo": "https://www.petramuhendislik.com/icon.png",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Yusuflar, Şekerdere Blv. No:29/A",
    "addressLocality": "Onikişubat",
    "addressRegion": "Kahramanmaraş",
    "postalCode": "46000",
    "addressCountry": "TR"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 37.58518,
    "longitude": 36.92165
  },
  "areaServed": "Onikişubat, Kahramanmaraş",
  "sameAs": ["https://www.instagram.com/petraamuhendislik"]
}
```
*(Bu render edildiğinde `Organization` bloğu AYNI SAYFADA HİÇ basılmaz — ikisi asla birlikte görünmez. `WebSite` ve `FAQPage` blokları bundan etkilenmeden aynen devam eder.)*

**Aynı `@id` (`https://www.petramuhendislik.com/#business`) HER İKİ durumda da AYNI** — bu bilinçli: Google/herhangi bir tüketici, site zaman içinde Durum 1'den Durum 2'ye geçtiğinde AYNI entity kimliğinin güncellendiğini görür, iki ayrı/çakışan kimlik olarak değil.

---

## 8. Route Kapsamı

**Mevcut durum:** `Organization`/`WebSite`/`FAQPage` SADECE `/` (homepage) — 12 diğer public sayfa SADECE `BreadcrumbList` kullanıyor, site-kimlik şemalarını TEKRARLAMIYOR (§1 tablosu).

**Önerilen kapsam (DEĞİŞİKLİK YOK, mevcut deseni koru):** `HVACBusiness` de SADECE homepage'de render edilmeli — `Organization`'ın bugün olduğu YERİN AYNISI, sadece koşullu olarak onun yerine geçecek (§7). `/iletisim` sayfasına AYRICA bir `HVACBusiness` bloğu EKLEMEK gereksiz tekrar olur (aynı işletme kimliği zaten homepage'de bir kez beyan ediliyor, Google bunu site-geneli olarak zaten ilişkilendirir) — bu, talimatın "şemayı gereksiz yere bütün sayfalara basma" uyarısıyla birebir örtüşüyor.

---

## 9. Local SEO Uyumu

Teyit edilen işletme bilgileri ile mevcut public site arasında ÇELİŞKİ taraması:

| Alan | Public sitede görünen | Teyit edilen | Çelişki mi |
|---|---|---|---|
| İşletme adı | "Petra Mühendislik" (header/footer/title/Organization) | "Petra Mühendislik" | Yok |
| Telefon | "0535 791 11 96" (tel: linki, footer, Organization) | "0535 791 11 96" | Yok |
| Website | `https://www.petramuhendislik.com` (canonical, tüm sayfalar) | `https://www.petramuhendislik.com` | Yok |
| İlçe/Şehir | Footer/iletişim'de "Onikişubat, Kahramanmaraş" (serviceArea) | "...Onikişubat/Kahramanmaraş" | Yok — zaten TUTARLI, teyit edilen adresin ilçe/il kısmı public'te ZATEN doğru görünüyor |
| Tam sokak adresi | HİÇBİR YERDE gösterilmiyor (address null) | "Yusuflar, Şekerdere Blv 29/A, 46000" | Çelişki değil, sadece EKSİK — adres eklenince mevcut serviceArea metniyle ÇAKIŞMAYACAK (ilçe/şehir zaten birebir aynı) |
| Geo | Sadece "Konumu Görüntüle" linki (37.58518, 36.92165) | Aynı koordinatlar zaten kullanılıyor | Yok |

**Sonuç: hiçbir açık çelişki YOK** — mevcut public içerik (serviceArea = "Onikişubat, Kahramanmaraş") teyit edilen tam adresin ilçe/il kısmıyla ZATEN birebir örtüşüyor. Yeni bir şehir/landing sayfası veya içerik ÜRETİLMEDİ, ÖNERİLMİYOR — bu talimatın kapsamı dışında ve gerekli de değil.

---

## 10. Implementation Plan (SADECE PLAN — kod değiştirilmedi)

**A) Şu anda ne mevcut?**
- `Organization`+`WebSite`+`FAQPage` homepage'de aktif, doğru ve teyitli veriyle çalışıyor.
- `HVACBusiness` kodu YAZILMIŞ ama `address` eksik olduğu için hiç render olmuyor.
- Geo koordinatları teyitli ve kodda var (`mapUrl`) ama hiçbir structured data alanına bağlanmamış.
- `alternateName` ("Petra İklimlendirme") teyitli ve kodda var ama hiçbir structured data alanına bağlanmamış.

**B) Hangi alanlar eksik?**
- `petraContactInfo.address` → `null` (dolması gereken: kanonik adresin GÖRÜNTÜLEME string'i)
- Yapılandırılmış `PostalAddress` sabiti → HİÇ YOK (yeni eklenmeli)
- `petraLocalBusinessStructuredData()`'da `geo`, düzgün `address` (PostalAddress objesi), `@id`, `alternateName`, `sameAs` → HİÇ YOK
- Homepage'de Organization/HVACBusiness'ın karşılıklı dışlayıcı (mutually exclusive) render mantığı → HİÇ YOK (bugün Organization koşulsuz her zaman basılıyor)

**C) Hangi dosyalar değişecek? (kesin liste, minimum küme)**
1. `lib/data/petra/site-config.ts` — `petraContactInfo.address`'i kanonik adresin görüntüleme string'iyle doldur (footer/iletişim sayfasında görünecek metin); YENİ bir `petraBusinessAddress` (veya benzeri adlandırılmış) sabiti ekle, ayrıştırılmış `{streetAddress, addressLocality, addressRegion, postalCode, addressCountry}` alanlarıyla — SADECE `petraLocalBusinessStructuredData()`'nın kullanacağı, UI'ı etkilemeyen ayrı bir veri.
2. `lib/data/petra/types.ts` — (opsiyonel ama önerilen) yeni sabitin tipi için küçük bir `PetraPostalAddress` interface'i eklenebilir; `PetraContactInfo` DEĞİŞTİRİLMEZ (mevcut `address: string | null` aynen kalır, footer/contact-details.tsx'e dokunulmaz).
3. `lib/seo/structured-data.ts` — `petraLocalBusinessStructuredData()`: `address` alanını düz string yerine `PostalAddress` objesiyle değiştir, `geo` ekle, `@id` ekle, `alternateName` ekle, `sameAs` ekle (Organization'daki ile aynı kaynaktan). `petraOrganizationStructuredData()`'ya da AYNI `@id` eklenir (§7).
4. `app/(public)/page.tsx` — `<JsonLd data={organizationJsonLd} />` satırını, `localBusinessJsonLd` doluysa `HVACBusiness`'ı, doluysa `Organization`'ı basan koşullu bir ifadeyle değiştir (§7'deki "tek entite" mantığı).

**D) DB değişikliği gerekiyor mu? → HAYIR (bu implementasyon için).** `petraContactInfo.address` bugün de `site_settings` DB satırının `status:"draft"` olması nedeniyle her durumda statik dosyadan okunuyor (navigation fazındaki AYNI kanıtlanmış mekanizma — `getSiteSettings` `draft` satırı public'e hiç yansıtmıyor). Kod/statik-veri değişikliği tek başına yeterli ve production'da etkili olacak.

*(Ayrı, opsiyonel bir takip konusu: dashboard'daki `site_settings.address` alanı da doldurulup satır `published` yapılırsa, admin panelinin kendisi de gerçek durumu yansıtır — ama bu, bu implementasyonun ÖN KOŞULU değil, ayrı bir karardır, bu turda YAPILMADI/ÖNERİLMİYOR.)*

**E) Migration gerekiyor mu? → HAYIR.** Hiçbir DB şema değişikliği gerekmiyor — hem görüntüleme string'i hem yapılandırılmış adres, tamamen kod-içi (statik dosya) sabitler olarak eklenecek.

**F) Sadece kod değişikliği yeterli mi? → EVET.** §10-C'deki 4 dosya, migration/DB/ENV/DNS olmadan implementasyonu tamamlar.

**G) Production deploy sonrası hangi doğrulamalar yapılmalı? → bkz. §11.**

**Minimum değişiklik seti özeti:** 3 kod dosyası (+1 opsiyonel tip dosyası), 0 migration, 0 DB yazma, 0 ENV değişikliği.

---

## 11. Production Doğrulama Planı (implementasyon SONRASI için, bu turda ÇALIŞTIRILMADI)

Domain SADECE `https://www.petramuhendislik.com` — `petra-muhendislik.vercel.app` hiçbir doğrulamada canonical/schema kaynağı olarak KULLANILMAYACAK.

1. `curl -s https://www.petramuhendislik.com/ | grep -oE '"@type":"[A-Za-z]+"'` → `HVACBusiness` görünmeli, `Organization` GÖRÜNMEMELİ (§7'nin karşılıklı dışlayıcı mantığı doğru çalışıyorsa).
2. `HVACBusiness` bloğunun tam JSON'unu çıkarıp elle kontrol: `name`, `alternateName`, `telephone`, `url`, `logo`, `address.streetAddress/addressLocality/addressRegion/postalCode/addressCountry`, `geo.latitude/longitude`, `areaServed`, `sameAs`, `@id` — HER alan §5'teki tabloyla birebir eşleşmeli.
3. `<link rel="canonical">` hâlâ `https://www.petramuhendislik.com` — değişmemiş olmalı.
4. `WebSite` ve `FAQPage` blokları hâlâ değişmeden render oluyor mu (regresyon kontrolü).
5. `/iletisim` sayfasında YENİ bir `HVACBusiness`/`LocalBusiness` bloğu YOK (§8'deki "sadece homepage" kararının doğrulanması) — sadece mevcut `BreadcrumbList` duruyor.
6. Footer ve `/iletisim`'de artık görünen adres metninin, kullanıcının teyit ettiği adresle (kısaltılmadan/değiştirilmeden) birebir eşleştiğini görsel olarak kontrol et.
7. Google Rich Results Test (`search.google.com/test/rich-results`) ile `https://www.petramuhendislik.com/` URL'sini test et — `HVACBusiness`/`LocalBusiness` hatasız tanınmalı (bu adım Claude tarafından otomatik ÇALIŞTIRILAMAZ, kullanıcı tarafından manuel yapılmalı).
8. Search Console → URL Inspection → homepage'i yeniden tara, "Enhancements" raporunda birkaç gün içinde LocalBusiness'ın tanındığını kontrol et.

---

## FINAL STATUS

```
ADDRESS: CONFIRMED
CANONICAL ADDRESS: Yusuflar, Şekerdere Blv 29/A, 46000 Onikişubat/Kahramanmaraş
PHONE: 0535 791 11 96
CANONICAL WEBSITE: https://www.petramuhendislik.com
GEO: 37.58518, 36.92165 (mevcut repo kaynağı — lib/data/petra/site-config.ts'deki petraContactInfo.mapUrl — bu tam değerleri teyit ediyor, bu turda değiştirilmedi)
LOCALBUSINESS: READY FOR IMPLEMENTATION
REQUIRED CHANGES:
  1. lib/data/petra/site-config.ts — petraContactInfo.address'i kanonik adresin görüntüleme metniyle doldur; yeni, ayrıştırılmış bir "petraBusinessAddress" (streetAddress/addressLocality/addressRegion/postalCode/addressCountry) sabiti ekle
  2. lib/data/petra/types.ts — (opsiyonel) yeni sabit için küçük bir tip tanımı ekle; PetraContactInfo'ya DOKUNMA
  3. lib/seo/structured-data.ts — petraLocalBusinessStructuredData(): address'i PostalAddress objesiyle değiştir, geo/@id/alternateName/sameAs ekle; petraOrganizationStructuredData()'ya aynı @id'yi ekle
  4. app/(public)/page.tsx — Organization/HVACBusiness render'ını karşılıklı dışlayıcı yap (adres doluyken SADECE HVACBusiness, boşken bugünkü gibi SADECE Organization)
DB/MIGRATION REQUIRED: NO
PRODUCTION VERIFICATION: 
  - homepage JSON-LD @type listesi: HVACBusiness var, Organization YOK
  - HVACBusiness'ın tüm alanları (name/alternateName/telephone/url/logo/address/geo/areaServed/sameAs/@id) §5 tablosuyla birebir eşleşiyor
  - canonical hâlâ https://www.petramuhendislik.com (vercel.app YOK)
  - WebSite + FAQPage regresyon olmadan duruyor
  - /iletisim'de YENİ bir LocalBusiness bloğu YOK (sadece homepage'de)
  - Footer/iletişim sayfasındaki adres metni, teyit edilen adresle birebir (kısaltılmadan) eşleşiyor
  - Google Rich Results Test (manuel, kullanıcı tarafından)
```

**DUR VE RAPORLA.**
