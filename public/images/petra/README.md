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
