# Petra — Footer Görsel Düzeltmesi + Hizmetler Sayfası Detaylandırma

**Durum: Kod değişikliği yapıldı, commit/push/deploy YAPILMADI.** DB/migration hiçbirine dokunulmadı.

---

## PART A — Footer Görsel Bozulma Düzeltmesi

### 1. Kök Neden

`components/layout/site-footer.tsx`'in İletişim sütununda, adres satırı şöyleydi:
```tsx
<li className="flex items-center gap-2">
  <Icon icon={MapPin} size="sm" />
  {address ?? serviceArea}
  {mapUrl ? <a ...>Konumu Görüntüle</a> : null}
</li>
```
`flex items-center gap-2` — bu bir **tek satırlık, `nowrap` flex satırı** (Tailwind'in `flex` sınıfı varsayılan olarak `flex-wrap: nowrap` üretir). Adres kısa bir metinken (`serviceArea`, "Onikişubat, Kahramanmaraş") sorun çıkmıyordu. Faz C'de adres, tam bir sokak adresiyle ("Yusuflar, Şekerdere Blv 29/A, 46000 Onikişubat/Kahramanmaraş") dolduruldu — bu metin İletişim sütununun genişliğinde 3 satıra sarıyor. Flex satırının kendisi `nowrap` olduğu için, adres metni kendi kutusu içinde 3 satıra sardıkça, YANINDAKİ "Konumu Görüntüle" linki bir alt satıra DÜŞMÜYOR — adres bloğunun sağına, dikey ortalanmış (`items-center`) şekilde yerleşmeye çalışıyor ve İletişim sütununun sağ sınırını (grid `minmax(0,1fr)` ile sabitlenmiş olsa da, flex item'ın `min-width:auto` davranışı nedeniyle) aşıp bitişik "Yasal" sütununun (`Çerez Politikası` vb.) ÜZERİNE biniyordu.

### 2. Uygulanan Düzeltme

`<li>` yapısı `flex items-center` (tek satır) yerine `flex flex-col` (dikey yığın) olarak değiştirildi: adres kendi satırında serbestçe sarıyor, harita linki AYRI bir satırda, adresin ALTINDA, kendi pin ikonuyla duruyor (istenen ek: "harita linki/ikonu adresin hemen altına, tıklanabilir pin ikonu"). İletişim `<div>`'ine ayrıca `min-w-0` eklendi (savunma amaçlı, gelecekte benzer taşma riskini azaltmak için).

**Tam diff (`git diff -- components/layout/site-footer.tsx`):**
```diff
diff --git a/components/layout/site-footer.tsx b/components/layout/site-footer.tsx
index 3353715..e6fb5c4 100644
--- a/components/layout/site-footer.tsx
+++ b/components/layout/site-footer.tsx
@@ -101,7 +101,7 @@ export function SiteFooter({
           </ul>
         </nav>
 
-        <div>
+        <div className="min-w-0">
           <h2 className="text-sm font-semibold text-white">İletişim</h2>
           <ul className="mt-4 space-y-3 text-sm text-brand-muted">
             {phone ? (
@@ -138,16 +138,30 @@ export function SiteFooter({
               </li>
             ) : null}
             {address ?? serviceArea ? (
-              <li className="flex items-center gap-2">
-                <Icon icon={MapPin} size="sm" />
-                {address ?? serviceArea}
+              <li className="flex flex-col gap-2">
+                {/*
+                  Faz C düzeltmesi: adres artık 3 satıra kadar sarabilen
+                  gerçek bir sokak adresi (önceden kısa `serviceArea`
+                  metniydi) — tek bir `flex items-center` satırında ikon +
+                  adres + "Konumu Görüntüle" linkini yan yana tutmak,
+                  adres sarıldıkça linki komşu "Yasal" sütununun üzerine
+                  taşırıyordu (flex-nowrap, linki bir sonraki satıra
+                  düşürmüyor). Adres artık kendi satırında serbestçe
+                  sarıyor, harita linki AYRI, adresin altında, kendi pin
+                  ikonuyla ayrı bir satır — hiçbir komşu sütuna taşmıyor.
+                */}
+                <span className="flex items-start gap-2">
+                  <Icon icon={MapPin} size="sm" className="mt-0.5" />
+                  <span>{address ?? serviceArea}</span>
+                </span>
                 {mapUrl ? (
                   <a
                     href={mapUrl}
                     target="_blank"
                     rel="noopener noreferrer"
-                    className="text-brand-primary hover:text-white"
+                    className="flex items-center gap-2 pl-6 text-brand-primary hover:text-white"
                   >
+                    <Icon icon={MapPin} size="sm" />
                     Konumu Görüntüle
                   </a>
                 ) : null}
```

### 3. Görsel Doğrulama (Playwright ile GERÇEK ekran görüntüsü — ÖNEMLİ metodoloji notu)

Bu ortamda `chromium-cli` bulunmadığı için, görsel doğrulama amacıyla Playwright + Chromium **geçici olarak** kuruldu (`npm install --no-save playwright@1.48.0`, tarayıcı ikili dosyası `npx playwright install chromium` ile indirildi), local dev server'a (`http://localhost:3000`) karşı gerçek ekran görüntüleri alındı, sonra **hem paket hem geçici script'ler temizlendi** (`package.json`/`package-lock.json` DEĞİŞMEDİ — `git diff --stat` ile doğrulandı, `--no-save` kullanıldığı için).

**Masaüstü (1280px) — DÜZELTME SONRASI, footer bölümü:**
- Adres 3 satıra düzgünce sarıyor: "Yusuflar, Şekerdere Blv / 29/A, 46000 / Onikişubat/Kahramanmaraş"
- "Konumu Görüntüle" (pin ikonuyla) adresin HEMEN ALTINDA, kendi satırında
- "Yasal" sütunu (Gizlilik Politikası / KVKK / Çerez Politikası / Kullanım Şartları) TAMAMEN okunaklı, hiçbir çakışma YOK — sütunlar arasında net bir boşluk var

**Mobil (390px) — DÜZELTME SONRASI:** Tek sütun akışında adres + "Konumu Görüntüle" + "Yasal" bölümü net şekilde ayrı, sıralı, çakışmasız.

**Sayısal kanıt (Playwright `getBoundingClientRect()` ile, masaüstü 1280px):**
```json
{
  "iletisimHeader": { "left": 777.59, "right": 956.80 },
  "yasalHeader":     { "left": 1004.80, "right": 1183.98 },
  "addressText":     { "left": 777.59, "right": 956.80, "height": 60 },
  "mapLink":         { "left": 777.59, "right": 956.80, "top": 1090.66, "bottom": 1110.66 },
  "cerezLink":       { "left": 1004.80, "right": 1096.81, "top": 1033.66, "bottom": 1052.66 }
}
```
`mapLink.right` (956.80) < `cerezLink.left` (1004.80) — **~48px boşluk, SIFIR yatay çakışma.** `addressText` yüksekliği 60px (3 satır × 20px) ve TAMAMEN İletişim sütunu sınırları içinde (777.59–956.80) — komşu sütuna taşmıyor.

**Console hataları:** Sadece bilinen, ilgisiz local-env uyarısı (`[cms/connection] Platform admin client unavailable` — Platform admin env değişkenlerinin local'de tanımsız olmasından, bu oturum boyunca zaten bilinen ve düzeltmeyle ilgisiz bir durum). Footer değişikliğine dair YENİ bir hata/uyarı YOK.

---

## PART B — Hizmetler Sayfası Detaylandırma

### 1. Mevcut Yapı

`/hizmetler` (`app/(public)/hizmetler/page.tsx`), `lib/data/petra/services.ts`'teki `petraServices` dizisini (CMS-bağlı, `getServices`/`fetchPublishedList` ile) kullanarak Petra'nın **satış SÜRECİNİ** (Satış → Keşif → Projelendirme → Kurulum → Teknik Servis, 5 adım) basit, ikon'suz kartlarla gösteriyordu.

**Kritik ayrım:** Kullanıcının verdiği 5 hizmet (Klima Montajı, Arıza Tespiti/Onarım, Gaz Dolumu, Deplasman, Temizlik) bir SÜREÇ değil, SOMUT hizmet KATEGORİLERİ — bu nedenle mevcut `petraServices` dizisine EKLEMEK yerine (ki bu iki farklı kavramı karıştırır ve CMS-yönetilen admin içeriğine statik veri karıştırmış olurdu), **ayrı, yeni bir statik veri kümesi + ayrı bir sayfa bölümü** olarak eklendi — talimatın "mevcut sayfanın altına/içine... ekle" ve "yeni route oluşturma" isteğiyle birebir uyumlu.

### 2. Yeni Dosyalar (TAM içerik)

**`lib/data/petra/service-offerings.ts` (YENİ):**
```ts
import type { PetraService } from "@/lib/data/petra/types";

/**
 * Faz D: concrete klima hizmet kategorileri, müşteri tarafından doğrudan
 * teyit edildi (2026-09-13) — `petraServices` (satış → keşif →
 * projelendirme → kurulum → teknik servis) ile KARIŞTIRILMAMALI: o dizi
 * Petra'nın genel SATIŞ SÜRECİNİ, bu dizi ise /hizmetler sayfasında ayrı
 * bir bölüm olarak gösterilen SOMUT hizmet kategorilerini temsil ediyor.
 * Açıklamalar bilinçli olarak GENEL tutuldu — garanti süresi, sertifika,
 * deneyim yılı veya teknik detay (ör. gaz tipi/basınç değeri) UYDURULMADI,
 * sadece hizmet adının doğal bir cümleyle açıklaması + mevcut teyitli
 * serviceArea ("Onikişubat, Kahramanmaraş") ile tutarlı bir bağlam.
 */
export const petraServiceOfferings: PetraService[] = [
  {
    title: "Klima Montajı ve Kurulumu",
    description: "Yeni klima sistemlerinizin ihtiyacınıza uygun kapasite ve konumda profesyonelce monte edilip devreye alınması.",
  },
  {
    title: "Arıza Tespiti ve Onarım (Tamir)",
    description: "Soğutmayan, ısıtmayan veya beklenmedik şekilde duran klimalarınızda arızanın tespiti ve onarımı.",
  },
  {
    title: "Klima Gaz Dolumu (Gaz Şarjı)",
    description: "Soğutma performansı düşen sistemlerde gaz seviyesinin kontrolü ve gerektiğinde gaz dolumu.",
  },
  {
    title: "Klima Deplasesi (Sökme ve Yeniden Takma)",
    description: "Taşınma veya yer değişikliği durumunda klimanızın güvenle sökülüp yeni konumuna yeniden monte edilmesi.",
  },
  {
    title: "Klima Temizliği",
    description: "İç ve dış ünitenin periyodik temizliğiyle klimanızın verimli ve hijyenik çalışmasının sağlanması.",
  },
];
```

**`lib/data/petra/service-offering-icons.ts` (YENİ):**
```ts
import { Wrench, Hammer, Droplets, Move, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const petraServiceOfferingIcons: Record<string, LucideIcon> = {
  "Klima Montajı ve Kurulumu": Wrench,
  "Arıza Tespiti ve Onarım (Tamir)": Hammer,
  "Klima Gaz Dolumu (Gaz Şarjı)": Droplets,
  "Klima Deplasesi (Sökme ve Yeniden Takma)": Move,
  "Klima Temizliği": Sparkles,
};

export const petraServiceOfferingIconFallback: LucideIcon = Wrench;
```
(`lib/data/petra/why-petra-icons.ts` / `process-icons.ts` ile AYNI, zaten repo'da kanıtlanmış "title'a göre ikon eşleme" deseni — yeni bir desen icat edilmedi.)

### 3. `app/(public)/hizmetler/page.tsx` Diff'i (ilgili kısım)

```diff
+import { petraServiceOfferings } from "@/lib/data/petra/service-offerings";
+import { petraServiceOfferingIcons, petraServiceOfferingIconFallback } from "@/lib/data/petra/service-offering-icons";
 import { getServices } from "@/lib/cms/adapters";
 import { isCmsRow, mapServiceRows } from "@/lib/cms/petra/mappers";
 import { resolveStaticPageSeo, applyHomeSeoOverrides } from "@/lib/seo/build-metadata";
 import { petraBreadcrumbStructuredData } from "@/lib/seo/structured-data";
 import { JsonLd } from "@/components/seo/json-ld";
+import { Icon } from "@/components/ui/icon";
 import type { NamedContentRow } from "@/lib/cms/customer-types";
...
           </Reveal>
         </Container>
       </section>
+
+      {/* Faz D: 5 somut hizmet kategorisi, mevcut satış-süreci grid'inden AYRI, ek bölüm. */}
+      <section className="border-t border-white/10 py-24 lg:py-32">
+        <Container>
+          <Reveal>
+            <h2 className="max-w-xl font-[family-name:var(--font-brand-heading)] text-[32px] leading-tight font-semibold text-white sm:text-[42px]">
+              Sunduğumuz Klima Hizmetleri
+            </h2>
+            <p className="mt-4 max-w-xl text-sm text-brand-muted">
+              Onikişubat, Kahramanmaraş ve çevresinde, aşağıdaki hizmet kategorilerinin her birinde yanınızdayız.
+            </p>
+          </Reveal>
+
+          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
+            {petraServiceOfferings.map((offering, index) => (
+              <Reveal key={offering.title} index={index}>
+                <div className="group h-full rounded-[var(--radius-brand)] border border-white/10 bg-white/[0.03] p-6 transition-[transform,border-color] duration-300 ease-[var(--motion-easing)] hover:-translate-y-1 hover:border-brand-primary/30 sm:p-7">
+                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-brand-background/60 transition-transform duration-300 group-hover:scale-105">
+                    <Icon icon={petraServiceOfferingIcons[offering.title] ?? petraServiceOfferingIconFallback} size="md" className="text-brand-primary" />
+                  </span>
+                  <h3 className="mt-6 text-base font-semibold text-white">{offering.title}</h3>
+                  <p className="mt-2 text-sm text-brand-muted">{offering.description}</p>
+                </div>
+              </Reveal>
+            ))}
+          </div>
+        </Container>
+      </section>
     </>
   );
 }
```

**Tasarım dili:** İkon-daire + rounded border kart, `components/sections/why-petra.tsx`'in görsel dilinden (border, `rounded-[var(--radius-brand)]`, ikon dairesi, hover'da hafif yukarı kayma) SADELEŞTİRİLEREK alındı — o bileşenin parallax/HvacGridPattern/çift-gradient gibi ağır dekoratif katmanları YOK (minimum değişiklik ilkesi), sadece temel kart dili tekrar kullanıldı. Mevcut satış-süreci grid'i (üstteki 5 kart) HİÇ değiştirilmedi.

**Route değişikliği YOK** — `/hizmetler` URL'i aynı, `generateMetadata`/canonical/breadcrumb dokunulmadı.

### 4. Görsel Doğrulama

İlk denemede (`fullPage` screenshot, kaydırma olmadan) 4. ve 5. kartlar ekran görüntüsünde boş görünmüştü — bu bir GERÇEK HATA DEĞİL, `Reveal` bileşeninin `IntersectionObserver` tabanlı scroll-animasyonunun (`components/ui/reveal.tsx`), Playwright'ın `fullPage` modunun sayfayı kaydırmadan anında tam yüksekliğe resize etmesiyle zamanlama uyuşmazlığı yaşamasıydı (gerçek kullanıcı kaydırdıkça normal çalışıyor — ham HTML'de `curl` ile TÜM 5 başlığın DOM'da var olduğu ayrıca doğrulandı). Sabit, yeterince uzun bir viewport'la (kaydırma gerektirmeden) yeniden çekilen ekran görüntüsünde:

**Masaüstü (1280px):** 5 kart, 3+2 düzeninde (`lg:grid-cols-3`), her biri kendi ikonuyla (anahtar, çekiç, damla, taşıma, parıltı), başlık + açıklama net okunaklı, üstteki mevcut süreç bölümü DEĞİŞMEDEN duruyor.

**Mobil (390px):** Tek sütun, 5 kart sırayla, aynı içerik, taşma/çakışma yok.

**Console hataları:** Sadece bilinen ilgisiz local-env uyarısı (yukarıdaki gibi), yeni hata YOK.

---

## Ortak Testler (Part A + Part B, ayrı ayrı çalıştırıldı, hepsi geçti)

### Typecheck
```
Part A: TYPECHECK_EXIT:0 (çıktı yok)
Part B: TYPECHECK_EXIT:0 (çıktı yok)
```

### Lint
```
Part A: LINT_EXIT:0
> mb-website-engine@0.1.0 lint
> eslint

Part B: LINT_EXIT:0
> mb-website-engine@0.1.0 lint
> eslint
```

### Build
```
Part A: BUILD_EXIT:0
Part B: BUILD_EXIT:0
```
(`/hizmetler` ve `/` route'ları dahil hiçbir sayfa build'i kırmadı.)

---

## Değişen / Eklenen Dosyalar (tam liste)

| Dosya | Durum |
|---|---|
| `components/layout/site-footer.tsx` | Değişti (Part A) |
| `app/(public)/hizmetler/page.tsx` | Değişti (Part B) |
| `lib/data/petra/service-offerings.ts` | YENİ (Part B) |
| `lib/data/petra/service-offering-icons.ts` | YENİ (Part B) |

`git status --short` ile doğrulandı — bu 4 dosya dışında (ve bu oturumdan önce zaten değişmiş olan `.gitignore`/`PHASE_12_FINAL_AUDIT.md` dışında) başka hiçbir dosyaya dokunulmadı. Geçici Playwright paketi ve ekran görüntüsü script'leri temizlendi, `package.json`/`package-lock.json` DEĞİŞMEDİ.

---

## SONUÇ

Her iki parça da tamamlandı, typecheck/lint/build ile ve gerçek Playwright ekran görüntüleriyle (sayısal `getBoundingClientRect()` kanıtı dahil) doğrulandı. Footer çakışması tamamen giderildi, harita linki adresin altında kendi pin ikonuyla duruyor. `/hizmetler` sayfası, mevcut tasarımı bozmadan, aynı URL'de, 5 gerçek hizmet kategorisiyle zenginleştirildi — hiçbir teknik detay/garanti/sertifika uydurulmadı.

Commit/push/deploy YAPILMADI — ayrı onay bekleniyor. Bir sonraki adım: Part C (read-only final QA audit).

**DUR VE RAPORLA (Part A/B için).**

---

## PART E — Ek Düzeltmeler (Part C denetiminde bulunan 2 IMPORTANT bulgu)

**Durum: Kod değişikliği yapıldı, commit/push/deploy YAPILMADI.** DB/migration hiçbirine dokunulmadı. Sadece bu 2 bulgu için gereken 2 dosyaya dokunuldu.

### E0. Ham İçerik Talebi — `lib/data/petra/service-offerings.ts` (TAM içerik, `cat -n`)

```
     1	import type { PetraService } from "@/lib/data/petra/types";
     2	
     3	/**
     4	 * Faz D: concrete klima hizmet kategorileri, müşteri tarafından doğrudan
     5	 * teyit edildi (2026-09-13) — `petraServices` (satış → keşif →
     6	 * projelendirme → kurulum → teknik servis) ile KARIŞTIRILMAMALI: o dizi
     7	 * Petra'nın genel SATIŞ SÜRECİNİ, bu dizi ise /hizmetler sayfasında ayrı
     8	 * bir bölüm olarak gösterilen SOMUT hizmet kategorilerini temsil ediyor.
     9	 * Açıklamalar bilinçli olarak GENEL tutuldu — garanti süresi, sertifika,
    10	 * deneyim yılı veya teknik detay (ör. gaz tipi/basınç değeri) UYDURULMADI,
    11	 * sadece hizmet adının doğal bir cümleyle açıklaması + mevcut teyitli
    12	 * serviceArea ("Onikişubat, Kahramanmaraş") ile tutarlı bir bağlam.
    13	 */
    14	export const petraServiceOfferings: PetraService[] = [
    15	  {
    16	    title: "Klima Montajı ve Kurulumu",
    17	    description: "Yeni klima sistemlerinizin ihtiyacınıza uygun kapasite ve konumda profesyonelce monte edilip devreye alınması.",
    18	  },
    19	  {
    20	    title: "Arıza Tespiti ve Onarım (Tamir)",
    21	    description: "Soğutmayan, ısıtmayan veya beklenmedik şekilde duran klimalarınızda arızanın tespiti ve onarımı.",
    22	  },
    23	  {
    24	    title: "Klima Gaz Dolumu (Gaz Şarjı)",
    25	    description: "Soğutma performansı düşen sistemlerde gaz seviyesinin kontrolü ve gerektiğinde gaz dolumu.",
    26	  },
    27	  {
    28	    title: "Klima Deplasesi (Sökme ve Yeniden Takma)",
    29	    description: "Taşınma veya yer değişikliği durumunda klimanızın güvenle sökülüp yeni konumuna yeniden monte edilmesi.",
    30	  },
    31	  {
    32	    title: "Klima Temizliği",
    33	    description: "İç ve dış ünitenin periyodik temizliğiyle klimanızın verimli ve hijyenik çalışmasının sağlanması.",
    34	  },
    35	];
```

Kontrol için: 5 açıklamanın hiçbirinde garanti süresi, sertifika, deneyim yılı, teknik detay (gaz tipi/basınç değeri/marka adı) YOK — her biri sadece hizmetin ne olduğunu anlatan tek bir doğal cümle.

---

### E1. 404 Sayfası Marka Sızıntısı Düzeltmesi

**Kök neden:** `app/not-found.tsx`, `(public)` route group'unun DIŞINDA (kasıtlı olarak — bkz. dosyanın kendi yorumu: "a truly unmatched path isn't guaranteed to resolve through the `(public)` route group's layout"). Bu yüzden Petra'nın kendi title template'ini (`app/(public)/layout.tsx`'in `"%s | Petra Mühendislik"`'i) MİRAS ALMIYOR, bunun yerine ROOT `app/layout.tsx`'in jenerik `"%s | MB Digital Boost"` template'i devreye giriyor. Eski kod `title: "Sayfa Bulunamadı"` (düz string) tanımladığı için bu jenerik template'e sarılıp **"Sayfa Bulunamadı | MB Digital Boost"** oluyordu — müşteri sitesinde platform markası görünüyordu.

**Düzeltme:** `title: { absolute: "Sayfa Bulunamadı | Petra Mühendislik" }` — `absolute`, HER ata template'ini (hem root'unkini hem varsa başka bir ata'nınkini) bilerek atlar, yazılan metni OLDUĞU GİBİ basar.

**Tam diff:**
```diff
diff --git a/app/not-found.tsx b/app/not-found.tsx
index d98304a..46a08cf 100644
--- a/app/not-found.tsx
+++ b/app/not-found.tsx
@@ -12,8 +12,16 @@ import { petraSiteName, petraTagline, petraContactInfo, petraSocialLinks } from
 import { petraBrandAssets } from "@/lib/data/petra/brand-assets";
 import { buildWhatsappHref } from "@/lib/data/petra/whatsapp";
 
+// `title.absolute` (bir düz string DEĞİL) bilerek kullanılıyor: bu dosya
+// `(public)` route group'unun DIŞINDA olduğu için Petra'nın kendi title
+// template'ini (app/(public)/layout.tsx, "%s | Petra Mühendislik")
+// MİRAS ALMIYOR — bunun yerine ROOT app/layout.tsx'in jenerik
+// "%s | MB Digital Boost" template'i devreye giriyor ve düz bir string
+// title BU template'e sarılıyor (önceki hata: "Sayfa Bulunamadı | MB
+// Digital Boost" — müşteri sitesinde platform markası görünüyordu).
+// `absolute`, HER ata template'ini atlayıp yazılanı OLDUĞU GİBİ basar.
 export const metadata: Metadata = {
-  title: "Sayfa Bulunamadı",
+  title: { absolute: "Sayfa Bulunamadı | Petra Mühendislik" },
   robots: { index: false, follow: true },
 };
```

**Local doğrulama (curl):**
```
$ curl -s http://localhost:3000/bu-route-yok-test-99999 | grep -o "<title>[^<]*</title>"
<title>Sayfa Bulunamadı | Petra Mühendislik</title>
```
Düzeltme SONRASI — "MB Digital Boost" artık HİÇBİR yerde görünmüyor.

---

### E2. `/cozumler/[slug]` Title Sorunu — Kök Neden Bulundu ve Düzeltildi

**Kök neden (kod + gerçek DB verisiyle doğrulandı):** `lib/seo/build-metadata.ts`'in `resolveSolutionSeo()` fonksiyonu, ÖNCEDEN şu 3 katmanlı fallback'i kullanıyordu:
```ts
title: solution.seoTitle ?? siteWideSeo?.title ?? solution.title,
```
`siteWideSeo`, `seo_settings` tablosunun `page_id IS NULL AND route_key IS NULL` satırı — yani **HOMEPAGE'e özel** bir satır (`applyHomeSeoOverrides`'ın TAM OLARAK bunun için kullandığı satır). Petra'nın gerçek Supabase projesinde bu satır GERÇEKTEN dolu (`title: "Petra Mühendislik | Kahramanmaraş İklimlendirme Çözümleri"`) — ve statik `petraSolutions`'daki HİÇBİR kategori `seoTitle` alanı TANIMLAMIYOR (`lib/data/petra/solutions.ts`'in 6 satırının hiçbirinde `seoTitle` yok). Sonuç: `solution.seoTitle` her zaman `undefined` → zincir `siteWideSeo?.title`'a düşüyor → **HER `/cozumler/[slug]` sayfası, kendi gerçek başlığı yerine HOMEPAGE'in başlığını gösteriyordu** (production'da bu turdan önce doğrulanmıştı: `/cozumler/split-klimalar`'ın `<title>`'ı homepage ile BİREBİR AYNIYDI).

**Düzeltme (2 adım):**
1. `title`/`description` fallback zincirinden site-wide satır TAMAMEN çıkarıldı — artık SADECE `solution.seoTitle ?? solution.title` (title her zaman dolu, zorunlu alan, zincir asla boş dönmez). `ogImage` fallback'i KORUNDU (site-wide `og_image`, `applyLayoutSeoOverrides`'ın felsefesiyle aynı, gerçekten "her route'a güvenle uygulanabilir" bir varlık — bu ayrım bilinçli).
2. **Ek olarak** (kapsamı hafifçe aşan ama gerekli bir düzeltme): statik `solution.title` fallback'ine düşüldüğünde marka soneki (`" | Petra Mühendislik"`) ELLE ekleniyor artık — çünkü bu fonksiyonun döndürdüğü `title`, çağıran tarafta (`app/(public)/cozumler/[slug]/page.tsx`) HER ZAMAN `{ absolute: ... }` ile kullanılıyor (ebeveyn template'i bilerek atlıyor, aksi halde eski hatayı tekrarlardı). Bu sonek eklenmeseydi, düzeltme SONRASI solution sayfaları markasız ("Split Klimalar") görünür, sitenin GERİ KALANIYLA (her sayfa "X | Petra Mühendislik" formatında) tutarsız olurdu. Bu, "kök nedeni düzelt" talimatının doğal bir parçası olarak eklendi, ayrıca not ediliyor.

**Tam diff:**
```diff
diff --git a/lib/seo/build-metadata.ts b/lib/seo/build-metadata.ts
index 67e406b..c4ddd72 100644
--- a/lib/seo/build-metadata.ts
+++ b/lib/seo/build-metadata.ts
@@ -3,6 +3,7 @@ import "server-only";
 import type { Metadata } from "next";
 import { getSeo } from "@/lib/cms/adapters";
 import type { SeoSettingsRow } from "@/lib/cms/customer-types";
+import { petraSiteName } from "@/lib/data/petra/site-config";
 
 /**
  * Resolves the CUSTOMER'S site-wide `seo_settings` row (page_id IS NULL
@@ -67,30 +68,50 @@ export interface ResolvedSolutionSeo {
  * SEO resolution. Deliberately NOT `resolveStaticPageSeo()`: that
  * function is `route_key`-scoped for the 8 static pages and has no
  * relationship to a solution's slug — using it here would silently look
- * up the wrong (or no) row. Uses `resolveSiteWideSeo()` instead, the
- * same site-wide `seo_settings` row every other page falls back to.
+ * up the wrong (or no) row. Uses `resolveSiteWideSeo()` for `ogImage`
+ * only (see below) — the same site-wide `seo_settings` row every other
+ * page falls back to.
  *
- * Per-field, 3-tier fallback (approved chain, not the 2-tier shape
- * `applyHomeSeoOverrides`/`applyLayoutSeoOverrides` use — those merge one
- * `SeoSettingsRow | null` onto an already-built `base: Metadata`; here
- * every field independently checks its own solution-level override first,
- * then the site-wide row, then the solution's own content field):
- *   title       = solution.seoTitle ?? siteWide.title ?? solution.title
- *   description = solution.seoDescription ?? siteWide.description ?? solution.description
- *   ogImage     = solution.seoOgImage ?? siteWide.og_image ?? null
- * `ogImage` NEVER falls back to the solution's own `image` — that asset
- * is typically a vertical 3:4 crop, not an OG-friendly aspect ratio (see
- * migration 0010's own comment). Canonical and robots are NOT part of
- * this resolver on purpose — canonical stays slug-derived
- * (`/cozumler/${slug}`) and robots stays inherited from the root public
- * layout; neither should ever be overridden by a solution or the
- * site-wide row.
+ * Faz D düzeltmesi (production'da doğrulanan bulgu): `title`/`description`
+ * ÖNCEDEN site-wide `seo_settings` satırına da düşüyordu
+ * (`solution.seoTitle ?? siteWide.title ?? solution.title`) — ama o satır
+ * `page_id IS NULL AND route_key IS NULL`, yani HOMEPAGE'e özel bir
+ * satır (bkz. `applyHomeSeoOverrides`'ın onu tam olarak bunun için
+ * kullanması). Petra'da bu satır GERÇEKTEN dolu olduğu için (homepage
+ * title'ı), HER `/cozumler/[slug]` sayfası kendi gerçek başlığı yerine
+ * homepage'in başlığını gösteriyordu — production'da doğrulandı
+ * (`Petra Mühendislik | Kahramanmaraş İklimlendirme Çözümleri`, TÜM
+ * solution sayfalarında AYNI). `title`/`description` artık SADECE
+ * solution'ın kendi alanlarına düşüyor (`solution.seoTitle ?? solution.title`),
+ * homepage'e ait site-wide satırı ASLA kullanmıyor — `solution.title` her
+ * zaman dolu (zorunlu alan) olduğu için bu zincir asla boş dönmez.
+ * Statik `solution.title` fallback'ine düşüldüğünde marka soneki
+ * (` | Petra Mühendislik`) BİLEREK elle ekleniyor: bu fonksiyonun
+ * döndürdüğü `title`, çağıran tarafta (`app/(public)/cozumler/[slug]/
+ * page.tsx`) HER ZAMAN `{ absolute: ... }` ile kullanılıyor (ebeveyn
+ * layout'un `"%s | Petra Mühendislik"` şablonunu bilerek atlıyor —
+ * yukarıdaki `siteWideSeo.title` hatasını tekrarlamamak için), yani bu
+ * sonek başka HİÇBİR yoldan eklenmiyor. Eklenmezse solution sayfaları
+ * (statik durumda) markasız, sitenin geri kalanıyla tutarsız bir title
+ * gösterirdi ("Split Klimalar" vs diğer her sayfadaki "X | Petra
+ * Mühendislik"). `solution.seoTitle` GERÇEK bir admin girdisiyse bu sonek
+ * EKLENMİYOR — admin kendi tam başlığını (marka adı dahil ya da hariç,
+ * kendi tercihiyle) yazmış sayılır, üzerine yazılmaz.
+ * `ogImage` tek istisna: site-wide `og_image`, `applyLayoutSeoOverrides`'ın
+ * felsefesiyle AYNI şekilde ("her route'a körlemesine uygulanabilir
+ * güvenli bir varlık") gerçekten güvenli bir genel varsayılan, o yüzden
+ * fallback zincirinde KALDI. `ogImage` yine solution'ın kendi `image`
+ * alanına DÜŞMÜYOR — o asset genelde dikey 3:4 kırpım, OG-uyumlu bir oran
+ * değil (bkz. migration 0010'un kendi yorumu). Canonical ve robots bu
+ * resolver'ın parçası DEĞİL — canonical slug-türetilmiş kalıyor
+ * (`/cozumler/${slug}`), robots root public layout'tan miras kalıyor;
+ * ikisi de ne solution ne site-wide satır tarafından override edilmemeli.
  */
 export async function resolveSolutionSeo(connectionKey: string, solution: SolutionSeoInput): Promise<ResolvedSolutionSeo> {
   const siteWideSeo = await resolveSiteWideSeo(connectionKey);
   return {
-    title: solution.seoTitle ?? siteWideSeo?.title ?? solution.title,
-    description: solution.seoDescription ?? siteWideSeo?.description ?? solution.description,
+    title: solution.seoTitle ?? `${solution.title} | ${petraSiteName}`,
+    description: solution.seoDescription ?? solution.description,
     ogImage: solution.seoOgImage ?? siteWideSeo?.og_image ?? null,
   };
 }
```

**Local doğrulama — TÜM 6 solution sayfası (`curl`, düzeltme SONRASI):**
```
split-klimalar          -> <title>Split Klimalar | Petra Mühendislik</title>
multi-split-klimalar    -> <title>Multi-Split Sistemler | Petra Mühendislik</title>
profesyonel-klimalar    -> <title>Profesyonel Klimalar | Petra Mühendislik</title>
vrf-sistemleri          -> <title>VRF Sistemleri | Petra Mühendislik</title>
isi-pompalari           -> <title>Isı Pompaları | Petra Mühendislik</title>
sicak-su-sistemleri     -> <title>Sıcak Su Sistemleri | Petra Mühendislik</title>
```
6 sayfanın 6'sı da artık KENDİ, BİRBİRİNDEN FARKLI, marka-tutarlı başlığını gösteriyor — HİÇBİRİ artık homepage başlığıyla aynı değil. **Aynı sorun diğer 5 sayfada da vardı ve HEPSİ aynı kök-neden düzeltmesiyle çözüldü** (tek bir merkezi fonksiyon, `resolveSolutionSeo()`, altı sayfanın da kullandığı).

**Regresyon kontrolü (etkilenmemesi gereken sayfalar, curl ile doğrulandı):**
```
/                -> <title>Petra Mühendislik — İklimlendirmede Mühendislik ve Güven</title>  (değişmedi)
/hizmetler       -> <title>Hizmetler | Petra Mühendislik</title>                              (değişmedi)
```

---

### E3. Typecheck / Lint / Build (Part E'nin İKİ dosyası için, ayrı ayrı çalıştırıldı)

```
TYPECHECK_EXIT:0 (çıktı yok, sıfır hata)
LINT_EXIT:0
> mb-website-engine@0.1.0 lint
> eslint
BUILD_EXIT:0
```
(Marka soneki eklendikten SONRA typecheck/lint/build TEKRAR çalıştırıldı, hepsi yine `EXIT:0`.)

---

### E4. Değişen Dosyalar (Part E, tam liste)

| Dosya | Durum |
|---|---|
| `app/not-found.tsx` | Değişti (E1) |
| `lib/seo/build-metadata.ts` | Değişti (E2) |

`git status --short` ile doğrulandı — Part A/B'nin 4 dosyası (`components/layout/site-footer.tsx`, `app/(public)/hizmetler/page.tsx`, `lib/data/petra/service-offerings.ts`, `lib/data/petra/service-offering-icons.ts`) + bu 2 yeni dosya DIŞINDA hiçbir şeye dokunulmadı.

---

## SONUÇ (GÜNCEL — Part A + B + E TOPLAM)

Toplam **6 dosya** değişti/eklendi (Part A: 1, Part B: 3, Part E: 2), hepsi typecheck/lint/build ile ve local `curl`/Playwright kanıtlarıyla doğrulandı. Commit/push/deploy HÂLÂ YAPILMADI — tüm düzeltmeler tamamlandıktan sonra tekrar commit onayı isteniyor (kullanıcının bu turdaki son talimatı).

**DUR VE RAPORLA (Part E için).**
