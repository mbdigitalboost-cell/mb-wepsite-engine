# PHASE 9.9 — Visual Polish & Production Readiness

Faz 9.8 audit'inden sonra yeni özellik eklemek yerine mevcut Petra Mühendislik sitesinin görsel/production-readiness eksiklerini kapatan faz. **Supabase migration yok, mevcut veri silinip değiştirilmedi, git commit/push yapılmadı, hiçbir gerçek olmayan şirket bilgisi/adres/telefon/sosyal medya URL'si/istatistik uydurulmadı.**

**Önemli sınırlama:** Bu ortamda bir görsel/AI image üretme aracım yok. Kullanıcının ikinci talimatındaki "Multi-Split/Isı Pompaları/Profesyonel Klimalar için yeni AI görseli oluştur" maddesi bu yüzden **kod-tabanlı, marka renklerine uygun ikon+gradient görsel** olarak karşılandı — gerçek fotoğraf değil. Kullanıcıya bu görev başında açıkça bildirildi.

---

## 1) Poppins fontu

`lib/fonts/README.md`'nin özgün planı `next/font/local` ile tek dosya/ağırlık öneriyordu, ama Türkçe karakterlerin (ğ, ş, İ) doğru render olması için Google'ın **iki ayrı unicode alt kümesi** (latin + latin-ext) gerekiyor — `next/font/local` ağırlık başına yalnızca tek dosyayı destekliyor (`node_modules/next/dist/docs` doğrulandı), bu yüzden planı biraz değiştirdim:

- Font dosyaları `@fontsource/poppins` npm paketinden (SIL Open Font License, self-hosted kullanım serbest) alınıp `public/fonts/petra/` altına kopyalandı — 4 ağırlık (400/500/600/700) × 2 alt küme (latin, latin-ext) × 2 format (woff2, woff) = 16 dosya.
- `app/(public)/petra-fonts.css` (yeni) — 8 adet `@font-face` kuralı (her ağırlık için latin + latin-ext, doğru `unicode-range` ile — tarayıcı karaktere göre doğru dosyayı otomatik seçiyor), `font-display: swap`, ve `.petra-poppins { --font-poppins: "Poppins", var(--font-sans); }`.
- `app/(public)/layout.tsx` — bu CSS import edildi, wrapper `<div>`'e `.petra-poppins` class'ı eklendi. Sadece Petra'nın `(public)` ağacını etkiliyor — root layout, `/dashboard`, `/login` dokunulmadı.
- `lib/theme/petra-theme.ts`'e hiç dokunmadım — zaten `var(--font-poppins, var(--font-sans))` kullanıyordu, `--font-poppins` artık gerçek bir değere sahip olduğu için Poppins otomatik devreye girdi.
- Doğrulama: build çıktısındaki CSS'te 8 `@font-face` + `font-family:Poppins` kuralı doğrulandı (`grep` ile sayıldı).

## 2) Markalı 404

`app/not-found.tsx` (yeni) — Next.js 16'da `not-found.js` "en yakın layout" üzerinden render olur, ama gerçekten eşleşmeyen bir path için bu garanti değil (bkz. `node_modules/next/dist/docs`'taki not). Bu yüzden `(public)` layout'una güvenmek yerine **aynı bileşenleri** (`SiteHeader`, `SiteFooter`, `MobileStickyCta`, Petra `ThemeProvider`) doğrudan bu dosyada birleştirdim — layout zincirinden bağımsız olarak her zaman doğru markayla render olması garanti.

İçerik: "404" büyük başlık, "Aradığınız sayfa bulunamadı." kısa mesaj, "Ana Sayfaya Dön" + "İletişime Geç" butonları, responsive (`Container` + aynı tipografi ölçekleri). `TrackingScripts` bilinçli olarak dahil edilmedi (bu sayfanın bir CMS round-trip'e bağımlı olmaması için) — geri kalan her şey statik Petra verisi.

Doğrulama: `curl /this-page-does-not-exist-xyz` → **404** durum kodu, build çıktısında `/_not-found` statik olarak prerender edildi.

## 3) Empty state tutarlılığı

**Kural:** anasayfadaki 4 bölüm (Statistics, Testimonials, Campaigns, Projects) artık **birebir aynı davranışı** gösteriyor — veri boşsa hiçbiri hiçbir şey render etmiyor (`return null`). Öncesinde Projects tek başına bir "yakında" kutusu gösteriyordu, diğer üçü sessizce kayboluyordu — bu tutarsızlığı giderdim.

- `components/sections/projects.tsx` — `if (projects.length === 0) return null;` eklendi, eski "Tamamlanan projelerimiz yakında burada yer alacak." kutusu kaldırıldı.
- Statistics, Testimonials, Campaigns (homepage kullanımı) zaten `return null` davranışındaydı — dokunmadım.

**Dedicated sayfalar (`/projeler`, `/kampanyalar`) farklı davranıyor — bilinçli olarak:** anasayfada "hiçbir şey gösterme" doğru, ama bu iki sayfanın kendisi boşsa sayfa tamamen boş görünür (sadece header/footer) — bu "bozuk site" hissi verir. Bunun için yeni paylaşılan bir bileşen oluşturdum:

- `components/ui/empty-state.tsx` (yeni) — ikon + başlık + açıklama içeren, marka renklerine uygun (dashed border, `--radius-brand`, `brand-secondary` arkaplan) tek bir jenerik boş-durum bloğu. Engine-nötr (Petra'ya özel metin içermiyor) — gelecekteki müşteriler de kullanabilir.
- `app/(public)/projeler/page.tsx` — proje yoksa artık `PageHeader` ("Projelerimiz") + `EmptyState` (HardHat ikonu, "Proje portföyümüz hazırlanıyor") gösteriyor.
- `app/(public)/kampanyalar/page.tsx` — kendi elle yazılmış dashed-box'ını kaldırıp aynı `EmptyState` bileşenine geçti (BadgePercent ikonu) — artık iki sayfa da birbirine tutarlı görünüyor.

Sonuç: anasayfa artık **hiç boş kutu göstermiyor** (temiz akış: Hero → TrustBar → Solutions → EngineeringProcess → Mitsubishi → WhyPetra → FAQ → FinalCTA → Footer), dedicated sayfalar ise gerçek veri gelene kadar profesyonel görünen, birbirine tutarlı bir "hazırlanıyor" mesajı veriyor.

## 4) Görseller

**Zaten entegre olanlar (bu fazdan önce, dokunmadım):** hero, split-klimalar, VRF sistemleri, sıcak su sistemleri, bakım/servis banner'ı — hepsi gerçek (AI-üretilmiş ama üçüncü taraf logosuz, kullanıcı onaylı) fotoğraflarla dolu.

**Görsel üretme aracım olmadığı için** eksik kalan 3 çözüm (Multi-Split, Isı Pompaları, Profesyonel Klimalar) ve mühendislik süreci bölümü için **kod-tabanlı ikon+gradient** çözümü uyguladım:

- `lib/data/petra/solution-icons.ts` (yeni) — her çözüm slug'ına temalı bir Lucide ikonu eşleyen bir harita (split→Snowflake, multi-split→LayoutGrid, profesyonel→Building2, VRF→Network, ısı pompası→Recycle, sıcak su→Droplets).
- `components/sections/solutions.tsx` — görseli olmayan kartlarda artık düz gradient yerine, gradient'in ortasında soluk (opacity düşük) bir ikon var — "eksik/kırık" değil, kasıtlı ve şık bir "içerik geliyor" hissi.
- `app/(public)/cozumler/[slug]/page.tsx` — bu sayfada hiç görsel yoktu (Faz 9.7 audit'inde "çok yalın" diye işaretlenmişti). Artık gerçek görsel varsa onu, yoksa aynı ikon+gradient muamelesini gösteren bir banner eklendi.
- `lib/data/petra/process-icons.ts` (yeni) + `components/sections/engineering-process.tsx` — mühendislik süreci bölümündeki 4 adıma (Keşif/Projelendirme/Kurulum/Servis) temalı ikonlar eklendi (Search/Compass/Wrench/Headset), sayı rakamının yanında küçük bir rozet olarak.

**Hiçbiri gerçek fotoğraf gibi sunulmuyor** — sadece dekoratif ikonografi, marka rengiyle (kırmızı aksan, lacivert/koyu zemin) tutarlı.

## 5) Ana sayfa görsel hiyerarşisi

Madde 3'teki empty-state değişikliği bu maddeyi büyük ölçüde otomatik çözdü: Statistics/Testimonials/Campaigns/Projects boşken artık hiçbiri render olmuyor (boş `<section>` kalıntısı, kenarlık, gereksiz boşluk yok — `return null` bir component hiçbir DOM üretmez). Güncel akış: **Hero → TrustBar → Solutions → EngineeringProcess → Mitsubishi/brand → WhyPetra → FAQ → FinalCTA → Footer** — kesintisiz, "eksik bölüm" hissi vermeyen bir sıra.

## 6) Mobil kontrol

**Dürüstçe belirtmem gerekiyor:** bu sandbox'ta gerçek mobil viewport ekran görüntüsü alamadım — Chrome uzantısının `resize_window` aracı bu ortamda viewport'u gerçekten küçültmüyor (Faz 9.7/9.8'de de aynı kısıtlama vardı) ve local sunucuya (localhost:3100) uzantıdan erişilemiyor. Bunun yerine **kod seviyesinde** bir denetim yaptım:

- Tüm dokunulan dosyalarda (`grep -rn "w-\[[0-9]"`) responsive olmayan sabit piksel genişliği bulunamadı.
- Yeni eklenen görsel alanlarının hepsi (`hero`, çözüm kartları, detay sayfası banner'ı, hizmetler banner'ı) `fill` + `object-cover` + sabit `aspect-*` container kullanıyor — bu kombinasyon tanım gereği taşma/kırpılma sorunu yaratmaz (375px'ten 4K'ya kadar).
- `MobileNav` bileşeni (`components/navigation/mobile-nav.tsx`) `lg:hidden` ile doğru şekilde tetikleniyor, erişilebilir dialog deseni (Escape ile kapama, body scroll kilidi) zaten mevcuttu — dokunmadım, bozulmadı.
- 404 sayfası aynı `Container`/tipografi ölçeklerini kullanıyor — diğer sayfalarla aynı responsive davranış garantili.

**Gerçek 375/390/430px ve tablet ekran görüntüsü ile doğrulama yapılamadı** — bunu production'a çıkmadan önce gerçek bir cihazda veya tarayıcı DevTools'ta ayrıca kontrol etmenizi öneririm.

## 7) Footer

`components/layout/site-footer.tsx`'in `socialLinks` altyapısına **hiç dokunulmadı**. Gerçek sosyal medya URL'si sağlanmadığı için hiçbir URL uydurulmadı — `petraSocialLinks` hâlâ boş `[]`.

## 8) Contact / Map

Harita eklenmedi (adres teyit edilmediği için — talimata uyuldu). Sadece görsel polish yapıldı:

- `components/sections/contact-details.tsx` — iletişim bilgileri artık düz bir liste değil, forma görsel ağırlık olarak denk gelen, kenarlıklı/başlıklı bir kart (`İletişim Bilgileri`) içinde. WhatsApp satırına da diğerleri gibi bir ikon (`MessageCircle`) eklendi — öncesinde tek eksik olan oydu.

## 9) Test sonuçları

```
npx tsc --noEmit     → temiz (hata yok)
npx eslint .          → temiz (hata yok)
npm run build         → başarılı, 21 route (not-found dahil statik prerender)
```

Route testleri (local `next start`, tüm istenen rotalar + 404):

| Route | Durum |
|---|---|
| `/` | 200 |
| `/cozumler` | 200 |
| `/cozumler/split-klimalar` | 200 |
| `/hizmetler` | 200 |
| `/projeler` | 200 |
| `/kampanyalar` | 200 |
| `/hakkimizda` | 200 |
| `/iletisim` | 200 |
| var olmayan path (`/this-page-does-not-exist-xyz`) | **404** |

Ek doğrulamalar: build çıktısındaki CSS'te 8 `@font-face` + `font-family:Poppins` kuralı sayıldı, 404 sayfasında "Aradığınız sayfa bulunamadı" + her iki buton + `petra-poppins` class'ı doğrulandı, `/projeler` ve `/kampanyalar`'ın yeni `EmptyState` metinleri doğrulandı.

## Değiştirilen / eklenen dosyalar

**Yeni:**
- `app/(public)/petra-fonts.css`, `app/not-found.tsx`, `components/ui/empty-state.tsx`
- `lib/data/petra/solution-icons.ts`, `lib/data/petra/process-icons.ts`
- `public/fonts/petra/*` (16 font dosyası)

**Değiştirildi:**
- `app/(public)/layout.tsx` (Poppins import + class)
- `app/(public)/cozumler/[slug]/page.tsx` (görsel banner)
- `app/(public)/projeler/page.tsx`, `app/(public)/kampanyalar/page.tsx` (EmptyState)
- `components/sections/projects.tsx`, `solutions.tsx`, `engineering-process.tsx`, `contact-details.tsx`

**Dokunulmadı (talimat gereği):** `components/layout/site-footer.tsx`, `lib/data/petra/site-config.ts` (sosyal medya/adres/telefon), tüm Supabase migration dosyaları, mevcut veri.

## Kalan gerçek eksikler (Phase 10'a bırakıldı)

- Multi-Split, Isı Pompaları, Profesyonel Klimalar için hâlâ **gerçek fotoğraf yok** (ikon+gradient geçici çözüm).
- Hero ve mevcut 3 çözüm görseli hâlâ moodboard'dan kırpılmış düşük çözünürlüklü (~500×200px) — kullanıcının kendisi de bunu "geçici çözüm" olarak işaretledi, gerçek yüksek çözünürlüklü dosyalarla değiştirilmeli.
- Gerçek istatistik, referans/testimonial, kampanya verisi hâlâ yok (uydurulmadı, boş kalmaya devam ediyor — doğru davranış).
- Adres/WhatsApp/çalışma saatleri hâlâ teyit edilmedi — harita bu yüzden eklenemedi.
- Gerçek mobil viewport testi bu sandbox'ta yapılamadı (bkz. madde 6).
- Favicon/OG görseli, SEO/performans/analytics/Vercel env/domain/güvenlik — kullanıcının belirttiği gibi Phase 10'un konusu.
