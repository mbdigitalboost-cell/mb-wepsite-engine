# Poppins (Petra) — hazır ama aktif değil

Petra'nın ana fontu Poppins olacak, `next/font/local` ile self-hosted
(Google Fonts'a runtime/build-time network bağımlılığı istemiyoruz —
bkz. foundation'daki font kararı).

**Şu an gerçek Poppins `.woff2` dosyaları repoda yok.** Sahte/placeholder
font dosyası oluşturmadık — bunun yerine mimariyi hazır bıraktık:

- `lib/theme/petra-theme.ts` içindeki `typography.headingFont` /
  `bodyFont` değerleri `var(--font-poppins, var(--font-sans))` — yani
  `--font-poppins` CSS değişkeni tanımlı değilken otomatik olarak sistem
  font stack'ine (`--font-sans`) düşer. Font eklendiğinde bu satırların
  **değişmesine gerek yok**.

## Poppins eklendiğinde yapılacaklar

1. Aşağıdaki dosyaları `public/fonts/petra/` içine koyun (Google Fonts'tan
   veya lisanslı kaynaktan indirilmiş, self-hosted kullanım için uygun
   `.woff2` formatında):
   - `Poppins-Regular.woff2` (400)
   - `Poppins-Medium.woff2` (500)
   - `Poppins-SemiBold.woff2` (600)
   - `Poppins-Bold.woff2` (700)

2. `lib/fonts/poppins.ts` dosyasını oluşturun (bu dosya şu an YOK, sahte
   dosya oluşturmadık):

   ```ts
   import localFont from "next/font/local";

   export const poppins = localFont({
     src: [
       { path: "../../public/fonts/petra/Poppins-Regular.woff2", weight: "400", style: "normal" },
       { path: "../../public/fonts/petra/Poppins-Medium.woff2", weight: "500", style: "normal" },
       { path: "../../public/fonts/petra/Poppins-SemiBold.woff2", weight: "600", style: "normal" },
       { path: "../../public/fonts/petra/Poppins-Bold.woff2", weight: "700", style: "normal" },
     ],
     variable: "--font-poppins",
     display: "swap",
   });
   ```

3. `app/(public)/layout.tsx` içinde `<html>` veya wrapper elementine
   `poppins.variable` class'ını ekleyin (root layout'taki genel
   `--font-sans` mekanizmasına dokunmadan, sadece Petra'nın `(public)`
   ağacına).

4. Başka bir şey değişmiyor — `PetraTheme.typography` zaten
   `var(--font-poppins, var(--font-sans))` kullandığı için Poppins
   otomatik devreye girer.
