# Petra Mühendislik — Hakkımızda Sayfası Revizyonu

Tarih: 2026-08-19
Kapsam: `/hakkimizda` sayfasının baştan görsel ve içerik revizyonu (Neden Petra? kartlarına hafif parallax dahil).

## 1. Değiştirilen / eklenen dosyalar

**Yeni veri:**
- `lib/data/petra/about.ts` — hero metni, kuruluş hikâyesi paragrafları, zaman çizelgesi (2017 / Bugün), "Mühendislik Yaklaşımımız" 4 adımı, sayfa sonu CTA metni. Tamamı kullanıcının bu fazda verdiği bilgilerle sınırlı.
- `lib/data/petra/approach-icons.ts` — "Mühendislik Yaklaşımımız" kartları için ikon eşlemesi (mevcut `process-icons.ts`/`why-petra-icons.ts` ile aynı desen).

**Yeni bileşenler:**
- `components/sections/about/about-hero.tsx` — sayfaya özel hero (eyebrow "HAKKIMIZDA", yeni H1/alt metin, düşük opasiteli teknik grid + kırmızı glow arka plan).
- `components/sections/about/founding-story.tsx` — "2017'de Başlayan Bir Mühendislik Hikâyesi" bölümü, sağda büyük soluk "2017" tipografik vurgusu.
- `components/sections/about/timeline.tsx` — dikey zaman çizelgesi; kırmızı çizgi scroll'da 0'dan %100'e büyüyor, iki nokta (2017 / Bugün) sırayla beliriyor.
- `components/sections/about/approach-cards.tsx` — "Bizim İçin İklimlendirme Sadece Bir Cihaz Değildir" başlığı + 4 numaralı kart (İhtiyaç Analizi, Doğru Çözüm, Profesyonel Uygulama, Teknik Destek).

**Düzenlendi:**
- `app/(public)/hakkimizda/page.tsx` — tamamen yeniden yazıldı: `AboutHero` → `FoundingStory` → `Timeline` → `ApproachCards` → `WhyPetra` (mevcut, değişmeden) → yeni özel CTA ("Projeniz İçin Doğru İklimlendirme Çözümünü Birlikte Belirleyelim.").
- `components/sections/why-petra.tsx` — `"use client"`e çevrildi, kart grid'ine çok hafif masaüstü mouse-parallax eklendi (`useParallaxPointer`, yalnızca `source === "mouse"`, dokunmatikte tamamen kapalı). Bu bileşen hem anasayfada hem `/hakkimizda`'da kullanıldığı için değişiklik her iki sayfada da görünür — kartların metni/verisi/hover davranışı değişmedi.

**Değişmedi:** `EngineeringProcess` (anasayfadaki "Sadece Klima Değil..." bölümü, verisi/kodu dokunulmadı) — `/hakkimizda`'dan kaldırıldı çünkü yeni "Mühendislik Yaklaşımımız" bölümü aynı fikri sayfaya özel metinlerle zaten anlatıyor; iki neredeyse aynı 4-kart bölümünü üst üste göstermemek için. Header, footer, `/`, `/iletisim`, diğer route'lar, CMS adaptörleri, SEO yapısı, admin paneli — hiçbiri değişmedi.

## 2. Uydurulmayanlar — kontrol

Kullanıcının "KESİNLİKLE UYDURMA" listesi tek tek kontrol edildi, hiçbiri `lib/data/petra/about.ts` veya component'lerde yok:
- çalışan sayısı ❌ yok
- ciro / milyon TL ❌ yok
- proje sayısı / "yüzlerce proje" ❌ yok
- yıllık proje sayısı ❌ yok
- sertifika ❌ yok
- ödül ❌ yok
- ISO belgesi ❌ yok
- yetkili bayi statüsü / resmi distribütörlük ❌ yok
- marka ortaklığı ❌ yok
- mühendis sayısı ❌ yok
- "Türkiye'nin lider firması" gibi doğrulanmamış iddialar ❌ yok

Kullanılan tek somut veri: **2017 Kahramanmaraş kuruluşu** ve kullanıcının verdiği süreç/yaklaşım metinleri — kullanıcının kendi cümleleriyle birebir veya doğrudan türetilmiş, teknik/finansal hiçbir rakam eklenmedi.

## 3. Görsel tasarım

- Mevcut Petra dili korundu: siyah/koyu arka plan, beyaz, kırmızı accent, ince çizgiler, büyük tipografi, geniş boşluklar, minimal mühendislik estetiği — hepsi mevcut `bg-brand-*`/`text-brand-*` CSS değişkenleri üzerinden, hiçbir yerde hardcoded hex renk yok.
- Sayfa artık 6 farklı görsel bölümden oluşuyor (hero, kuruluş hikâyesi, zaman çizelgesi, yaklaşım kartları, Neden Petra, CTA) — önceki "PageHeader + tek paragraf + tekrar eden süreç bölümü" yapısındaki boşluk hissi giderildi.
- Gerçek ofis/ekip fotoğrafı olmadığı için (doğrulanmamış) hiçbir yerde sahte/stok fotoğraf kullanılmadı — görsel zenginlik tamamen `HvacGridPattern` (teknik grid), soluk kırmızı glow'lar ve büyük soluk tipografik rakamlar (References showcase'teki dille tutarlı) üzerinden sağlandı.
- Her bölüm arasında `SectionDivider` (ince çizgi + kırmızı nokta) veya `border-b` ile görsel hiyerarşi korunuyor, sayfa monoton akmıyor.

## 4. Mikro animasyonlar (uygulanan)

1. Her bölüm `Reveal` ile scroll'da fade-up/scale-in beliriyor (mevcut sistem, 700ms).
2. Zaman çizelgesi: dikey kırmızı çizgi, bölüm görünüme girdiğinde `scaleY(0)→scaleY(1)` ile 1000ms'de büyüyor; iki nokta sırayla (300ms gecikmeli) kırmızıya dönüyor.
3. "Mühendislik Yaklaşımımız" ve "Neden Petra?" kartları: hover'da 4px yukarı kalkma, ikon %5 büyüme, kırmızı border/arka plan geçişi (mevcut WhyPetra kart dili, birebir tekrar kullanıldı).
4. "Neden Petra?" kart grid'i: masaüstünde çok hafif (≈2-4px) mouse-parallax — ölçüldü ve doğrulandı (bkz. §7).
5. Kuruluş hikâyesi'ndeki büyük "2017" rakamı `scale-in` ile beliriyor.

Tümü `prefers-reduced-motion: reduce` altında devre dışı kalıyor (global CSS kuralı + `useInView`/`useParallaxPointer`'ın kendi kontrolleri).

## 5. Mobil

390px ve 412px'de `/hakkimizda` test edildi (ekran görüntüleri gönderildi):
- H1 okunabilir, satır kırılmaları düzgün.
- Zaman çizelgesi doğal olarak dikey (masaüstü versiyonunun küçültülmesi değil, tasarım zaten dikey) — çizgi ve noktalar doğru hizalanıyor.
- Kartlar (yaklaşım + Neden Petra) tek kolon.
- Yatay scroll yok.
- CTA butonları görünür ve dokunma hedefi olarak yeterli boyutta (mevcut `Button` `size="lg"` → `h-14`).
- Animasyonlar sade, hover'a bağımlı gizli bilgi yok.

## 6. Erişilebilirlik

- Semantic HTML: `<h1>` hero'da, `<h2>` her bölüm başlığında, `<h3>` kartlarda, zaman çizelgesi `<ol>/<li>`.
- Tüm dekoratif öğeler (`grid pattern`, glow, büyük soluk rakamlar, timeline noktaları) `aria-hidden="true"`.
- CTA butonları mevcut `Button` bileşeni üzerinden — `focus-visible:outline` zaten yerleşik.
- Kontrast: metin renkleri mevcut `text-white`/`text-brand-muted` sistemiyle aynı, yeni bir renk eklenmedi.
- `prefers-reduced-motion` desteği yukarıda belirtildiği gibi korunuyor.

## 7. Test sonuçları

- `npx tsc --noEmit` → **PASS**
- `npm run lint` → **PASS**
- `npm run build` → **PASS**, tüm route'lar (26) başarıyla üretildi.
- Playwright ile `/hakkimizda`, `/`, `/iletisim` — 1440px ve 390/412px genişliklerde: **konsol hatası yok, kırık görsel yok, yatay taşma yok** (`scrollWidth === clientWidth` her testte doğrulandı).
- Mouse-parallax fonksiyonel testi: fare hareketiyle "Neden Petra?" grid'inin `transform: translate3d(...)` değeri gerçekten değişiyor (örn. `translate3d(1.69px, 3.37px, 0)`), çok hafif genlikte — brief'in istediği gibi.
- Header/footer/`/`/`/iletisim` sayfaları görsel olarak hiç değişmedi (ekran görüntüleriyle doğrulandı).

## 8. Yapılmayanlar (brief'in kendi kısıtı + kapsam netliği)

- Git commit/push yapılmadı.
- Supabase migration yapılmadı, mevcut CMS mimarisine dokunulmadı.
- Vercel'e dokunulmadı.
- Mesajın son cümlesindeki "iletişim vs görünüm olarak da güzelleştir" isteği bu fazın kapsamı dışında bırakıldı — brief'in tamamı özellikle `/hakkimizda` için detaylı talimat içeriyordu, `/iletisim` (veya başka sayfalar) için henüz somut bir tasarım talimatı yok. Hangi sayfa(lar) ve ne kapsamda istediğinizi belirtirseniz onu ayrı bir faz olarak ele alabilirim.
