# Petra Mühendislik — Homepage Visual Experience Revision

Tarih: 2026-08-19
Kapsam: "Neden Petra?" ve "Sıkça Sorulan Sorular" bölümlerinin görsel yeniden tasarımı.

## 1. Değiştirilen / eklenen dosyalar

**Yeni:**
- `lib/data/petra/why-petra-icons.ts` — 4 avantaj başlığına göre line-icon eşlemesi (mevcut `lib/data/petra/process-icons.ts` ile aynı desen).
- `components/decorative/hvac-grid-pattern.tsx` — çok düşük opasiteli, markadan bağımsız (beyaz) teknik grid deseni; hem kartlarda hem section arka planında tekrar kullanıldı.
- `components/ui/section-divider.tsx` — "Neden Petra?" ve "SSS" bölümlerinin üst kenarındaki düz çizgiyi, ortasında kırmızı nokta + hafif glow olan premium bir ayraca çeviren paylaşılan bileşen.

**Düzenlendi:**
- `components/sections/why-petra.tsx` — 4 düz metin kolonu yerine premium kart sistemi.
- `components/sections/faq.tsx` — düz liste yerine numaralı accordion kartları + sol taraf eyebrow/başlık.

**Değişmedi:** `lib/data/petra/why-petra.ts`, `lib/data/petra/faqs.ts`, `lib/cms/adapters/faqs.ts`, `lib/cms/petra/mappers.ts`, `app/(public)/page.tsx` (bileşenlere geçirilen prop'lar aynı), header, footer, hero, solutions, route yapısı, SEO/JSON-LD.

## 2. Tasarımda yapılan değişiklikler

### "Neden Petra?" (`why-petra.tsx`)
- Desktop'ta `~33% / ~67%` (`lg:grid-cols-[1fr_2fr]`) split: solda başlık + kısa açıklama, sağda 2×2 kart grid'i (spec'in istediği 30-35/65-70 oranına denk).
- Mobilde tek kolon, `sm:` (≥640px) itibarıyla 2 kolonlu kart grid'i — masaüstü kompozisyonu mobile zorla uygulanmadı.
- Her kart: koyu yüzey (`bg-white/[0.03]`), ince border, üstte daire içinde line-icon (`lib/data/petra/why-petra-icons.ts`), büyük soluk numara (01-04), başlık ve **mevcut, değiştirilmemiş** açıklama metni.
- Kart arkasında çok düşük opasiteli (`opacity-[0.05]`) teknik grid deseni.
- Hover: kart 4px yukarı kalkar, border Petra kırmızısına yaklaşır (`border-brand-primary/30`), iki farklı konumlu beyaz radial-gradient katmanı opacity ile çapraz geçiş yaparak "gradient hareketi" hissi verir, ikon hafifçe büyür (`scale-105`), gölge artar, üstüne çok düşük yoğunlukta kırmızı bir ton biner (`bg-brand-primary/[0.04]`). Tüm geçişler 300-500ms, abartısız.
- Section arka planı: sağ üstte çok bulanık (blur-130px), düşük opasiteli kırmızı glow + tüm section'a yayılan çok soluk teknik grid — `overflow-hidden` ile taşma engellendi.

### "Sıkça Sorulan Sorular" (`faq.tsx`)
- Aynı `~33% / ~67%` split: solda kırmızı eyebrow ("MERAK ETTİKLERİNİZ"), başlık, kısa açıklama; sağda accordion kartları.
- Her soru artık ayrı bir kart (`border`, `bg-white/[0.03]`, `rounded-[var(--radius-brand)]`) — düz yatay çizgiler yerine.
- Sol tarafta büyük numara (01-06), açık kart kırmızı border + hafif aydınlık arka plan ile diğerlerinden ayrışıyor.
- "+"/"−" göstergesi gerçek bir plus-minus morph: dikey çizgi açılınca `scaleY(0)` ile kayboluyor, yatay çizgi kalıyor — döndürülmüş bir ikon değil, gerçek "+" → "−" dönüşümü.
- Cevap metni hem yükseklik (`grid-template-rows` tekniği, mevcut kodda zaten vardı) hem opacity+translate ile birlikte yumuşak şekilde beliriyor.
- Aynı anda yalnızca bir soru açık kalabiliyor — **değişmedi**, `openIndex` state mantığı aynen korundu.
- Soru/cevap metinleri **birebir korundu** (`lib/data/petra/faqs.ts` değişmedi).

### Section arası geçiş
- `SectionDivider`: `WhyPetra` ve `Faq`'ın kendi üst sınırlarında (`border-t border-white/10` yerine) artık ince bir gradient çizgi + ortada kırmızı, hafif parlayan bir nokta var. (Not: sayfa sırasında bu iki section arasında `Statistics` ve `Testimonials` de bulunuyor — mevcut section sırası **değiştirilmedi**; ayraç, brief'in "düz çizgi yerine premium geçiş" isteğini, her iki section'ın kendi üst kenarına aynı tasarım dilini uygulayarak karşılıyor.)

### Scroll reveal
- Mevcut `Reveal` bileşeni (değiştirilmedi) kullanıldı: başlıklar `fade-up` (24px yukarıdan, spec'in istediği 20-30px aralığında), kartlar `index` prop'uyla stagger (90ms aralıklarla sırayla), her ikisi de 700ms — spec'in istediği 400-700ms aralığının üst sınırında, zaten mevcut ve tüm sitede tutarlı olan süre. `prefers-reduced-motion` desteği `Reveal`/`useInView` içinde zaten var (azaltılmış hareket tercihinde içerik direkt son haliyle, animasyonsuz render ediliyor) — ek bir şey yapmaya gerek kalmadı.

## 3. Desktop sonucu
1440px, 1280px, 1024px, 768px genişliklerde ekran görüntüsü alındı (bu mesajla birlikte gönderildi): kart grid'i, sayı/ikon yerleşimi, hover-öncesi durum, FAQ accordion (ilk soru açık, kırmızı vurgulu) hepsi beklendiği gibi render oldu. 1024px'te mevcut header navigasyonunun "Ana Sayfa" yazısı iki satıra bölünüyor — bu, bu fazdan önce de var olan, header bileşenine ait, bu değişiklikle ilgisi olmayan bir davranış (header dosyasına hiç dokunulmadı).

## 4. Mobile sonucu
375px, 390px, 430px genişliklerde test edildi: kartlar taşmıyor, başlıklar kırılmıyor ("Sıkça Sorulan Sorular" 375px'te 3 satıra düzgün kırılıyor), FAQ cevapları rahat okunabiliyor, dokunma hedefleri (`min-h-[44px]` accordion butonlarında) ~44px'in altına düşmüyor, section padding'leri mevcut `py-24`/`lg:py-32` sistemiyle tutarlı kaldı. Mobilde kompozisyon zorla masaüstü düzenine sıkıştırılmadı — doğal tek kolon (kartlar için 375/390/430'da tek kolon, 768px tablet'te 2 kolon).

## 5. Lint sonucu
`npm run lint` → **PASS**, hata/uyarı yok.

## 6. tsc sonucu
`npx tsc --noEmit` → **PASS**, hata yok.

## 7. Build sonucu
`npm run build` → **PASS**, 25 route başarıyla üretildi. Build çıktısındaki `[cms/connection] ... Host not in allowlist` mesajları bu sandbox'ın ağ erişim kısıtından kaynaklanıyor, bu fazdan bağımsız ve beklenen bir durum (önceki fazlarda da aynı şekilde görülüyordu).

Ayrıca: `npm start` ile prod build ayağa kaldırılıp Playwright ile 1440/1280/1024/768/430/390/375 genişliklerinde gerçek tarayıcı testi yapıldı — **hiçbir genişlikte konsol hatası veya sayfa hatası çıkmadı**.

## 8. Korunan veri / mimari
- 4 avantaj başlığı ve açıklaması: **birebir aynı** (`lib/data/petra/why-petra.ts`).
- 6 FAQ sorusu ve cevabı: **birebir aynı** (`lib/data/petra/faqs.ts`).
- `Faq` bileşeni hâlâ CMS'ten gelen `faqs` prop'unu kabul ediyor (`app/(public)/page.tsx`'teki CMS-öncelikli/statik-fallback akışı değişmedi); `WhyPetra` zaten CMS'e bağlı değildi (yalnızca statik), bu faz da bu durumu değiştirmedi/CMS entegrasyonu eklemedi.
- Supabase migration çalıştırılmadı, gerçek veri değiştirilmedi, git commit/push yapılmadı.
- Header, footer, hero, solutions bölümlerine hiç dokunulmadı.
- Route ve SEO yapısı (JSON-LD, metadata, canonical) değişmedi.

## 9. Kalan eksikler / not
Yok — brief'in tüm maddeleri (kart tasarımı, hover davranışı, 30/70 kompozisyon, arka plan derinliği, FAQ kartları, plus-minus interaction, section divider, scroll reveal, mobil responsive, test adımları) uygulandı ve doğrulandı.
