# Petra Mühendislik — Marka/Ürün Slider Görsel Entegrasyonu (Faz H)

Tarih: 2026-08-22

## 1. Kapsam ve önemli not — brief'ten sapma

Brief, anasayfa hero bölümünün "sağ tarafındaki marka/ürün slider"ından bahsediyordu. İncelemede `Hero` bileşeninin herhangi bir slider içermediği, sitedeki tek sağ-taraflı ürün slider'ının **`MitsubishiSection` / `MitsubishiSlider`** (Hero'dan hemen sonra değil, Hero → TrustBar → Solutions → EngineeringProcess'in ardından gelen bölüm) olduğu görüldü. Bu, sizinle netleştirildi.

İki karar sizinle netleştirildi ve onaylandı:
- Mevcut 6 gerçek Mitsubishi Heavy model fotoğraflı slider **korundu, değiştirilmedi**.
- Yeni 9 marka için **ayrı bir bölüm** (`BrandsSection`) eklendi, `MitsubishiSection`'ın hemen altına yerleştirildi.

Ayrıca: bu ortamda görsel üretme (image generation) aracı yok, bu yüzden 9 markanın fotogerçekçi sahne görsellerini kendim üretemedim. Siz `petra_bayilik_markalari_gorsel_paketi.zip` ile 9 marka logosu yüklediniz. İncelemede bunların **gerçek marka logoları** (Mitsubishi Heavy'nin kırmızı üçgen amblemi, Samsung'un mavi wordmark'ı vb.) olduğunu, paketin kendi README'sinin de bunların "resmi logo dosyası değil, hızlı yerleşim için referans kart" olduğunu belirttiğini size bildirdim. Sizden bu 9 markanın tamamıyla onaylı/belgeli bir bayilik veya satıcı ilişkiniz olduğunu doğrulamanızı istedim — **"Evet, 9 marka için de gerçek/onaylı ilişki var"** yanıtını verdiniz, bu onayla görseller kullanıldı.

**Önemli:** Bu, Mitsubishi Heavy için zaten var olan `dealerStatusVerified` (yetkili bayi/servis) bayrağından ayrı ve daha zayıf bir iddiadır. Yeni bölümde hiçbir yerde "yetkili bayi/servis" gibi güçlü bir hukuki ifade kullanılmadı; yalnızca nötr "satışını ve kurulumunu gerçekleştirdiği markalardan biri" ifadesi kullanıldı. `petraMitsubishi.dealerStatusVerified` bayrağı dokunulmadan `false` bırakıldı.

**Üretim öncesi öneri:** Paketin kendi README'si, bu görsellerin resmi logo dosyası olarak kabul edilmemesi gerektiğini, üretimde markaların kendi resmi logo/brand-kit dosyalarıyla değiştirilmesini öneriyor. Görseller şu an ~440×200px çözünürlükte — sitede küçük "logo kartı" olarak kullanıldığı için bu yeterli, ama ileride resmi/yüksek çözünürlüklü marka varlıkları temin ederseniz `public/images/petra/brands/` altındaki dosyaları aynı isimlerle değiştirmeniz yeterli.

## 2. Ne eklendi

- **Yeni bölüm:** "Çalıştığımız Markalar" — anasayfada `MitsubishiSection`'ın hemen altında, `Projects`'ten önce.
- 9 marka: Mitsubishi Heavy, Samsung, Gree, EuroForm, Haier, Midea, Hisense, Vestel, Systemair.
- Her kart: marka logosu + altında ayrı HTML metni olarak marka adı (paketin README'sindeki "marka adı ayrı HTML metni olsun" talimatına uygun) — tıklanabilir, `/cozumler` sayfasına yönlendiriyor (marka özelinde ayrı bir ürün sayfası henüz yok, kırık link/uydurma sayfa oluşturulmadı — mevcut `FALLBACK_HREF` deseniyle birebir aynı yaklaşım).
- Masaüstünde: yatay kaydırılabilir kart şeridi + sağ/sol ok butonları + hover'da hafif yükselme/glow efekti + çok hafif masaüstü-only mouse parallax (dokunmatikte parallax yok, `source === "mouse"` kontrolü ile — projede daha önce kurulan aynı desen).
- Mobilde: dokunmatik kaydırma (scroll-snap), yatay taşma yok, ok butonları gizli (dokunmatik zaten doğal).
- `prefers-reduced-motion` açıkken: parallax tamamen devre dışı (mevcut `useParallaxPointer` hook'u zaten bunu garanti ediyor), sayfa hatasız çalışıyor (test edildi).

## 3. Tasarımda brief'ten bilinçli bir sapma

Brief, her marka için ≥1600×1000px fotogerçekçi tam ekran arka plan sahnesi (Mitsubishi slider'ındaki gibi) istiyordu. Ancak sağladığınız görseller küçük (~440×200px), zaten kart şeklinde tasarlanmış logo görselleri. Bu yüzden:
- Mitsubishi slider'ındaki gibi "tek aktif slayt, tam ekran arka plan fotoğrafı" yaklaşımı yerine, her markanın kendi kartını olduğu gibi gösteren bir **yatay logo kartı şeridi** tasarlandı — bu hem görsellerin gerçek boyutuna uygun hem de paketin kendi README'sindeki kart/mobil kaydırma talimatlarıyla birebir örtüşüyor.
- Kaydırma alanının kendisine parallax uygulanmadı (scroll ile parallax transformunun çakışıp titreşim yaratma riski nedeniyle); bunun yerine her kartın kendi hover kaldırma/glow efekti var. Çok hafif genel parallax yine de linkler üzerinde (kart konumunda küçük bir offset olarak) korunuyor.

Bunu brief'in "sadece görsel amaçlı yumuşak hareket" ruhuna sadık kalarak, ama gerçek varlıkların şekline uygun bir mühendislik kararı olarak uyguladım.

## 4. Değiştirilen / eklenen dosyalar

**Yeni görseller:**
- `public/images/petra/brands/mitsubishi-heavy.png`
- `public/images/petra/brands/samsung.png`
- `public/images/petra/brands/gree.png`
- `public/images/petra/brands/euroform.png`
- `public/images/petra/brands/haier.png`
- `public/images/petra/brands/midea.png`
- `public/images/petra/brands/hisense.png`
- `public/images/petra/brands/vestel.png`
- `public/images/petra/brands/systemair.png`

**Yeni veri:**
- `lib/data/petra/brands.ts` — `PetraBrand` tipi, 9 marka kaydı, hepsi `/cozumler`'a yönleniyor.

**Yeni bileşenler:**
- `components/sections/brands-slider.tsx` — yatay kaydırmalı, ok butonlu, hover-glow'lu, masaüstü-only hafif parallax'lı marka kartı slider'ı.
- `components/sections/brands-section.tsx` — başlık/açıklama + `BrandsSlider` sarmalayıcı bölüm.

**Düzenlendi:**
- `app/(public)/page.tsx` — `BrandsSection` import edildi ve `<MitsubishiSection />`'ın hemen altına eklendi (tek değişiklik, 2 satır).

**Değişmedi:** `components/sections/mitsubishi-section.tsx`, `components/sections/mitsubishi-slider.tsx`, `lib/data/petra/mitsubishi.ts`, `lib/data/petra/mitsubishi-models.ts` — mevcut Mitsubishi Heavy 6-model slider'ı olduğu gibi korundu. CMS/Supabase/env dosyalarına dokunulmadı.

## 5. Test sonuçları

- `npx tsc --noEmit` → **PASS**
- `npm run lint` → **PASS**
- `npm run build` → **PASS**, tüm 26 route temiz üretildi (`/` dahil, statik).
- `curl` ile 200 kontrolü: `/`, `/cozumler`, `/hizmetler`, `/hakkimizda`, `/iletisim` → hepsi **200**.
- Playwright (1440px masaüstü + 390px mobil):
  - Konsol hatası **yok**, sayfa hatası (`pageerror`) **yok**.
  - Yatay sayfa taşması **yok** (`scrollWidth - clientWidth === 0`) her iki genişlikte de.
  - 9 kartın tamamı görünür alana geldiğinde yükleniyor (görünür alandaki görseller `complete: true`; şeridin henüz kaydırılmamış kısmındaki kartlar `next/image`'ın standart lazy-load davranışıyla geç yükleniyor — bu, projede daha önce de gözlemlenen, gerçek bir hata olmayan bilinen bir davranış).
  - İlk karta tıklama → `/cozumler`'a doğru yönlendirme doğrulandı.
  - Sağ ok butonu → şeridi doğru yönde kaydırdığı doğrulandı (`scrollLeft` 16 → 275).
  - `prefers-reduced-motion: reduce` altında sayfa hatasız çalışıyor.
  - Ekran görüntüleri gönderildi (masaüstü + mobil).

## 6. Yapılmayanlar / dokunulmayanlar

- Git commit/push yapılmadı (talimatınız gereği).
- Supabase'e dokunulmadı, migration oluşturulmadı, env değişkenlerine dokunulmadı.
- CMS sistemi değiştirilmedi — bu bölüm de Mitsubishi bölümü gibi statik veriden besleniyor, CMS'e bağlanmadı (mevcut mimariyle tutarlı, Mitsubishi'de de CMS mapper'ı yok).
- Mevcut 6 model Mitsubishi slider'ına dokunulmadı.

## 7. Önemli uyarı — ilgisiz bekleyen değişiklikler

`git status` çalıştırıldığında, bu fazla **ilgisi olmayan 60+ dosyada** başka değişiklikler olduğu görüldü (ör. `app/(auth)/login/login-form.tsx`, dashboard sayfaları, `proxy.ts`, `.env.local.example` vb.) — bunlar bu oturumda benim tarafımdan yapılmadı, muhtemelen daha önceki bir çalışmadan commit edilmemiş halde kalmış. Aşağıdaki git talimatı **yalnızca bu fazın dosyalarını** stage ediyor; diğer bekleyen değişiklikleri ayrı olarak inceleyip karar vermeniz gerekiyor.

## 8. Sıradaki adım — VS Code / Claude Code oturumunuzda çalıştırın

```bash
git add lib/data/petra/brands.ts components/sections/brands-slider.tsx components/sections/brands-section.tsx "app/(public)/page.tsx" public/images/petra/brands/mitsubishi-heavy.png public/images/petra/brands/samsung.png public/images/petra/brands/gree.png public/images/petra/brands/euroform.png public/images/petra/brands/haier.png public/images/petra/brands/midea.png public/images/petra/brands/hisense.png public/images/petra/brands/vestel.png public/images/petra/brands/systemair.png PHASE_MARKA_SLIDER_RAPOR.md

git commit -m "Anasayfaya 9 markalik 'Calistigimiz Markalar' bolumu eklendi (Mitsubishi Heavy slider'i korunarak)"

npx tsc --noEmit && npm run lint && npm run build

git push
```

Sonucu (özellikle `push` çıktısını ve commit hash'ini) bana bildirin.
