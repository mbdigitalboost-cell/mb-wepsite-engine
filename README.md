# MB Digital Boost — Website Engine (V1 foundation)

Birden fazla müşterinin profesyonel web sitesini aynı kod tabanı üzerinden
üretebilmek için kurulan temel altyapı. Bu aşamada herhangi bir müşteriye
özel tasarım **yoktur** — sadece foundation.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase · Vercel

## Klasör yapısı

```
app/
  (public)/          # Genel müşteri-yüzü site kabuğu (route group, URL'e yansımaz)
    layout.tsx
    page.tsx
  dashboard/          # İleride gerçek müşteri paneline dönüşecek panel
    layout.tsx
    page.tsx
    websites/
    settings/
  api/health/supabase/  # Supabase bağlantısını doğrulamak için health-check route'u
  layout.tsx           # Root layout (font, ThemeProvider, tracking scripts)
  globals.css
  robots.ts
  sitemap.ts

components/
  ui/            # Marka-bağımsız temel primitifler (Button, Container, ...)
  layout/        # Sayfa iskeleti (SiteHeader, SiteFooter, DashboardShell)
  navigation/    # Nav bileşenleri (MainNav, DashboardNav)
  sections/      # BİLİNÇLİ OLARAK BOŞ — müşteriye özel Hero/Services/About vb. buraya gelecek

lib/
  config/env.ts      # Tüm environment variable erişimi buradan geçer
  supabase/           # browser/server/admin Supabase client'ları + types
  theme/              # BrandTheme sözleşmesi + ThemeProvider (CSS custom properties)
  tracking/           # Merkezi event isimleri + dataLayer dispatcher + script injector
  utils/
```

## Mimari kararlar

- **`(public)` vs `dashboard`**: Müşteri-yüzü site ile internal panel ayrı
  layout ağaçlarında. Panel `noindex`, ayrı auth/session akışı alabilir.
- **Theme sistemi**: `lib/theme/types.ts`'deki `BrandTheme` sözleşmesi,
  ileride her müşterinin logo/renk/tipografi/radius/buton stilini Supabase'den
  çekip `ThemeProvider`'a vermeyi hedefler. `--color-brand-*` CSS
  custom property'leri üzerinden çalışır; component kodu değişmeden
  yeniden markalanabilir.
- **Tracking**: `lib/tracking/events.ts` içindeki sabit event isimleri
  (`generate_lead`, `contact`, `whatsapp_click`, ...) + `track()` dispatcher
  + `TrackingScripts` (GTM/GA4/Meta Pixel, hepsi env değişkeni boşsa no-op).
  Gerçek ID'ler her müşteri/ortam için `.env` üzerinden eklenir, kod
  değişmez.
- **Supabase**: `client.ts` (browser, anon key), `server.ts` (Server
  Components/Actions, cookie tabanlı session), `admin.ts` (service role,
  `server-only`, sadece RLS'i bilinçli olarak atlaması gereken işlemler
  için). Henüz hiçbir tablo/migration yok — `Database` tipi placeholder.
  `middleware.ts` her istekte session'ı tazeler.

## Ortam değişkenleri

`.env.local.example` dosyasını `.env.local` olarak kopyalayıp gerçek
Supabase proje bilgilerinizi girin. Hiçbir secret repo'ya commit edilmez
(`.env*` `.gitignore`'da).

Bağlantıyı doğrulamak için, dev server ayaktayken:

```
GET /api/health/supabase
```

## Geliştirme

```bash
npm run dev     # http://localhost:3000
npm run lint
npm run build
```
