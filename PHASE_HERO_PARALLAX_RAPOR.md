# Petra Mühendislik — İnteraktif Hero / Parallax Sistemi

Tarih: 2026-08-19

## 1. Önce ne incelendi

- `components/sections/hero.tsx` — mevcut hero yapısı: tek bir `<HeroBackground>` (arka plan fotoğrafı) + `<Container>` içinde H1/subtext/CTA/trustInfo.
- `components/sections/hero-background.tsx` — mevcut yükleme animasyonu (scale-in), desktop/mobil için ayrı görsel (`backgroundImage` / `backgroundImageMobile`), okunabilirlik için karartma gradyanları.
- `lib/data/petra/hero.ts` — hero verisi (başlık, CTA, görsel yolları, `backgroundHasEmbeddedHeadline*` bayrakları). **Önemli tespit:** bu hero'da ayrı bir "arka plan" ve "ana ürün/klima görseli" katmanı yok — tek bir fotoğraf hem arka plan hem de baked-in başlık/logo içeriğini taşıyor. Bu yüzden 3 katmanlı sistem, gerçek fotoğrafik varlıklara göre şöyle eşlendi (bkz. §3).
- `lib/cms/adapters/hero.ts` — CMS'ten `hero_sections` okuyan adapter; değiştirilmedi.
- `lib/motion/use-reduced-motion.ts`, `lib/motion/use-in-view.ts` — mevcut motion altyapısı/konvansiyonları (prefers-reduced-motion kontrolü, rAF kullanım şekli) — yeni hook bunlarla aynı desene uyacak şekilde yazıldı.
- `HeroBackground`'ın yalnızca `Hero` içinden, `Hero`'nun da yalnızca anasayfada (`app/(public)/page.tsx`) kullanıldığı doğrulandı — efekt sadece bu hero'ya uygulandı, başka hiçbir bölüme sızmadı.

## 2. Değiştirilen / eklenen dosyalar

- YENİ `lib/motion/use-parallax-pointer.ts` — mouse (desktop) ve touch-drag (mobil) girdisini `-1..1` normalize edilmiş, rAF+lerp ile yumuşatılmış bir `{x, y, source}` durumuna çeviren tek hook.
- DÜZENLENDİ `components/sections/hero.tsx` — `"use client"` eklendi (önceden zaten saf, veri-çekmeyen bir render fonksiyonuydu; Reveal/Button zaten client component), `useParallaxPointer` ile `<section>`'a `ref` bağlandı, sonucu `HeroBackground`'a `parallax` prop olarak geçti.
- DÜZENLENDİ `components/sections/hero-background.tsx` — 3 katmanlı parallax + yeni ambient light overlay eklendi (detay §3). Görsellerin `next/image` kullanımı, `fill`, `sizes`, `objectPosition` mantığı **değişmedi**.

`lib/data/petra/hero.ts`, `lib/cms/adapters/hero.ts`, CMS/Supabase şeması **hiç değiştirilmedi**.

## 3. Efekt nasıl çalışıyor

### Girdi takibi (`use-parallax-pointer.ts`)
- `ref`, `hero.tsx`'te doğrudan `<section>` etiketine bağlanıyor — bu sayede mouse, CTA butonlarının/metnin üzerinden geçse bile (event bubbling ile) yakalanıyor; sadece görselin üzerinde değil, tüm hero alanında çalışıyor.
- Ham mouse/touch koordinatı **hiçbir zaman doğrudan React state'e yazılmıyor** — yalnızca bir `ref`'e (`targetRef`) yazılıyor. State güncellemesi (ve dolayısıyla tek re-render kaynağı) yalnızca `requestAnimationFrame` döngüsünden geliyor; bu döngü her karede mevcut değeri hedefe doğru `lerp` (0.1 katsayı) ile yumuşatıyor ve değişim çok küçükse (`<0.0006`) `setState`'i hiç çağırmıyor — bu hem "her mousemove'da render tetikleme" kısıtını hem de "lerp ile yumuşatma" isteğini aynı anda karşılıyor.
- Touch dinleyicileri (`touchstart/touchmove/touchend/touchcancel`) `{ passive: true }` ile eklendi ve hiçbir yerde `preventDefault()` çağrılmıyor — native scroll davranışı bozulmuyor.
- `prefers-reduced-motion: reduce` aktifken hiçbir dinleyici eklenmiyor, dönen değer kalıcı olarak `{x:0, y:0}` — bu da tüm transform'ların identity (hareketsiz) değere çökmesi anlamına geliyor: efekt gerçekten kapanıyor, sadece "azaltılmış" olmuyor.
- Mouse hero'dan ayrıldığında / touch bittiğinde hedef `{0,0}`'a döner, mevcut rAF döngüsü bunu birkaç kare içinde yumuşakça merkeze taşır ("Mouse bırakıldığında yumuşak dönüş" isteği).

### 3 katman (`hero-background.tsx`)

Bu hero'da gerçekten ayrı bir "arka plan" fotoğrafı yok (tek foto var, baked-in başlık/logo içeriyor). Bu yüzden brief'in 3 katmanı, mevcut, gerçek DOM elemanlarına şöyle eşlendi — yeni bir sahte görsel katman icat edilmedi:

1. **"Ana görsel" katmanı** (`data-parallax-layer="main"`) — gerçek fotoğrafın kendisi (desktop/mobil `<Image>`'ları saran yeni bir `div`). Mouse hareketinin **~6.5%'i** kadar `translate3d`, desktop'ta ek olarak **maks. 3°** `rotateX`/`rotateY` tilt. Mobilde (touch) amplitüd **2.5%**'e düşüyor ve tilt tamamen kapalı (brief'in mobil bölümü tilt istemiyor, sadece "hafif hareket").
2. **"Arka plan" katmanı** (`data-parallax-layer="background"`) — mevcut okunabilirlik karartma gradyanları (`bg-gradient-to-t` / `bg-gradient-to-r`) artık ana görselin **tersi yönde**, daha düşük genlikte (desktop 2.5%, mobil 1%) hareket ediyor; bu da tek fotoğraftan iki-plan derinlik hissi yaratıyor. Bu gradyanlar `-inset-[4%]` ile hafifçe taşırıldı (kapsayıcının `overflow-hidden`'ı tarafından kırpılıyor) ki küçük kayma hiçbir zaman boş/şeffaf bir kenar açığa çıkarmasın — durgun haldeyken (offset 0) piksel piksel öncekiyle aynı görünüyor.
3. **"Ön plan ışık"** (`data-parallax-layer="ambient"`) — yepyeni, markaya nötr, saf CSS `radial-gradient` bir parıltı (`rgba(255,255,255,0.14)`); görselin üzerinde ama karartma gradyanlarının altında konumlandırılarak hem gerçek metnin hem baked-in metnin kontrastını bozmuyor. Mouse'u en yüksek genlikle (desktop 14%, mobil 6%) takip ediyor — premium "ambient light" hissi için.

Üç katman da yalnızca `transform: translate3d(...)` (ve ana katmanda ek `rotateX/rotateY`) kullanıyor — hiçbiri `left/top/width/height` değiştirmiyor, dolayısıyla **CLS oluşturmuyor**. `will-change: transform` yalnızca bu 3 aktif katmanda var, sayfanın geri kalanında yok.

3D tilt'in görsel olarak inandırıcı olması için ana görseli saran kapsayıcıya `perspective: 1200px` eklendi (yalnızca CSS, layout'u etkilemiyor).

### Mobil dokunmatik fallback
Aynı hook, aynı `<section>` üzerinde hem mouse hem touch dinliyor — ayrı bir "mobil mod" kodu yok. Touch'ta:
- Parmak sürüklendikçe (touchstart'tan itibaren delta) görsel hafifçe hareket ediyor (yatay ve dikey).
- Genlik masaüstünden düşük (brief'in istediği gibi).
- Tilt (rotateX/Y) mobilde hiç uygulanmıyor.
- Parmak kalktığında (`touchend`/`touchcancel`) yumuşakça merkeze dönüyor.
- Scroll davranışı bozulmuyor (`passive: true`, `preventDefault` yok — Playwright testinde de doğrulandı, sayfa kaydırma hiçbir noktada engellenmedi).

## 4. CMS durumu

`Hero` bileşeni hâlâ `hero` prop'unu (CMS'ten geliyorsa CMS verisini, yoksa `petraHero` statik fallback'ini) aynen kullanıyor — `lib/cms/adapters/hero.ts` ve `app/(public)/page.tsx`'teki CMS-öncelikli/statik-fallback mantığı hiç değişmedi. Parallax efekti, hangi görsel kullanılıyorsa (CMS'ten mi statik mi) onun üzerine şeffaf şekilde biniyor.

## 5. Erişilebilirlik

- H1, CTA butonları, semantik yapı (`<section>`, `<h1>`, `<Button>` → gerçek `<a>`) **değişmedi**.
- Efekt tamamen görsel bir "enhancement" — hiçbir işlevsel davranış (link, buton, form) parallax durumuna bağlı değil. Efekt kapalıyken (`prefers-reduced-motion` veya JS hata verse dahi) site aynen kullanılabilir durumda kalıyor.
- Ambient light katmanı `aria-hidden="true"` ve `pointer-events-none` — ekran okuyucularda görünmüyor, tıklamaları engellemiyor.

## 6. Test sonuçları

- `npx tsc --noEmit` → **PASS**.
- `npm run lint` (ESLint) → **PASS** (bir `react-hooks/set-state-in-effect` hatası çıktı, `isDesktop` state'inin ilk değerini `useState(() => matchMedia...)` ile tembel okuyacak, effect içinde sadece *abone olacak* şekilde düzeltildi — sonrasında temiz).
- `npm run build` → **PASS**, 25 route, konsola sadece bilinen/beklenen `[cms/connection] ... Host not in allowlist` (sandbox ağ kısıtı, bu fazdan bağımsız, önceden de vardı) mesajları düştü.
- `npm start` ile prod build ayağa kaldırıldı, `curl` ile `/` → **200 OK**.
- **Playwright ile gerçek tarayıcı testleri** (Chromium, headless):
  - Hero render doğrulandı (screenshot'lar gönderildi).
  - **Desktop mouse**: mouse hero'nun sağ-alt köşesine götürüldüğünde ana katman `translate3d(6.20%, 6.10%, 0) rotateX(-2.81deg) rotateY(2.86deg)`, ambient katman `translate3d(13.36%, 13.13%, 0)`, arka plan katmanı ters yönde ve daha düşük genlikte `translate3d(-2.39%, -2.34%, 0)` — üç katman da beklenen oran ve yönde hareket ettiği doğrulandı.
  - **Mouse ayrılınca**: 1.5 saniye sonra tüm katmanlar `~0.01%`'e kadar geriledi (yumuşak merkeze dönüş çalışıyor).
  - **prefers-reduced-motion: reduce** emüle edilip mouse hareket ettirildiğinde tüm katmanlar `translate3d(0%, 0%, 0)`'da sabit kaldı — **efekt tamamen devre dışı** kaldığı doğrulandı.
  - **Mobil touch** (390×844, `has_touch=True`): simüle edilen touchstart/touchmove sonrası ana katman `translate3d(-0.89%, -0.30%, 0)` (rotate YOK), ambient `translate3d(-2.14%, -0.73%, 0)`, arka plan `translate3d(0.36%, 0.12%, 0)` — masaüstüne göre belirgin şekilde düşük genlik ve tilt'siz davranış doğrulandı. `touchend` sonrası merkeze döndü.
  - **Konsol hatası**: hem desktop hem mobil oturumda **0 konsol hatası / 0 sayfa hatası**.
  - **Responsive**: 375px, 390px, 430px (mobil), 820px (tablet), 1440px (desktop) genişliklerde ekran görüntüsü alındı — hiçbirinde taşma, kırpılma veya bozulma yok; mevcut mobil/tablet/desktop hero düzeni (Faz 13 revizyon 2'deki aspect-ratio/crop düzeltmeleri) korunuyor.

## 7. Bilinen sınırlama

- Bu hero'da ayrı bir "arka plan" fotoğrafı ile "ana ürün görseli" yok (tek foto, baked-in içerikli) — bu yüzden brief'in 3 katmanı, gerçek DOM elemanlarına eşlendi (bkz. §3): ana görsel = fotoğrafın kendisi, arka plan = mevcut karartma gradyanları, ön plan ışığı = yeni eklenen nötr radial-gradient parıltı. Yeni bir sahte görsel/logo/marka içeriği eklenmedi.
- Efekt masaüstünde gerçek bir fare, mobilde gerçek bir dokunmatik ekranla çok daha organik hissettirir — bu ortamda Playwright'ın sentetik `Touch`/`mousemove` event'leriyle test edildi (gerçek cihaz değil). Görsel/sayısal doğrulama yapıldı ama kullanıcının kendi telefonunda/faresinde bir kez denemesi önerilir.

## 8. Kalan eksikler
Yok — brief'in tüm maddeleri (desktop mouse parallax, mobil touch fallback, prefers-reduced-motion, performans/CLS, erişilebilirlik, CMS uyumu, yalnızca hero'ya scope, test adımları) uygulandı ve doğrulandı. Bu fazda Supabase migration çalıştırılmadı, git commit/push yapılmadı.
