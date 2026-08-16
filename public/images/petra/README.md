# Petra görsel yapısı

Gerçek Petra fotoğrafları/logosu henüz eklenmedi. Klasör yapısı ve dosya
isimleri **Final Asset Implementation Brief**'e göre (Asset Manifest ile
çelişen noktalarda Final Brief otoritedir):

```
brand/     petra-logo.svg, petra-logo-white.svg, petra-mark.svg, favicon.svg
hero/      petra-hero.webp
solutions/ split-klima.webp, multi-split-klima.webp, profesyonel-klima.webp,
           vrf-sistemleri.webp, isi-pompasi.webp, sicak-su-sistemleri.webp
services/  mitsubishi-heavy.webp (yalnızca doğrulanmış marka izniyle)
projects/  project-01.webp .. project-06.webp (kaç gerçek proje varsa o kadarı)
campaigns/ campaign-01.webp .. campaign-03.webp (kaç gerçek kampanya varsa o kadarı)
banners/   cta-banner.webp, service-banner.webp, contact-banner.webp
           (opsiyonel — yalnızca gerekirse, şu an eklenmeyecek)
```

## Kullanım

| Dosya | Kullanım |
|---|---|
| `brand/petra-logo.svg` | Açık arka plan (header, footer) |
| `brand/petra-logo-white.svg` | Koyu Hero, koyu section, footer |
| `brand/petra-mark.svg` | Mobil branding, favicon alternatifi, küçük alanlar |
| `brand/favicon.svg` | Favicon |
| `hero/petra-hero.webp` | Ana sayfa Hero arka planı |
| `solutions/*.webp` | 6 çözüm kartı (sırasıyla split, multi-split, profesyonel, VRF, ısı pompası, sıcak su) |
| `services/mitsubishi-heavy.webp` | Mitsubishi Heavy bölümü — yalnızca lisanslı/doğrulanmış marka asseti sağlanırsa |
| `projects/project-0N.webp` | Projeler grid'i — yalnızca gerçek proje geldikçe |
| `campaigns/campaign-0N.webp` | Kampanya bölümü — yalnızca gerçek/güncel kampanya geldikçe |

## Kurallar

- Görsel path'leri component içine değil `lib/data/petra/*.ts` içindeki
  `image` / `logoSrc*` / `symbolSrc` / `faviconSrc` / `backgroundImage`
  alanlarına yazılır (şu an hepsi `null`).
- Gerçek Petra projesi/kampanyası gibi gösterilecek yapay/stok görsel
  eklenmeyecek — `projects/` ve `campaigns/` klasörleri, gerçek içerik
  gelene kadar boş kalacak (bkz. `lib/data/petra/projects.ts`, `campaigns.ts`).
- Rastgele internet görseli veya AI ile üretilmiş placeholder görsel
  kullanılmayacak. Gerçek asset yoksa component zorla doldurulmayacak;
  mevcut kontrollü boş durum (empty state) korunacak.
- Bir görsel eklendiğinde ilgili data dosyasındaki `null` alan
  `"/images/petra/<klasör>/<dosya>.webp"` (veya `.svg`) ile güncellenir —
  component kodu değişmez.
- Mitsubishi Heavy görseli/markası yalnızca müşterinin doğrulanmış marka
  ilişkisi ve kullanım izni kapsamında eklenecek; "yetkili bayi/servis"
  iddiası `dealerStatusVerified` doğrulanmadan kesin metin olarak
  gösterilmeyecek (bkz. `lib/data/petra/mitsubishi.ts`).

## Faz 9.9 — AI-üretilmiş görsel paketi istisnası (2026-08-16)

Müşteri, kendi hazırladığı 8 görselli bir paket yükledi (`PETRA_MUHENDISLIK_GORSEL_PAKETI.zip`).
Paketin kendi notu görsellerin "AI ile hazırlanmış tasarım/stock-style"
olduğunu belirtiyor — bu, yukarıdaki "AI ile üretilmiş placeholder görsel
kullanılmayacak" kuralıyla doğrudan çelişiyor. Müşteriye bu çelişki
soruldu ve **bu paket için kural bilinçli olarak esnetildi** (genel kural
başka görseller için geçerliliğini koruyor — bu sadece bu pakete özel bir
istisna).

Paketteki 8 görselden yalnızca **2 tanesi** kullanıldı:
- `solutions/02_split_klimalar.jpg` → `petraSolutions` "split-klimalar" kartı
- `services/07_bakim_servis.jpg` → `/hizmetler` sayfası dekoratif banner'ı (genel/dekoratif, "bizim ekibimiz" gibi bir bağlam kurulmadı)

Diğer 6 görsel (hero, multi-split, VRF, ısı pompası, sıcak su, mühendislik
referans görseli) **kullanılmadı** — hepsinde gerçek, tescilli
"Mitsubishi Electric" logosu net şekilde görünüyordu ve bu:
(a) yukarıdaki Mitsubishi kuralıyla (doğrulanmış marka izni gerektiği)
çelişiyordu, (b) `lib/data/petra/mitsubishi.ts`'teki kayıtlı marka adıyla
("Mitsubishi Heavy") uyuşmuyordu, (c) hero/mühendislik görsellerinin gömülü
metni onaylanmamış bir "Mitsubishi Electric çözümleriyle..." iş birliği
iddiası içeriyordu. Müşteri bu 6 görselin kullanılmamasını onayladı.

## Faz 9.9 revizyon — ikinci görsel seti (2026-08-16)

Müşteri aynı gün 4 adet yeni kompozit "moodboard" görseli paylaştı (tek
parça, 1536×1024, birden fazla kart tek görselde birleştirilmiş —
öncekinin aksine ayrı dosyalar halinde değil). Müşteriye bu görsellerden
tek tek kart kesip almanın (crop) düşük çözünürlük riski taşıdığı
soruldu; **müşteri bu riski bilerek kabul edip devam etmemi istedi.**
Ayrıca yeni setlerde tutarlı bir "P" ikon logosu olduğu görüldü —
müşteriye bunu gerçek/onaylı site logosu yapıp yapmayacağım soruldu,
**"hayır, sadece görsellerin içinde dekoratif kalsın" dendi** — bu yüzden
header/footer/favicon hâlâ metin tabanlı "PETRA" wordmark kullanıyor, bu
ikon site logosu olarak hiçbir yerde ayrıca uygulanmadı.

En "final" görünen kompozitten (hero + 6 kart tek düzende) tek tek kart
kesildi ve her biri üçüncü taraf marka logosu açısından tek tek
incelendi:

| Kırpılan görsel | Sonuç |
|---|---|
| Hero banner | Kullanıldı — ekipmanın kendisinde üçüncü taraf logo yok, sadece kendi "PETRA" markası (gömülü başlık var, bkz. aşağıdaki not) |
| Split klimalar | Kullanıldı — logo yok |
| Multi-split | **Kullanılmadı** — ünitede "Panasonic" benzeri okunaklı bir marka logosu görüldü, doğrulanmamış |
| VRF sistemleri | Kullanıldı — logo yok |
| Isı pompaları | **Kullanılmadı** — kırmızı elmas biçimli, önceki pakette görülen Mitsubishi tarzı işaretle çok benzer bir logo görüldü, doğrulanmamış |
| Sıcak su sistemleri | Kullanıldı — tanklardaki isim etiketleri bu çözünürlükte okunaksız, tanımlanabilir bir marka yok |
| Bakım & Servis | Kullanıldı — sadece "PETRA MÜHENDİSLİK" kendi markası, üçüncü taraf logo yok |

Sonuç: `multi-split-klimalar` ve `isi-pompalari` çözümleri hâlâ
`image: null` (gerçek/temiz görsel bekliyor). `profesyonel-klimalar` için
hiçbir aday görsel hiç sağlanmadı, o da `null`.

**Hero görseli hakkında önemli not:** Bu kompozitin hero bölümü de
gömülü başlık/alt metin/rozet/logo içeriyor — `lib/data/petra/hero.ts`'e
eklenen `backgroundHasEmbeddedHeadline: true` alanı, `components/sections/hero.tsx`'in
kendi H1/alt metin bloğunu bu görsel kullanılırken gizlemesini sağlıyor
(metin çakışmasını önler). Gerçek CTA butonları (Keşif Talep Et, WhatsApp)
ve güven rozetleri görsele gömülü DEĞİL — bunlar her zaman kod tarafından,
işlevsel/tıklanabilir olarak render edilmeye devam ediyor. Erişilebilirlik
için görsel olarak gizlenen başlık, ekran okuyucular için `sr-only` bir
`<h1>` olarak korunuyor.

**Bilinen çözünürlük sınırlaması:** Kart görselleri bir moodboard'dan
kesildiği için kaynak çözünürlükleri düşük (~500×200px civarı). Solutions
kartlarının `aspect-[4/5]` (dikey) çerçevesinde `object-cover` ile
gösteriliyorlar — büyük/retina ekranlarda hafif bulanıklık görülebilir.
Gerçek, yüksek çözünürlüklü fotoğraf/render geldiğinde bu görseller
doğrudan aynı `image` alanlarına yazılarak değiştirilebilir, başka kod
değişikliği gerekmez.
