# FAZ 12 — SON ÜRETİM / POLİSAJ RAPORU

Tarih: 2026-08-17
Kapsam: kullanıcının "Phase 12" talimatındaki 17 maddelik kontrol listesi.

**Not:** Bu rapor, cloud sandbox ortamında hazırlanan değişiklikleri anlatıyor.
Standart proje kuralı gereği git commit/push YAPILMADI — dosyalar kullanıcının
Windows makinesine (device bridge ile) aktarıldı, build/commit/push kullanıcının
kendi VS Code Claude Code oturumunda, kullanıcının onayıyla yapılacak.

---

## 1. Eksik "Profesyonel Klimalar" görseli

**Yapıldı.** Kullanıcının gönderdiği AI-üretimi ofis/kaset tipi klima fotoğrafı
(`ChatGPT_Image_17_A_u_2026_23_02_14.png`, 1536×1024, zaten 3:2 oranında)
1200×800'e ölçeklendi, `public/images/petra/solutions/professional-klimalar.jpg`
olarak kaydedildi. Görselde:
- Gömülü yazı/CTA/başlık/slogan yok (kontrol edildi, temiz).
- Sahte logo veya üçüncü taraf marka/logo yok (kontrol edildi, ekranlar boş,
  cihazlar markasız).
- `lib/data/petra/solutions.ts`'te `profesyonel-klimalar` kaydının `image`
  alanına bağlandı; başlık/açıklama metinleri koddan (site verisinden)
  render edilmeye devam ediyor, görsele hiçbir metin gömülmedi.

Bu görsel gerçek Petra iş yeri fotoğrafı DEĞİL, AI-üretimi jenerik stok
görseldir — Faz 9.9'da split-klimalar/VRF/sıcak-su için kabul edilen aynı
istisna kategorisinde (karar kaydı: `public/images/petra/README.md`).
Gerçek bir Petra fotoğrafı geldiğinde bu değiştirilebilir.

## 2. Çözümler grid'i son kontrol

7 kart (6 çözüm + Bakım&Servis `/hizmetler`'de ayrı banner olarak) tek tek
kontrol edildi:

- Her kartın tamamı gerçek Next.js `<Link href="/cozumler/${solution.slug}">`
  ile sarılı (`components/sections/solutions.tsx`) — görselin üstüne
  gömülü sahte buton/URL yok, tıklanabilirlik tamamen HTML/Next.js Link
  üzerinden.
- Slug'lar `lib/data/petra/solutions.ts`'teki gerçek veriden geliyor,
  uydurulmadı: `split-klimalar`, `multi-split-klimalar`,
  `profesyonel-klimalar`, `vrf-sistemleri`, `isi-pompalari`,
  `sicak-su-sistemleri`.
- Görseller `object-cover` + `aspect-[4/5]` ile düzgün kırpılıyor, kart
  yükseklikleri tutarlı (grid otomatik eşitliyor).
- Hover: `group-hover:scale-[1.04]` (görsel) + `group-hover:-translate-y-1`
  (metin) + ok ikonu `group-hover:translate-x-1` — çalışıyor (kodda
  doğrulandı, tarayıcıda görsel olarak da kontrol edildi).
- Masaüstü (1440px) ve mobil (390px) ekran görüntüleriyle doğrulandı —
  6 kart da (artık Profesyonel Klimalar dahil) doğru görsel + başlık +
  açıklama ile render ediliyor, mobilde yatay taşma yok (otomatik
  `document.documentElement.scrollWidth` kontrolü: **false/taşma yok**).

## 3-4. Footer + Yasal/Bilgilendirme linkleri

**Yapıldı — yeni "Yasal" kolonu eklendi.**

Önceden footer'da "Site Haritası" (tüm gerçek sayfa linkleri) ve
"İletişim" (sadece dolu olan alanlar — telefon/WhatsApp/bölge) vardı,
ikisi de zaten sadece gerçek veriden besleniyordu, değiştirilmedi.

Eklenen: 4 yeni sayfa + footer'da bunlara giden "Yasal" kolonu:
- `/gizlilik-politikasi` — Gizlilik Politikası
- `/kvkk-aydinlatma-metni` — KVKK Aydınlatma Metni
- `/cerez-politikasi` — Çerez Politikası
- `/kullanim-sartlari` — Kullanım Şartları

**ÇOK ÖNEMLİ — bilinçli sınırlama:** Bu 4 sayfanın içeriği hukuki metin
DEĞİL, "hazırlanıyor" ibaresi + gerçek telefon numarasına yönlendirme
(`components/legal/legal-placeholder.tsx`). Petra Mühendislik adına
inandırıcı görünen ama gerçekte hukuken doğrulanmamış bir gizlilik
politikası/KVKK metni/kullanım şartı yazmak, bu projenin "hiçbir hukuki
belgeyi gerçekmiş gibi uydurma" kuralını doğrudan ihlal eder. Şirket
unvanı, vergi no, MERSİS, tam adres gibi bu belgelerin gerektirdiği
bilgiler zaten sistemde yok (adres bile hâlâ `null` — bkz. madde 16).
**Gerçek, hukuken hazırlanmış metinler geldiğinde bu placeholder'ların
yerine konması gerekiyor — bu placeholder'lar canlıya çıkmaya uygun ama
nihai değil.**

"Sözleşmeler" ve "İade & Cayma Politikası" eklenmedi — Petra bir hizmet
şirketi, sitede online satış/ödeme akışı yok; bu iki belge tipik olarak
e-ticaret siteleri için gerekli. Kullanıcı bunları özellikle istiyorsa
ayrıca belirtmesi gerekir, aksi halde alakasız/gereksiz sayfa üretmek
istemedim.

"Kurumsal" ayrı bir kolon olarak eklenmedi — mevcut "Site Haritası"
kolonu zaten Hakkımızda dahil tüm gerçek sayfaları listeliyor,
ayrıştırmak sadece görsel bir tercih olur, yeni bir bilgi eklemez.

## 5. MB Digital Boost geliştirici ibaresi

**Yapıldı.** Footer'ın en altına, telif satırının yanına (masaüstünde
sağda, mobilde altta ortalı), düşük kontrastlı (`text-brand-muted/70`),
küçük punto ile eklendi:

> Web sitesi MB Digital Boost tarafından geliştirilmiştir.

Sadece metin — MB Digital Boost logosu projede mevcut olmadığı için
uydurulmadı. Petra markasından daha baskın değil (aynı boyut/ağırlık
sınıfı, daha düşük opaklık). Bu, Petra'nın MB Digital Boost'un müşterisi
olduğu anlamına gelmiyor — sadece "geliştiren ajans" kredisi.

## 6. Footer tasarımı

Mevcut tasarım dili korundu (lacivert/koyu zemin, beyaz tipografi,
kırmızı vurgu, ince border). Grid `sm:grid-cols-2 md:grid-cols-5` olarak
güncellendi (yeni Yasal kolonu için) — masaüstünde 5 kolon (logo 2 birim
+ Site Haritası + İletişim + Yasal), tablet'te 2 kolon, mobilde tek
kolon. Yatay taşma yok (kontrol edildi).

## 7. Mobil kontrol

Header, Hero, Çözümler grid, kartlar, CTA, iletişim formu, footer, yasal
linkler — hepsi 390px genişlikte kontrol edildi:
- Yatay scroll: **yok** (otomatik script ile doğrulandı).
- Kartlar taşmıyor, footer taşmıyor, yazılar kesilmiyor.
- Çözümler grid: mobilde 1 kolon, `sm:` 2 kolon, `lg:` 3 kolon (kodda
  zaten böyleydi, değişmedi, ekran görüntüsüyle doğrulandı).
- CTA butonları (hero + mobil sabit alt menü) taşmıyor.

## 8. Route kontrolleri

Tüm public route'lar `curl` ile HTTP status kontrolünden geçirildi:

| Route | Status |
|---|---|
| `/` | 200 |
| `/cozumler` | 200 |
| `/cozumler/split-klimalar` | 200 |
| `/cozumler/multi-split-klimalar` | 200 |
| `/cozumler/profesyonel-klimalar` | 200 |
| `/cozumler/vrf-sistemleri` | 200 |
| `/cozumler/isi-pompalari` | 200 |
| `/cozumler/sicak-su-sistemleri` | 200 |
| `/hizmetler` | 200 |
| `/projeler` | 200 |
| `/kampanyalar` | 200 |
| `/hakkimizda` | 200 |
| `/iletisim` | 200 |
| `/gizlilik-politikasi` (yeni) | 200 |
| `/kvkk-aydinlatma-metni` (yeni) | 200 |
| `/cerez-politikasi` (yeni) | 200 |
| `/kullanim-sartlari` (yeni) | 200 |
| `/sitemap.xml` | 200 |
| `/robots.txt` | 200 |
| `/login` | 200 |
| var olmayan rastgele bir yol | **404** (doğru — markalı 404 sayfası render ediyor) |

`/dashboard` alt route'ları auth-gated (login'e yönlendiriyor) — beklenen
davranış, ayrıca test edilmedi (kimlik doğrulama akışı bu faz'ın kapsamı
dışında, daha önceki fazlarda test edilmişti).

Beklenmeyen 404/500 bulunmadı. 404 sayfası (`app/not-found.tsx`) kendi
`SiteFooter`'ını ayrı çağırıyordu — yeni "Yasal" kolonu ve MB Digital
Boost ibaresi orada da görünsün diye o dosya da güncellendi.

## 9. SEO son kontrol

Her sayfada `title`/`description`/`canonical` mevcut (Faz 9.3/10'da zaten
kurulmuştu, bu fazda dokunulmadı — sadece yeni 4 sayfaya aynı desen
uygulandı). Favicon (`app/favicon.ico`) mevcut. `robots.txt` ve
`sitemap.xml` çalışıyor; yeni 4 sayfa sitemap'e düşük öncelikle
(`priority: 0.3`, `changeFrequency: yearly`) eklendi.

**Doğrulanamadı / bu fazda derinlemesine tekrar denetlenmedi:** Open
Graph/Twitter Card görsellerinin gerçek/güncel olup olmadığı,
apple-touch-icon varlığı — Faz 10'da zaten bir tur denetlenmişti, bu
fazda regresyon taraması yapılmadı (kapsam dışı bırakıldı, zaman/verim
nedeniyle).

## 10. Görsellerin son kontrolü

`lib/data/petra/*.ts` içindeki tüm `image:` alanları ile
`public/images/petra/` altındaki gerçek dosyalar karşılaştırıldı
(otomatik script). **Kırık path bulunamadı** — ilk taramada 6 "eksik"
görünen path (`petra-logo-white.svg`, `petra-mark.svg`,
`mitsubishi-heavy.webp`, `split.webp` vb.) incelendiğinde bunların hepsi
kod yorumlarındaki *örnek* path'ler olduğu görüldü (`// e.g. "..."`) —
gerçek `image`/`logoSrcDark` gibi alanların değeri hâlâ `null`, yanlış
pozitifti.

Üçüncü taraf marka/logo taraması: `lib/data/petra/mitsubishi.ts`'te
"Mitsubishi Heavy" adı geçiyor ama `image: null` (gerçek logo yok,
placeholder gradient render ediliyor) ve "yetkili bayi/servis" iddiası
`dealerStatusVerified: false` ile kilitli (sadece nötr metin
render ediliyor) — bu önceki fazlarda zaten bu şekilde
kurulmuştu, bu fazda değiştirilmedi, doğru olduğu teyit edildi.

Yeni eklenen 7 görselin (6 çözüm + profesyonel klimalar) hepsinde
`alt` metni `solution.title`'dan geliyor (kod zaten böyle, değişmedi).

## 11. CMS / Supabase

Bu fazda hiçbir migration çalıştırılmadı, hiçbir Supabase verisi
değiştirilmedi/silinmedi. Build sırasında görülen
`[cms/connection] Platform lookup failed ... Host not in allowlist`
uyarıları bu cloud sandbox'ın network egress kısıtlamasından kaynaklanıyor
(Supabase'e bu ortamdan erişilemiyor) — production/Vercel'de bu sorun
yok, önceki fazlarda zaten doğrulanmıştı. Draft/published ayrımına
dokunulmadı.

## 12. Leads / Formlar

Bu fazda form kodu değiştirilmedi. Önceki fazlarda kurulan validation +
honeypot + Supabase `leads` insert + fail-soft Resend e-posta bildirimi
altyapısı aynen duruyor. Gerçek credential (API key, service role key)
bu fazda da koda yazılmadı.

## 13. Performans

- Yeni `professional-klimalar.jpg`: 1200×800, ~208 KB — diğer çözüm
  görselleriyle aynı boy sınıfında (150-210 KB), aşırı büyük değil.
- `next/image` + `sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"`
  zaten Solutions kartlarında kullanılıyordu, yeni görsel de aynı
  bileşenden geçtiği için otomatik kapsandı — ekstra kod gerekmedi.
- Lazy loading: Next.js `<Image>` varsayılanı (yalnızca `priority` olarak
  işaretlenenler — hero — eager yükleniyor, geri kalanı lazy).
- Konsol hatası taraması: 12 route'ta (ana sayfa + tüm public sayfalar +
  yeni 4 yasal sayfa) **0 console error/pageerror**.

**Doğrulanamadı:** Lighthouse/CLS ölçümü bu fazda tekrar koşulmadı (Faz
10'da bir tur yapılmıştı); bu faz sadece yeni eklenen içeriğin (1 görsel
+ 4 sayfa + footer değişikliği) regresyon yaratmadığını doğruladı.

## 14. Accessibility

- Yeni görsel `alt` metni kod üzerinden geliyor (görsele yazı gömülmedi).
- Yeni 4 yasal sayfa `PageHeader` bileşenini kullanıyor — bu bileşen
  zaten doğru `h1` hiyerarşisini kuruyor (siteyi genelinde tutarlı desen).
- Footer'daki yeni "Yasal" `<nav aria-label="Yasal">` ile işaretlendi
  (diğer footer nav'ları gibi `aria-label` kullanıyor).
- Buton/link ayrımı, focus state, keyboard navigation: bu fazda
  değiştirilmedi, önceki fazların denetiminden aynen devam ediyor —
  bu fazda tekrar test edilmedi (kapsam dışı).

## 15. Son production test

```
npm run lint        → PASS (0 hata/uyarı)
npx tsc --noEmit     → PASS (0 hata)
npm run build        → PASS (25 route derlendi, beklenen Supabase
                        egress uyarıları dışında hata yok)
```

Build sonrası local production server (`next start`) üzerinden 20 route
`curl` ile ve Playwright ile gerçek tarayıcıda test edildi (bkz. madde 8
ve 13).

## 16. GitHub / Vercel

Bu fazda: GitHub remote'u değiştirilmedi, yeni repo oluşturulmadı, yeni
Vercel projesi oluşturulmadı, mevcut Vercel bağlantısına dokunulmadı.
**Git commit/push yapılmadı** — kullanıcının talimatına uygun olarak
sadece local (cloud sandbox) değişiklikler tamamlandı, dosyalar
kullanıcının kendi makinesine aktarıldı, commit/push kararı ve işlemi
kullanıcıya/VS Code Claude Code oturumuna bırakıldı. `.env.local`
projede yok/commit edilmiyor (önceki fazlarda doğrulanmıştı). Bu fazda
hiçbir secret değeri okunmadı/yazılmadı/rapora geçirilmedi.

---

## Bulunan problemler

- **Yok** — bu fazın kapsamındaki değişiklikler (görsel ekleme, yasal
  sayfa placeholder'ları, footer güncellemesi) build/lint/tsc/route
  testlerinin hiçbirinde hata üretmedi.
- Küçük bir yanlış pozitif: görsel path taramasında ilk turda 6 "eksik
  dosya" gibi görünen kayıt çıktı, incelemede hepsinin kod yorumundaki
  örnek path olduğu (gerçek alan değeri `null`) anlaşıldı — gerçek bir
  sorun değildi.

## Çözülemeyen / kullanıcıdan bilgi bekleyen konular

1. **`/gizlilik-politikasi`, `/kvkk-aydinlatma-metni`, `/cerez-politikasi`,
   `/kullanim-sartlari` sayfalarının gerçek metni** — şu an "hazırlanıyor"
   placeholder'ı gösteriyor. Hukuken hazırlanmış gerçek metinler
   (şirket unvanı, MERSİS/vergi no, tam adres dahil) geldiğinde
   `components/legal/legal-placeholder.tsx` yerine gerçek içerik
   konmalı.
2. **Adres hâlâ `null`** — ekran görüntüsünde görünen aday adres
   (Yusuflar Mahallesi, Şekerdere Caddesi No:29/A) format çelişkisi
   nedeniyle hâlâ onaylanmadı (önceki fazlardan taşınan açık madde).
3. **Resend e-posta bildirimi env'leri hâlâ eksik** — `RESEND_API_KEY`,
   `LEAD_NOTIFICATION_EMAIL_PETRA` (önceki fazdan taşınan açık madde).
4. **"Sözleşmeler" / "İade & Cayma Politikası"** — bilinçli olarak
   eklenmedi (madde 4'teki gerekçe). Kullanıcı gerçekten istiyorsa
   ayrıca teyit etmesi gerekiyor.
5. **GTM/GA4/Meta Pixel gerçek ID'leri, custom domain** — önceki
   fazlardan taşınan, hâlâ açık maddeler.

Hiçbir şirket bilgisi, müşteri/referans, iletişim bilgisi veya hukuki
belge bu fazda uydurulmadı.
