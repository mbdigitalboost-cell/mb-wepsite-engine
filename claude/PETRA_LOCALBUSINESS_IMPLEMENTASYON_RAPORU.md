# Petra — LocalBusiness/HVACBusiness Implementasyon Raporu (Faz C)

**Durum: Kod değişikliği yapıldı, commit/push/deploy YAPILMADI.** DB/migration/ENV hiçbirine dokunulmadı. `claude/PETRA_LOCALBUSINESS_FINAL_AUDIT.md` §10'daki plan, kullanıcının verdiği kesin değerlerle (adres, PostalAddress, geo, @id) birebir uygulandı.

> **DÜZELTME (bu turda eklendi):** İlk implementasyonda `petraLocalBusinessStructuredData()`'ya `logo` alanı eklenmemişti — halbuki audit raporunun kendi onaylanan "Durum 2" örneği (`PETRA_LOCALBUSINESS_FINAL_AUDIT.md` §7) bunu içeriyordu. Kullanıcının tespiti üzerine tek satırlık eksik giderildi: `logo: \`${publicEnv.siteUrl}/icon.png\`` — `petraOrganizationStructuredData()`'da zaten kullanılan AYNI kaynaktan, aynı ifadeyle. Bu raporun tamamı (diff, tam kod, canlı doğrulama) artık bu düzeltmeyi YANSITAN GÜNCEL hâliyle aşağıda.

**Değişen tam olarak 4 dosya** (`git status --short` ile doğrulandı, fazlası yok):
```
 M app/(public)/page.tsx
 M lib/data/petra/site-config.ts
 M lib/data/petra/types.ts
 M lib/seo/structured-data.ts
```

---

## 1. Tam Diff (ham, `git diff`)

```diff
diff --git a/app/(public)/page.tsx b/app/(public)/page.tsx
index 9082d1f..dcd87db 100644
--- a/app/(public)/page.tsx
+++ b/app/(public)/page.tsx
@@ -153,24 +153,26 @@ export default async function HomePage() {
 
   const whatsappHref = buildWhatsappHref(whatsapp);
   const faqJsonLd = petraFaqStructuredData(faqs);
-  // Faz 10: adres henüz onaylanmadığı için bu şu an her zaman `null`
-  // döner (bkz. lib/seo/structured-data.ts) — sahte bir işletme beyanı
-  // riski yok, gerçek adres onaylandığında kod değişikliği gerekmeden
-  // otomatik olarak render olacak.
+  // Faz C: adres artık teyitli olduğu için bu gerçek bir HVACBusiness
+  // objesi döndürüyor (bkz. lib/seo/structured-data.ts) — bu yüzden
+  // aşağıda `organizationJsonLd` ile KARŞILIKLI DIŞLAYICI render
+  // ediliyor: HVACBusiness zaten bir Organization olduğu için ikisi
+  // aynı sayfada aynı anda basılırsa aynı işletme için iki ayrı
+  // top-level entity beyan edilmiş olur (bkz.
+  // claude/PETRA_LOCALBUSINESS_FINAL_AUDIT.md §7). Adres tekrar `null`
+  // olursa (olmayacak, ama kod hâlâ bu durumu ele alıyor) otomatik
+  // olarak Organization'a geri döner.
   const localBusinessJsonLd = petraLocalBusinessStructuredData();
-  // Faz SEO-3: site-wide kimlik şemaları — homepage'de bir kez render
-  // ediliyor (FAQ/LocalBusiness ile aynı yerleşim deseni), asla `null`
-  // dönmüyorlar (LocalBusiness'in aksine, eksik/onaysız bir alana bağımlı
-  // değiller — sadece zaten confirmed olan site adı/URL/telefon/sosyal
-  // hesap kullanıyorlar).
+  // Faz SEO-3: site-wide kimlik şeması — homepage'de bir kez render
+  // ediliyor, `localBusinessJsonLd` doluyken YERİNE `HVACBusiness`
+  // basıldığı için (yukarıdaki yorum) ikisi asla aynı anda görünmüyor.
   const organizationJsonLd = petraOrganizationStructuredData();
   const websiteJsonLd = petraWebsiteStructuredData();
 
   return (
     <>
       {faqJsonLd ? <JsonLd data={faqJsonLd} /> : null}
-      {localBusinessJsonLd ? <JsonLd data={localBusinessJsonLd} /> : null}
-      <JsonLd data={organizationJsonLd} />
+      {localBusinessJsonLd ? <JsonLd data={localBusinessJsonLd} /> : <JsonLd data={organizationJsonLd} />}
       <JsonLd data={websiteJsonLd} />
       <Hero whatsappHref={whatsappHref} hero={hero} />
       <TrustBar />
diff --git a/lib/data/petra/site-config.ts b/lib/data/petra/site-config.ts
index 5b2546c..a80b865 100644
--- a/lib/data/petra/site-config.ts
+++ b/lib/data/petra/site-config.ts
@@ -1,4 +1,4 @@
-import type { PetraContactInfo, PetraSocialLink } from "@/lib/data/petra/types";
+import type { PetraContactInfo, PetraPostalAddress, PetraSocialLink } from "@/lib/data/petra/types";
 
 export const petraSiteName = "Petra Mühendislik";
 
@@ -27,12 +27,15 @@ export const petraTagline = "İklimlendirmede mühendislik ve güven.";
  *   link (leading 0 instead of the 90 country code); this fixes that.
  * - `email`, `workingHours`: still `null` — not visible/confirmed in the
  *   Instagram source.
- * - `address`: still `null` — a candidate address IS visible in the
- *   screenshot ("Yusuflar Mahallesi, Şekerdere Caddesi No:29/A"), but the
- *   company reference doc flags conflicting formats (Cadde vs Bulvarı,
- *   No:29/A) as unresolved. Per instruction, this stays pending/unset
- *   rather than being written into contact info or structured data until
- *   the customer confirms one canonical format.
+ * - `address`: confirmed directly by the customer (2026-09-13) as the
+ *   canonical business address — "Yusuflar, Şekerdere Blv 29/A, 46000
+ *   Onikişubat/Kahramanmaraş". This resolves the previously-unresolved
+ *   Cadde-vs-Bulvarı ambiguity (an earlier Instagram-screenshot
+ *   candidate read "Yusuflar Mahallesi, Şekerdere Caddesi No:29/A" —
+ *   the customer's direct confirmation establishes it is "Blv"
+ *   (Bulvarı), not "Caddesi"). See `petraBusinessAddress` below for the
+ *   same address decomposed into schema.org's `PostalAddress` shape for
+ *   structured data.
  * - `mapUrl`: customer directly supplied GPS coordinates (2026-08-17,
  *   37.58518° K, 36.92165° D) to use in place of resolving the
  *   ambiguous street-address text above — a plain Google Maps
@@ -46,12 +49,29 @@ export const petraContactInfo: PetraContactInfo = {
   phoneDisplay: "0535 791 11 96",
   whatsapp: "+90 535 791 11 96",
   email: null,
-  address: null,
+  address: "Yusuflar, Şekerdere Blv 29/A, 46000 Onikişubat/Kahramanmaraş",
   serviceArea: "Onikişubat, Kahramanmaraş",
   workingHours: null,
   mapUrl: "https://www.google.com/maps?q=37.58518,36.92165",
 };
 
+/**
+ * Same confirmed address as `petraContactInfo.address` above, decomposed
+ * into schema.org's `PostalAddress` shape for `petraLocalBusinessStructuredData()`
+ * (lib/seo/structured-data.ts) — NOT consumed by the footer/contact page,
+ * which use the plain-text `petraContactInfo.address` instead. schema.org
+ * has no distinct "neighbourhood" property, so the confirmed mahalle
+ * ("Yusuflar") is folded into `streetAddress` alongside the bulvar/no
+ * rather than dropped.
+ */
+export const petraBusinessAddress: PetraPostalAddress = {
+  streetAddress: "Yusuflar, Şekerdere Blv. No:29/A",
+  addressLocality: "Onikişubat",
+  addressRegion: "Kahramanmaraş",
+  postalCode: "46000",
+  addressCountry: "TR",
+};
+
 /**
  * PENDING — do not treat as a confirmed/linkable URL yet.
  *
diff --git a/lib/data/petra/types.ts b/lib/data/petra/types.ts
index 2854e2d..eda8a40 100644
--- a/lib/data/petra/types.ts
+++ b/lib/data/petra/types.ts
@@ -18,14 +18,31 @@ export interface PetraContactInfo {
   workingHours: string | null;
   /**
    * Google Maps link built directly from customer-supplied GPS
-   * coordinates (not a resolved/typed street address — see
-   * `site-config.ts` for why `address` stays `null`). Renders as a
-   * "Konumu Görüntüle" link wherever contact details show, instead of
-   * inventing or guessing street-address text.
+   * coordinates (see `site-config.ts`'s `petraContactInfo` comment for
+   * the confirmation history). Renders as a "Konumu Görüntüle" link
+   * wherever contact details show, kept alongside (not replaced by) the
+   * plain-text `address` above.
    */
   mapUrl: string | null;
 }
 
+/**
+ * Structured-data-only decomposition of the confirmed business address
+ * (see `site-config.ts`'s `petraBusinessAddress`) — schema.org's
+ * `PostalAddress` shape. Kept separate from `PetraContactInfo.address`
+ * (a plain display string used by the footer/contact page) because the
+ * two have different consumers and schema.org has no "neighbourhood"
+ * property: the confirmed address's mahalle is folded into
+ * `streetAddress` here rather than dropped.
+ */
+export interface PetraPostalAddress {
+  streetAddress: string;
+  addressLocality: string;
+  addressRegion: string;
+  postalCode: string;
+  addressCountry: string;
+}
+
 export interface PetraSocialLink {
   platform: "instagram" | "facebook" | "linkedin" | "youtube";
   url: string;
diff --git a/lib/seo/structured-data.ts b/lib/seo/structured-data.ts
index 64ceb6a..59aa59c 100644
--- a/lib/seo/structured-data.ts
+++ b/lib/seo/structured-data.ts
@@ -1,7 +1,22 @@
-import { petraContactInfo, petraSiteName, petraSocialLinks } from "@/lib/data/petra/site-config";
+import {
+  petraAlternateName,
+  petraBusinessAddress,
+  petraContactInfo,
+  petraSiteName,
+  petraSocialLinks,
+} from "@/lib/data/petra/site-config";
 import { publicEnv } from "@/lib/config/env";
 import type { PetraFaq } from "@/lib/data/petra/types";
 
+/**
+ * Faz C: single shared `@id` for the site's one business identity —
+ * `petraLocalBusinessStructuredData()` and `petraOrganizationStructuredData()`
+ * both use it, but (per `app/(public)/page.tsx`) only ever ONE of the two
+ * is ever rendered on a given request, so the shared value never creates
+ * a duplicate/conflicting `@id` on the same page.
+ */
+const PETRA_BUSINESS_ID = `${publicEnv.siteUrl}/#business`;
+
 /**
  * JSON-LD builders. Each one returns `null` when it doesn't have enough
  * *confirmed* data to be truthful — callers must check for `null` and
@@ -34,6 +49,15 @@ export function petraFaqStructuredData(faqs: PetraFaq[]) {
  * Only emits `LocalBusiness` once both a real address and phone number
  * are confirmed — a partial/best-guess LocalBusiness entry is worse than
  * none, since search engines treat it as a factual claim.
+ *
+ * Faz C: `address` now uses `petraBusinessAddress` (schema.org
+ * `PostalAddress`, see lib/data/petra/site-config.ts) instead of the
+ * plain `petraContactInfo.address` display string — Google expects a
+ * structured address object here, not free text. `geo` uses the same
+ * customer-supplied coordinates already embedded in `petraContactInfo.mapUrl`
+ * (confirmed 2026-08-17, unchanged). `@id` lets this and
+ * `petraOrganizationStructuredData()` share one entity identity even
+ * though (per app/(public)/page.tsx) they never render on the same page.
  */
 export function petraLocalBusinessStructuredData() {
   if (!petraContactInfo.address || !petraContactInfo.phone) return null;
@@ -41,11 +65,22 @@ export function petraLocalBusinessStructuredData() {
   return {
     "@context": "https://schema.org",
     "@type": "HVACBusiness",
+    "@id": PETRA_BUSINESS_ID,
     name: petraSiteName,
+    ...(petraAlternateName ? { alternateName: petraAlternateName } : {}),
     telephone: petraContactInfo.phone,
-    address: petraContactInfo.address,
     url: publicEnv.siteUrl,
+    logo: `${publicEnv.siteUrl}/icon.png`,
+    address: {
+      "@type": "PostalAddress",
+      ...petraBusinessAddress,
+    },
+    geo: {
+      "@type": "GeoCoordinates",
+      latitude: 37.58518,
+      longitude: 36.92165,
+    },
     ...(petraContactInfo.serviceArea ? { areaServed: petraContactInfo.serviceArea } : {}),
+    ...(petraSocialLinks.length > 0 ? { sameAs: petraSocialLinks.map((link) => link.url) } : {}),
   };
 }
 
@@ -64,6 +100,7 @@ export function petraOrganizationStructuredData() {
   return {
     "@context": "https://schema.org",
     "@type": "Organization",
+    "@id": PETRA_BUSINESS_ID,
     name: petraSiteName,
     url: publicEnv.siteUrl,
     logo: `${publicEnv.siteUrl}/icon.png`,
```

---

## 2. `petraLocalBusinessStructuredData()` ve `petraOrganizationStructuredData()` — YENİ tam kodu

**`lib/seo/structured-data.ts`'in ilgili tüm bölümü (import'lar dahil, TAM güncel hali):**
```ts
import {
  petraAlternateName,
  petraBusinessAddress,
  petraContactInfo,
  petraSiteName,
  petraSocialLinks,
} from "@/lib/data/petra/site-config";
import { publicEnv } from "@/lib/config/env";
import type { PetraFaq } from "@/lib/data/petra/types";

/**
 * Faz C: single shared `@id` for the site's one business identity —
 * `petraLocalBusinessStructuredData()` and `petraOrganizationStructuredData()`
 * both use it, but (per `app/(public)/page.tsx`) only ever ONE of the two
 * is ever rendered on a given request, so the shared value never creates
 * a duplicate/conflicting `@id` on the same page.
 */
const PETRA_BUSINESS_ID = `${publicEnv.siteUrl}/#business`;

/**
 * Only emits `LocalBusiness` once both a real address and phone number
 * are confirmed — a partial/best-guess LocalBusiness entry is worse than
 * none, since search engines treat it as a factual claim.
 *
 * Faz C: `address` now uses `petraBusinessAddress` (schema.org
 * `PostalAddress`, see lib/data/petra/site-config.ts) instead of the
 * plain `petraContactInfo.address` display string — Google expects a
 * structured address object here, not free text. `geo` uses the same
 * customer-supplied coordinates already embedded in `petraContactInfo.mapUrl`
 * (confirmed 2026-08-17, unchanged). `@id` lets this and
 * `petraOrganizationStructuredData()` share one entity identity even
 * though (per app/(public)/page.tsx) they never render on the same page.
 */
export function petraLocalBusinessStructuredData() {
  if (!petraContactInfo.address || !petraContactInfo.phone) return null;

  return {
    "@context": "https://schema.org",
    "@type": "HVACBusiness",
    "@id": PETRA_BUSINESS_ID,
    name: petraSiteName,
    ...(petraAlternateName ? { alternateName: petraAlternateName } : {}),
    telephone: petraContactInfo.phone,
    url: publicEnv.siteUrl,
    logo: `${publicEnv.siteUrl}/icon.png`,
    address: {
      "@type": "PostalAddress",
      ...petraBusinessAddress,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 37.58518,
      longitude: 36.92165,
    },
    ...(petraContactInfo.serviceArea ? { areaServed: petraContactInfo.serviceArea } : {}),
    ...(petraSocialLinks.length > 0 ? { sameAs: petraSocialLinks.map((link) => link.url) } : {}),
  };
}

export function petraOrganizationStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": PETRA_BUSINESS_ID,
    name: petraSiteName,
    url: publicEnv.siteUrl,
    logo: `${publicEnv.siteUrl}/icon.png`,
    ...(petraContactInfo.phone ? { telephone: petraContactInfo.phone } : {}),
    ...(petraContactInfo.address ? { address: petraContactInfo.address } : {}),
    ...(petraSocialLinks.length > 0 ? { sameAs: petraSocialLinks.map((link) => link.url) } : {}),
  };
}
```
*(Not: `petraOrganizationStructuredData()`'ya talimat gereği SADECE `@id` eklendi, başka hiçbir satır değiştirilmedi — `address` alanı hâlâ eski mantığıyla duruyor, ama artık `petraContactInfo.address` her zaman dolu olduğu için bu dal HER ZAMAN `true` olur; pratikte önemi yok çünkü Organization, `localBusinessJsonLd` doluyken (yani adres varken) zaten hiç render edilmiyor — bkz. §7/page.tsx değişikliği.)*

---

## 3. Typecheck / Lint / Build — Ham Çıktı

**İlk implementasyon (logo eklenmeden önce) için çalıştırıldı — 3a/3b/3c:**

### 3a. Typecheck — `node_modules/.bin/tsc --noEmit`
```
(çıktı yok — sıfır hata)
EXIT_CODE:0
```

### 3b. Lint — `npm run lint`
```
> mb-website-engine@0.1.0 lint
> eslint

EXIT_CODE:0
```
(Sıfır lint hatası/uyarısı.)

### 3c. Build — `npm run build`
```
EXIT_CODE:0
```
Route tablosunun ilgili kısmı (regresyon yok, tüm sayfalar başarıyla derlendi):
```
├ ○ /                                                                      5m      1y
├ ○ /iletisim
├ ○ /hakkimizda
├ ○ /referanslar                                                           5m      1y
├ ○ /kampanyalar                                                           5m      1y
...
```
(Homepage ve `/iletisim` dahil hiçbir route build'i kırmadı.)

### 3d. `logo` düzeltmesi SONRASI yeniden çalıştırma (kullanıcının bu turki talebi: SADECE typecheck + build)

**Typecheck — `node_modules/.bin/tsc --noEmit`:**
```
(çıktı yok — sıfır hata)
TYPECHECK_EXIT:0
```

**Build — `npm run build`:**
```
BUILD_EXIT:0
```

(Lint bu turda talep edilmediği için tekrar çalıştırılmadı — tek satırlık ekleme, `petraOrganizationStructuredData()`'da zaten lint'ten geçmiş AYNI `logo: \`${publicEnv.siteUrl}/icon.png\`` ifadesinin birebir kopyası olduğu için yeni bir lint riski taşımıyor.)

---

## 4. Local Doğrulama — `petraLocalBusinessStructuredData()`'nın Artık Dolu Obje Döndürdüğünün ve `page.tsx`'in HVACBusiness Bastığının Kanıtı

Local dev server (`npm run dev`, `http://localhost:3000`) üzerinden alınan CANLI render çıktısı (kod okuması değil, gerçek HTTP yanıtı):

**Homepage JSON-LD `@type` listesi (`curl http://localhost:3000/ | grep -oE '"@type":"[A-Za-z]+"' | sort -u`):**
```
"@type":"Answer"
"@type":"FAQPage"
"@type":"GeoCoordinates"
"@type":"HVACBusiness"
"@type":"PostalAddress"
"@type":"Question"
"@type":"WebSite"
```
**`Organization` SIFIR kez geçiyor** (`grep -c '"@type":"Organization"'` → `0`) — karşılıklı dışlayıcı render doğru çalışıyor.

**`HVACBusiness` bloğunun TAM ham JSON'u (production'da `@id`/`url` `https://www.petramuhendislik.com` olacak, local'de `NEXT_PUBLIC_SITE_URL=http://localhost:3000` olduğu için o domain görünüyor — bu, `publicEnv.siteUrl`'in ENV-tabanlı olmasının beklenen, doğru davranışı):**
```json
{
  "@context": "https://schema.org",
  "@type": "HVACBusiness",
  "@id": "http://localhost:3000/#business",
  "name": "Petra Mühendislik",
  "alternateName": "Petra İklimlendirme",
  "telephone": "0535 791 11 96",
  "url": "http://localhost:3000",
  "logo": "http://localhost:3000/icon.png",
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
Her alan (`name`, `alternateName`, `telephone`, `url`, `logo`, `address.*`, `geo.*`, `areaServed`, `sameAs`, `@id`) kullanıcının verdiği kesin değerlerle birebir eşleşiyor — hiçbir kısaltma/yuvarlama/uydurma yok. `logo` alanı `petraOrganizationStructuredData()`'daki AYNI ifadeden (`${publicEnv.siteUrl}/icon.png`) geliyor, ayrı/farklı bir kaynak icat edilmedi.

---

## 5. Footer ve `/iletisim` — Yeni Adres Metninin Ham Render Çıktısı

**Footer'daki (`components/layout/site-footer.tsx`, `address ?? serviceArea` dalı artık `address` doluyken tetikleniyor) ham HTML'den çıkarılan metin:**
```
Yusuflar, Şekerdere Blv 29/A, 46000 Onikişubat/Kahramanmaraş
```

**`/iletisim` sayfasındaki (`components/sections/contact-details.tsx`, aynı `address ?? serviceArea` mantığı) ham HTML'den çıkarılan metin:**
```
Yusuflar, Şekerdere Blv 29/A, 46000 Onikişubat/Kahramanmaraş
```

İkisi de kullanıcının verdiği KANONİK adresle (kısaltılmadan, "Blv" kısaltması dahi değiştirilmeden — çünkü bu, `petraContactInfo.address`'in TAM METNİ, PostalAddress'teki noktalı "Blv." kısaltması SADECE `petraBusinessAddress`'te, JSON-LD'ye özel) birebir aynı.

**`/iletisim`'de fazladan bir `HVACBusiness`/`LocalBusiness` bloğu YOK (§8'deki "sadece homepage" kararı korundu):**
```
$ grep -c "HVACBusiness\|LocalBusiness" /tmp/faz_c_iletisim.html
0
```

**`/iletisim`'in `BreadcrumbList`'i regresyon olmadan duruyor:**
```json
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Ana Sayfa","item":"http://localhost:3000/"},{"@type":"ListItem","position":2,"name":"İletişim","item":"http://localhost:3000/iletisim"}]}
```

**`/iletisim` canonical ve HTTP durumu:**
```
<link rel="canonical" href="http://localhost:3000/iletisim"/>
HTTP:200
```

Test sonunda local dev server durduruldu (port 3000 dinleyen process sonlandırıldı).

---

## 6. Talimat Kontrol Listesi

| Kural | Durum |
|---|---|
| Sadece §10'daki 4 dosyaya dokunuldu mu | ✅ `git status --short` ile doğrulandı, tam 4 dosya, fazlası yok |
| Adres/telefon/geo aynen kullanıldı mı (kısaltma/değişiklik yok) | ✅ Hepsi kullanıcının verdiği değerlerle birebir |
| `@id` her iki fonksiyona da AYNI değerle eklendi mi | ✅ `https://www.petramuhendislik.com/#business` (local'de `localhost:3000` — ENV farkı, beklenen) |
| Organization/HVACBusiness karşılıklı dışlayıcı mı | ✅ Canlı render ile doğrulandı, `Organization` sıfır kez geçiyor |
| WebSite/FAQPage dokunulmadan kaldı mı | ✅ İkisi de değişmeden render oluyor |
| typecheck/lint/build geçti mi (ilk implementasyon) | ✅ Üçü de `EXIT_CODE:0` |
| `logo` alanı eklendi mi (audit'in "Durum 2" örneğiyle tutarlı) | ✅ `logo: \`${publicEnv.siteUrl}/icon.png\`` eklendi, `petraOrganizationStructuredData()`'daki AYNI kaynak |
| `logo` düzeltmesi sonrası typecheck/build tekrar geçti mi | ✅ İkisi de `EXIT_CODE:0` |
| `logo` düzeltmesi sonrası canlı render ile kanıtlandı mı | ✅ `"logo":"http://localhost:3000/icon.png"` HVACBusiness bloğunda görünüyor |
| commit/push/deploy yapıldı mı | ❌ YAPILMADI (talimat gereği) |
| DB/migration/ENV değişti mi | ❌ Değişmedi |

---

## SONUÇ

**İmplementasyon tamamlandı ve local'de eksiksiz doğrulandı.** 4 dosyalık minimum değişiklik seti uygulandı, typecheck/lint/build sıfır hatayla geçti, homepage artık `HVACBusiness`'ı (adres/geo/@id/alternateName/logo/sameAs dahil TÜM alanlarla, kullanıcının verdiği kesin değerlerle) basıyor ve `Organization` ile ASLA aynı anda görünmüyor. `logo` alanının eksik olduğu kullanıcı tarafından tespit edildi, tek satırlık düzeltme (`petraOrganizationStructuredData()`'daki AYNI kaynaktan) eklendi ve typecheck/build ile yeniden doğrulandı. Footer/`/iletisim`'deki adres metni artık tam ve doğru. Commit/push/deploy için ayrı onay bekleniyor.

**DUR VE RAPORLA.**
