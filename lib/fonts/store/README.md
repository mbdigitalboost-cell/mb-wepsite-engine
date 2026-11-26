# Mağaza fontları (self-hosted)

`lib/fonts/store-fonts.ts` bu dosyaları `next/font/local` ile yükler. Derleme
Google Fonts'a bağlı değildir (Faz 37 sonrası: üretim derlemesi Google Fonts
indirmesi düştüğü için iki kez ERROR olmuştu).

| Dosya | Font | Kalınlık | Alt küme |
|---|---|---|---|
| `oswald-latin.woff2` / `oswald-latin-ext.woff2` | Oswald (variable) | 500–700 | latin / latin-ext |
| `barlow-{400,500,600,700}-latin.woff2` / `-latin-ext.woff2` | Barlow | 400, 500, 600, 700 | latin / latin-ext |
| `jetbrains-mono-latin.woff2` / `-latin-ext.woff2` | JetBrains Mono (variable) | 500–600 | latin / latin-ext |
| `space-grotesk-700-latin.woff2` / `-latin-ext.woff2` | Space Grotesk | 700 | latin / latin-ext |

- **Kaynak:** Google Fonts (fonts.gstatic.com). Dosyalar, önceki
  `next/font/google` derlemesinin indirdiği dosyaların birebir kopyasıdır
  (içerik değişmedi, yalnız adlandırıldı).
- **Lisans:** dördü de SIL Open Font License 1.1 (OFL). OFL, fontların bir
  web sitesiyle birlikte dağıtılmasına ve gömülmesine izin verir; tek başına
  satılamaz. OFL, dosyalar dağıtılırken lisans metninin yanında durmasını
  ister — her font için resmi metin bu klasörde:
  `OFL-Oswald.txt`, `OFL-Barlow.txt`, `OFL-JetBrainsMono.txt`,
  `OFL-SpaceGrotesk.txt` (kaynak: github.com/google/fonts `ofl/<font>/OFL.txt`;
  telif satırları font dosyalarının içindeki telif kaydıyla birebir aynı).
- **Türkçe:** ş, ğ, İ, Ş, Ğ latin-ext alt kümesindedir (ı latin'de). Her alt
  küme kendi `unicode-range`'iyle ayrı bir `localFont` çağrısıdır; mağaza
  sarmalayıcısındaki CSS değişkeni yığını `latin, latin-ext, yedek` sırasıyla
  kurar (`store-fonts.ts` → `fontStack`). Tarayıcı yalnız gereken dosyayı indirir.
- **Yeni kalınlık / font eklerken:** latin ve latin-ext dosyalarının ikisini de
  ekleyin, `store-fonts.ts`'te ilgili çağrının `src` listesine yazın.
