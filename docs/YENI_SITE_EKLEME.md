# Yeni site ekleme

MB Digital Boost'ta tek bir repo, tek bir platform Supabase'i ve **her site için ayrı bir Vercel projesi** var. Hiçbir site başka bir sitenin sayfasını, markasını, 404'ünü, sitemap kaydını ya da API'sini göstermez. Bunu sağlayan yapı: `SITE_KEY` + `lib/sites/registry.ts` + `lib/sites/route-policy.ts`, ve bunları koruyan testler (`npm test`).

## Adımlar

1. **Registry'ye kayıt ekle.** `lib/sites/registry.ts` → `SITES` listesine:
   - `key`: küçük harf, benzersiz (Vercel'deki `SITE_KEY` değeri)
   - `kind`: `"store"` (mağaza), `"corporate"` (kurumsal site) ya da `"panel"`
   - `displayName`: 404 ve sayfa başlıklarında görünen ad
   - `canonicalOrigin`: `https://www.alanadi.com` (https ile başlar, sonda `/` olmaz)
   - mağazaysa `storeSlug`: `stores.slug` ile aynı

2. **Aynı repodan yeni bir Vercel projesi aç.** GitHub `mbdigitalboost-cell/mb-wepsite-engine`, dal `main`, Node 24.x.

3. **Env değişkenlerini gir** (Production + Preview):
   - `SITE_KEY=<key>` (zorunlu; yoksa build durur: `scripts/check-site-env.mjs`)
   - `NEXT_PUBLIC_SITE_URL=<canonicalOrigin>` (Production; registry'deki değerle **aynı** olmalı, yoksa build durur)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (platform projesi)

4. **Domaini bağla.** Vercel → Project → Domains. www ile apex arasındaki yönlendirmeyi de orada ayarla.

5. **Supabase Auth → URL Configuration → Redirect URLs** listesine `https://<domain>/**` ekle. Mağaza müşterisinin şifre sıfırlama e-postası bu adrese döner.

6. **Siteye özel içerik:**
   - mağaza: platform DB'de `stores` kaydı (`slug` = `storeSlug`), kategoriler ve ürünler. Kod değişikliği gerekmez.
   - kurumsal: sayfalar, `app/not-found.tsx` ve `app/sitemap.ts` içinde kendi dalı (bkz. aşağıdaki not).

7. **Testlere satır ekle.** `tests/route-policy.test.ts` → `MATRIX`'e yeni sitenin en az şu yolları: kök, kendi sayfası, başka sitenin yolu (404), `/dashboard` (panele 308). Yeni bir `/api` route'u eklediysen sahibini `API_ROUTE_OWNERS`'a yaz; yazmazsan test kırılır.

8. `npm test`, `npx tsc --noEmit` ve `npm run build` çalıştır, push et. Ardından canlıda kontrol et: başka sitenin yolu 404 dönmeli ve kendi markasını göstermeli, `/sitemap.xml` ile `/robots.txt` kendi domainini göstermeli.

## Bilinmesi gerekenler

- **Her `main` push'unda bütün site projeleri build alır.** Site sayısı arttıkça her projeye bir *Ignored Build Step* eklenmeli ki yalnızca ilgili değişikliklerde build alınsın. Petra bu yüzden zaten `petra-production` dalından deploy ediliyor.
- **Admin yalnızca panel domaininde.** Mağaza ya da kurumsal sitede `/dashboard`, `/login`, `/mfa-challenge` ve `/auth/set-password` panele 308 ile yönlenir.
- **İkinci kurumsal site:** Petra'nın sayfaları bugün kökte, `app/(public)/` altında duruyor. İkinci bir kurumsal site gelince yollar çakışır. O zaman kurumsal siteler `app/sites/<key>/` altına taşınmalı ve host/`SITE_KEY` ile rewrite edilmeli. Petra main'e taşınmadan bu yapılmamalı.
