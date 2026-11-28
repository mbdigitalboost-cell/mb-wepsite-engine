# Yeni site ekleme

MB Digital Boost'ta tek bir repo, tek bir platform Supabase'i ve **her site için ayrı bir Vercel projesi** var. Hiçbir site başka bir sitenin sayfasını, markasını, 404'ünü, sitemap kaydını, API'sini, metnini ya da verisini göstermez.

Kuralların tamamı: [`SITE_IZOLASYON.md`](../SITE_IZOLASYON.md) (repo kökü; her Claude Code oturumuna otomatik yüklenir). Bu belge o dosyanın §6'sındaki kontrol listesinin ayrıntılı hâlidir.

Bunu sağlayan yapı:

| Ne | Nerede |
|---|---|
| Site kaydı (`key`, `canonicalOrigin`, `deployBranch`, `leakTokens`) | `lib/sites/registry.ts` |
| Hangi dosya kimin | `lib/sites/ownership.ts` |
| Bir sitenin domaininde başka sitenin yolu 404 | `lib/sites/route-policy.ts` |
| Build: `SITE_KEY` / adres doğru mu | `scripts/check-site-env.mjs` (prebuild) |
| Build + test: site dosyasında başka sitenin izi / importu var mı | `scripts/check-isolation.mjs` (prebuild, `npm test`, `npm run check:isolation`) |
| Push: bir commit iki siteye dokunuyor mu, dal doğru mu | `.githooks/pre-push` → `scripts/check-branch-scope.mjs` |
| Vercel: proje yalnız kendi dalını derlesin | `scripts/vercel-should-build.mjs` (Ignored Build Step) |
| Yayından sonra: canlıda başka sitenin izi var mı | `npm run check:live -- <siteKey>` |

## Başlamadan önce (her bilgisayarda bir kez)

```bash
npm run setup:hooks
```

Bu komut `git config core.hooksPath` ayarını bu deponun `.githooks` klasörüne (mutlak yol) çevirir; push koruması bütün worktree'lerde (Petra worktree'si dahil) çalışır. Geri almak: `git config --unset core.hooksPath`. Kanca `git push --no-verify` ile atlanmaz (kullanıcı açıkça istemedikçe).

## Adımlar

### 1. Tür kararı: mağaza mı, kurumsal mı?

- **Mağaza (`store`)**: ortak mağaza motoru (`app/store/[storeSlug]/**`) sunar; içerik platform veritabanından gelir. Yeni sayfa kodu gerekmez.
- **Kurumsal (`corporate`)**: sayfalar **`app/sites/<key>/`** altına yazılır. Kök **`app/(public)/` Petra'ya aittir**; orada yeni site için dosya açılmaz, Petra'nın sayfaları kopyalanmaz (içerik kopyalanmaz: `SITE_IZOLASYON.md` §2.4). Yeni site sıfırdan ya da markasız bir şablondan başlar.

Site-özel dosyaların yeri (bu üç klasör sahiplik haritasında otomatik olarak `<key>` sitesine aittir, haritaya satır eklemek gerekmez):

```
app/sites/<key>/**      sayfalar
lib/sites/<key>/**      veri ve yardımcılar
public/sites/<key>/**   görseller
```

Bir sitenin klasörü başka bir sitenin klasöründen import edemez (ESLint ve `check:isolation` durdurur). Ortak olması gereken kod ortak motora taşınır ve hiçbir sitenin adını, alan adını, telefonunu sabit kodlamaz.

> **Henüz yapılmadı:** `app/sites/<key>/` altındaki sayfaların sitenin kök adresinde (`/`, `/hakkimizda` …) sunulması için `proxy.ts` / `lib/sites/route-policy.ts`'e host/`SITE_KEY` tabanlı rewrite eklenmesi gerekir. İlk kurumsal site eklenirken yapılır ve `tests/route-policy.test.ts` ile korunur.

### 2. Registry kaydı (`lib/sites/registry.ts` → `SITES`)

- `key`: küçük harf, benzersiz (Vercel'deki `SITE_KEY` değeri; dal ön eki ve klasör adı da budur)
- `kind`: `"store"`, `"corporate"` ya da `"panel"`
- `displayName`: 404 ve sayfa başlıklarında görünen ad
- `canonicalOrigin`: `https://www.alanadi.com` (https ile başlar, sonda `/` olmaz)
- mağazaysa `storeSlug`: `stores.slug` ile aynı
- **`deployBranch`**: production'ın yayınlandığı dal. Yeni siteler için `"main"`. (`"petra-production"` gibi ayrı bir dal "ayrı soy" demektir: o dal `main` ile asla birleştirilmez; yeni site için bu yol **önerilmez**.)
- **`leakTokens`**: siteyi ele veren ifadeler, küçük harfle: marka adı (boşluklu ve bitişik yazımı), alan adı, telefon, e-posta, sosyal medya kullanıcı adı. Bu ifadeler **başka sitelerin dosyalarında, ortak motorda ve başka sitelerin canlı sayfalarında otomatik olarak yasaklanır**; diğer sitelerin ifadeleri de bu sitede yasaktır. Boş bırakılamaz (test kırılır). En az 5 karakter, başka bir siteyle çakışmayan ifadeler seçin; çok genel bir kelime (ör. yalnız "klima") yanlış alarm üretir.

### 3. Sahiplik haritası (`lib/sites/ownership.ts`)

Site klasörleri (adım 1) otomatik eşlenir. Klasör dışında kalan site-özel dosyalar (ör. o müşteriye özel bir migration ya da seed, ortak klasördeki `<key>-*.tsx` bileşeni) haritaya **satır olarak** yazılır. Emin olunmayan dosya haritaya yazılmaz; raporda "sahibi belirsiz" diye listelenir.

### 4. Ayrı Vercel projesi

Aynı repodan (`mbdigitalboost-cell/mb-wepsite-engine`), Node 24.x.

Env (Production + Preview) — başka bir projenin env'i körlemesine **kopyalanmaz**:

- `SITE_KEY=<key>` (zorunlu; yoksa build durur)
- `NEXT_PUBLIC_SITE_URL=<canonicalOrigin>` (registry'deki değerle **aynı** olmalı, yoksa build durur)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (platform projesi)

**Ignored Build Step** (Settings → Git) — proje yalnız kendi dallarını derlesin:

```
[ -f scripts/vercel-should-build.mjs ] || exit 0; node scripts/vercel-should-build.mjs
```

Baştaki dosya denetimi şarttır: Vercel komutu derlenen dalın kendi dosyalarıyla çalıştırır; betiğin olmadığı bir dalda çıplak `node …` komutu "atla" yerine **hatalı deployment** üretir. Derlenen dallar: `deployBranch`, `<key>-*` ve (main'den yayınlanan projelerde) `faz-*`, `shared-*`. Başka sitenin dalları hiçbir zaman derlenmez.

Domaini bağla: Vercel → Project → Domains (www ↔ apex yönlendirmesi dahil).

### 5. Veri

- Platform veritabanında kendi `customers` / `stores` kaydı. Mağaza: `stores.slug` = `storeSlug`, kategoriler ve ürünler.
- Ayrı bir Supabase gerekiyorsa kullanıcı karar verir.
- **Hiçbir kayıt başka müşteriden kopyalanmaz.** `supabase/customer-template/` migration'ları bugün Petra'ya özel içerik de tohumluyor (`0008`, `0011`; `scripts/isolation-baseline.json`'da yazılı): yeni bir kurumsal müşterinin veritabanına uygulanmadan önce bu tohumlar ayrılmalıdır.
- Her sorgu `store_id` / `customer_id` ile süzülür; URL'den gelen id'nin o müşteriye ait olduğu sunucuda kontrol edilir (Faz 29).

### 6. Dış servisler (hepsi site başına)

- Google Search Console mülkü
- Takip kodları (GA4, Meta, Ads): mağazada admin panelinden, mağaza başına
- E-posta: mağaza başına `store_email_settings` satırı (admin → Mağaza → Ayarlar → E-posta: gönderen adı/adresi, yanıt adresi, yeni sipariş bildirim adresleri). **Satır yoksa o mağaza adına hiçbir e-posta gönderilmez**; ortam değişkenindeki ya da başka mağazanın adresine düşülmez. Gönderen adresinin alan adı e-posta sağlayıcısında (Resend) doğrulanmış olmalıdır (DKIM/SPF).
- E-posta başlık şeridi: bütün sipariş e-postalarında logo koyu bir şerit üzerinde durur. Renk bugün her mağaza için nötr `#18181b`'dir (mağaza verisinde "arka plan rengi" alanı yok). **İkinci mağaza eklenirken "E-posta → başlık şeridi rengi" alanı eklenmelidir** (`store_email_settings`'e bir sütun + admin kartında alan; şablon `EmailStore.headerBackground` ile rengi almaya hazır, `lib/commerce/order-emails/service.ts` bugün `null` veriyor). Logonun şerit üzerinde okunduğu yeni mağazada ayrıca kontrol edilir.
- E-posta sağlayıcı anahtarı (`RESEND_API_KEY`): bugün ortamda TEK anahtar var ve yalnız ilk mağazanın alan adı için yetkili. **Farklı alan adıyla ikinci bir mağaza eklenirken anahtar da mağaza başına tutulmalıdır** (ödeme/kargo anahtarlarıyla aynı desen: yalnız service-role okuyabilen ayrı tablo). Bu yapılmadan ikinci mağazanın e-postaları sağlayıcıda reddedilir.
- Supabase Auth → URL Configuration → Redirect URLs: `https://<domain>/**`
- Cloudflare / DNS
- Ödeme, kargo, fatura anahtarları: mağaza başına, veritabanında, admin'den girilir

### 7. Testler

- `tests/route-policy.test.ts` → `MATRIX`'e yeni sitenin en az şu yolları: kök, kendi sayfası, başka sitenin yolu (404), `/dashboard` (panele 308). Yeni bir `/api` route'u eklediysen sahibini `API_ROUTE_OWNERS`'a yaz.
- `tests/build-scope.test.ts` → `MATRIX`'e yeni sitenin dalları.
- `npm run check:isolation` yeşil olmalı. `npm test`, `npx tsc --noEmit`, `npm run build`.

### 8. Yayın ve yayın sonrası

- Dal ve commit'ler site anahtarıyla etiketlenir: dal `<key>-…`, commit başlığı `[<key>] …`. Ortak motor değişikliği ayrı commit'tir: `[shared] …`. Bir commit iki sitenin dosyasına dokunamaz.
- Push'tan önce: `npm run check:scope -- --range origin/main..HEAD --files` (sahiplik özeti) ve `npm run check:isolation`.
- Production yayını, kullanıcı o siteyi adıyla anarak onay verdikten sonra yapılır.
- Yayından sonra: `npm run check:live -- <key>` ve diğer sitelerin production SHA'sının değişmediğinin raporu.
- `SITE_IZOLASYON.md` §1 tablosuna ve bu belgeye yeni siteyi yaz.

## İkinci mağazadan ÖNCE bilinmesi gerekenler

Ortak mağaza motorunda kalan mağazaya özel noktaların tam listesi gerekçeleriyle `scripts/isolation-baseline.json`'dadır; başlıcaları:

- Ana sayfa tasarımı ve yedek logo/favicon artık mağazanın kendi klasöründedir (`lib/sites/<siteKey>/showcase.tsx`, Faz 39); vitrin metinleri (duyuru şeridi, sayfa sonu bandı, ürün rozeti) ve e-posta ayarı veritabanındadır. Yeni mağaza bunları kendi satırlarıyla doldurur; boş bırakılan parça gösterilmez.
- E-posta sağlayıcı anahtarı mağaza başına değildir (bkz. yukarıda "Dış servisler").
- Mağaza font seti (`lib/fonts/store/**`) ve mağaza teması tek bir tasarımdır

Baseline yalnız küçülebilir: bir madde düzeltilince dosyadan silinir. Yeni madde eklemek kullanıcı onayı ister.

## Bilinmesi gerekenler

- **Admin yalnızca panel domaininde.** Mağaza ya da kurumsal sitede `/dashboard`, `/login`, `/mfa-challenge` ve `/auth/set-password` panele 308 ile yönlenir.
- **Petra ayrı bir soydur.** Canlısı `petra-production` dalından yayınlanır; Petra işi yalnız oradan açılan `petra-*` dallarında yapılır. `main`'deki `app/(public)/**` Petra kopyası canlıyı etkilemez ve orada Petra değişikliği yapılmaz. Push koruması `main` soyuna Petra dosyası, Petra dalına Petra dışı dosya girmesini engeller.
- **Bir koruma yanlış alarm veriyorsa koruma gevşetilmez.** Ya kod düzeltilir ya da `scripts/isolation-baseline.json`'a gerekçesiyle ve kullanıcı onayıyla istisna yazılır.
