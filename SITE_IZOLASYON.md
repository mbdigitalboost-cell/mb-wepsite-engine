# SİTE İZOLASYON KURALLARI — MB Digital Boost (kalıcı, her işte geçerli)

> Bu dosya repo kökündedir ve `CLAUDE.md` üzerinden her Claude Code oturumuna otomatik yüklenir. Aynı metin Cowork projesinde `claude/AJANS_SITE_IZOLASYON_KURALLARI.md` olarak durur.
> Kullanıcı (2026-11-27): "bu iş kalıcı olmalı artık, bir kere karıştı, yarın başka siteler ekleyeceğiz."
> **Bu kurallardan biri bir görevle çelişiyorsa görev durur ve kullanıcıya sorulur.** Kural sessizce esnetilmez.

MB Digital Boost bir ajanstır. Tek repo ve tek platform Supabase'i kullanılır. Ama **her site ayrı bir müşteridir**: kodu, içeriği, verisi, SEO'su, e-postası ve yayını birbirine hiçbir şekilde karışmaz.

---

## 1. Site tablosu (yeni site eklenince BURAYA da yazılır)

| Site anahtarı | Müşteri | Canlı adres | Git dalı (production) | Vercel projesi | Veri |
|---|---|---|---|---|---|
| `panel` | MB Digital Boost (admin) | mb-digital-boost-web-panel.vercel.app | `main` | `mb-digital-boost-web-panel` | Platform Supabase `wnedgbbyqpvylfiwkwen` |
| `taktikalp46` | Taktikalp46 (mağaza) | www.t46store.com | `main` | `taktikalp46-store` | Platform Supabase, `store_id 4bd25830-…` |
| `petra` | Petra Mühendislik (kurumsal) | www.petramuhendislik.com | **`petra-production`** (ayrı, dondurulmuş dal) | `petra-muhendislik` | Petra'nın KENDİ Supabase'i `wahbjfhvizalenyxjywb` |

**Gelecek siteler** (ör. Belmonta) §6'daki kontrol listesiyle eklenir.

## 2. Altın kurallar

1. **Her iş tek bir siteye aittir.**
   - Her devir metninin, dalın ve commit'in başında site anahtarı yazar: `[petra]`, `[taktikalp46]`, `[panel]`, `[belmonta]`.
   - Birden fazla siteyi etkileyen ortak motor değişikliği `[shared]` etiketi alır. Ayrı commit olur, tüm sitelerin testleri çalıştırılır ve raporda hangi sitelerin etkilendiği tek tek yazılır.
2. **Bir commit iki sitenin dosyasına dokunamaz.** Ortak (`shared`) dosya + tek bir sitenin dosyası olabilir; iki farklı sitenin dosyası olamaz. Sahiplik haritası: `lib/sites/ownership.ts`.
3. **Petra özel kuralları:**
   - Petra işi yalnızca `petra-production`'dan açılan bir `petra-*` dalında yapılır.
   - `main` asla Petra dalına merge/rebase/cherry-pick edilmez; Petra dalı da asla `main`'e merge edilmez.
   - Petra'nın Supabase'ine kod dışında yazılmaz, migration yapılmaz.
   - `main`'deki Petra kopyası (`app/(public)/**`) canlıyı etkilemez. Orada Petra değişikliği yapılmaz, çünkü kafa karıştırır.
4. **İçerik kopyalanmaz.** Bir sitenin metni, görseli, logosu, telefonu, adresi, renkleri ya da yasal metni başka bir siteye kopyalanmaz. Yeni site sıfırdan ya da markasız bir şablondan başlar.
5. **Site-özel dosyalar site klasöründe durur.** Yeni siteler için:
   - `app/sites/<key>/**` (sayfalar)
   - `lib/sites/<key>/**` (veri ve yardımcılar)
   - `public/sites/<key>/**` (görseller)

   Bir sitenin klasörü başka bir sitenin klasöründen import yapamaz (lint ile zorlanır). Ortak motor (`lib/commerce`, `components/commerce`, `app/store` gibi) hiçbir sitenin adını, domainini, telefonunu sabit kodlamaz. Siteye özel her şey registry'den ya da veritabanından gelir.
6. **Veri izolasyonu:**
   - Platform veritabanında her sorgu `store_id` / `customer_id` ile süzülür.
   - URL'den gelen id'nin o müşteriye ait olduğu sunucuda kontrol edilir (Faz 29 kuralı).
   - Service-role sorguları da mağaza filtresi taşır.
7. **Env ve ayarlar site başınadır.**
   - Her Vercel projesinde `SITE_KEY` + `NEXT_PUBLIC_SITE_URL` tanımlıdır; değer registry'yle aynı olmazsa build durur.
   - Bir projenin env'i başka bir projeye körlemesine kopyalanmaz. Faz 28'de panelde Petra'nın adresi unutulmuştu ve webhook adresleri Petra domainini gösteriyordu.
8. **Dış servisler site başınadır:**
   - Domain ve DNS kaydı.
   - Google Search Console mülkü.
   - Takip kodları (GA4, Meta, Ads).
   - E-posta gönderen adresi ve adı.
   - Supabase Auth Redirect URL.
   - Ödeme/kargo/fatura anahtarları: mağaza başına, veritabanında, admin'den girilir.
9. **Yayın kuralları:**
   - Bir sitenin production'ına yayın, kullanıcı **o siteyi adıyla anarak** onay verdikten sonra yapılır ("Petra'ya yayınla", "Taktikalp'e yayınla").
   - Her yayın raporunda **diğer sitelerin production SHA'sının değişmediği** yazılır.
10. **Yayından sonra sızıntı kontrolü zorunludur:**
    - `npm run check:live -- <siteKey>` çalıştırılır.
    - Sitenin sitemap'indeki bütün sayfalarda başka sitelerin adı, domaini, telefonu, e-postası geçmemeli.
    - canonical / og:url / og:image yalnız kendi domainini göstermeli.

## 3. Otomatik korumalar (kodda — kaldırılmaz, zayıflatılmaz)

| Koruma | Ne yapar | Nerede |
|---|---|---|
| `scripts/check-site-env.mjs` (prebuild) | SITE_KEY yoksa ya da adres yanlışsa build'i durdurur | Faz 28 |
| `lib/sites/route-policy.ts` + testler | Bir sitenin domaininde başka sitenin yolu 404 olur | Faz 28 |
| `scripts/check-isolation.mjs` (prebuild + test) | Site-özel dosyada başka sitenin adı/domaini/telefonu ya da başka site klasöründen import varsa build ve test kırılır. Ortak motorda yeni sabit marka adı da yasak | Faz 38 |
| `.githooks/pre-push` | İki sitenin dosyasına dokunan commit'i, Petra dalında Petra dışı dosyayı, `main`'de Petra dosyasını push ettirmez | Faz 38 |
| `scripts/check-live-leaks.mjs` | Canlı sitede sızıntı taraması | Faz 38 |
| Vercel Ignored Build Step | Her proje yalnız kendi dalını build eder (Petra: `petra-production`; diğerleri: `main`) | Faz 11 + Faz 38 |

Bir koruma yanlış alarm veriyorsa koruma gevşetilmez. Ya kod düzeltilir ya da `scripts/isolation-baseline.json`'a **gerekçesiyle** ve kullanıcı onayıyla istisna yazılır.

## 4. Claude Code (VS Code) için çalışma kuralları

- İşe başlamadan dalı ve site anahtarını raporla. Petra işiyse başlangıç SHA'sını raporla.
- Görev hangi siteye ait belli değilse sor. Tahmin etme.
- Bir siteye ait görevde başka bir sitenin dosyasını açman gerekiyorsa sadece oku, değiştirme. Gerekirse `[shared]` değişikliği ayrı öner.
- Push'tan önce raporla:
  - `git diff --stat <taban>..HEAD`
  - sahiplik özeti (hangi dosya hangi siteye ait)
  - `npm run check:isolation` sonucu
- Migration, production yazma, env değişikliği ve yayın açık onay olmadan yapılmaz.

## 5. Cowork için çalışma kuralları

- Devir metninin ilk satırı site anahtarıdır.
- Doğrulama: ilgili sitenin canlı kontrolü + diğer sitelerin production SHA'sı + `check:live`.
- Petra'nın Supabase'i sorgulanmaz. Petra production ayarlarına dokunulmaz.
- Bir sitenin kararı (renk, metin, fiyat, politika) başka siteye taşınmaz. Her müşteri için ayrıca sorulur.

## 6. Yeni site ekleme kontrol listesi (Belmonta ve sonrakiler)

1. **Tür kararı:** mağaza (`store`) mı, kurumsal (`corporate`) mu? Kurumsalsa sayfalar `app/sites/<key>/` altına yazılır, kök `app/(public)` kullanılmaz (Petra'yla çakışır).
2. **Registry kaydı** (`lib/sites/registry.ts`): `key`, `kind`, `displayName`, `canonicalOrigin`, `deployBranch`, `leakTokens` (ad, domain, telefon, e-posta). Diğer sitelerin `leakTokens`'ı bu sitede otomatik yasaklanır.
3. **Sahiplik haritası** (`lib/sites/ownership.ts`): yeni sitenin klasörleri eklenir.
4. **Ayrı Vercel projesi:** `SITE_KEY`, `NEXT_PUBLIC_SITE_URL`, Ignored Build Step (`scripts/vercel-should-build.mjs`), kendi domaini.
5. **Veri:**
   - Platform DB'de kendi `customers` / `stores` kaydı.
   - Ayrı Supabase gerekiyorsa kullanıcı karar verir.
   - Hiçbir kayıt başka müşteriden kopyalanmaz.
6. **Dış servisler:** Search Console mülkü, takip kodları, e-posta gönderen, Supabase Redirect URL, Cloudflare/DNS.
7. **Testler:** `route-policy` matrisine satır eklenir, `check:isolation` yeşil olmalı. İlk yayından sonra `check:live` çalıştırılır.
8. **Tabloyu güncelle:** bu dosyanın §1 tablosu ve `docs/YENI_SITE_EKLEME.md`.
