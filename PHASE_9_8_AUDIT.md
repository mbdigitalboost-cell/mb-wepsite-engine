# PHASE 9.8 — Visual Completion & Production Polish Audit

**Kapsam:** `https://petra-muhendislik.vercel.app/` canlı sitesi (masaüstü, ~1568px viewport) + ilgili kaynak kod (`lib/data/petra/*`, `lib/theme/petra-theme.ts`, `components/sections/*`, `components/layout/*`, `lib/fonts/`, `public/images/petra/README.md`).
**Kod değişikliği, migration, Supabase veri değişikliği: YOK.** Bu, Faz 9.7'nin devamı olan, öncelik sıralı ve şiddet (severity) etiketli bir audit'tir.
**Mobil sınırlama (9.7'den taşınan, hâlâ geçerli):** Bu sandbox'taki tarayıcı otomasyonunun `resize_window` aracı gerçek bir viewport küçültmesi üretmiyor — ekran görüntüleri ısrarla masaüstü genişliğinde kaldı. Mobil bölümü (§19) bu yüzden kod incelemesine (Tailwind `sm:`/`md:`/`lg:` class kullanımı, `MobileNav` bileşeninin varlığı) dayanıyor, gerçek mobil ekran görüntüsüne dayanmıyor. Gerçek cihaz/DevTools testi hâlâ öneriliyor.

Her madde şiddet etiketiyle: **CRITICAL** (production'a çıkmadan mutlaka çözülmeli) / **HIGH** (güçlü tavsiye) / **MEDIUM** (fark yaratır ama engel değil) / **LOW** (kozmetik/nice-to-have).

---

## 1) Gerçek görsel/logo eksikleri — CRITICAL

Hiçbir gerçek görsel/logo repoda yok. Hepsi kod tarafında `null`/boş olarak bilinçli bırakılmış (uydurma görsel yasağına uyularak):
- Logo: `logoSrcDark`/`logoSrcLight` (`lib/data/petra/brand-assets.ts`) — `null`
- Hero arka planı: `petraHero.backgroundImage` — `null`
- 6 çözüm görseli: `petraSolutions[].image` — hepsi `null`, beklenen dosya adları koddaki yorumlarda zaten yazılı (`split-klima.webp` vb.)
- Proje görselleri: `petraProjects` dizisi boş (görsel de yok, veri de yok)
- Kampanya görselleri: `petraCampaigns` dizisi boş
- Mitsubishi bölüm görseli: `petraMitsubishi.image` — `null`
- Referans/testimonial görselleri: `petraTestimonials` dizisi boş (görsel alanı tip tanımında var ama veri yok)
- İletişim/harita görseli: kod tarafında bu alan hiç yok (bkz. §18)

Bu tek başına sitenin "demo" hissinin ana kaynağı — kodun kendisi değil.

## 2) Ana sayfa section görünürlükleri — bilgilendirme (CRITICAL değil, davranış doğru)

Kod incelemesi ve canlı site gözlemi birebir örtüşüyor:
- `Statistics` → veri boşsa **hiçbir şey render etmiyor** (`return null`), boş-state mesajı bile yok.
- `Testimonials` → aynı şekilde veri boşsa `return null`.
- `Projects` → veri boşsa **boş-state mesajı gösteriyor** ("Tamamlanan projelerimiz yakında burada yer alacak.").
- `Campaigns` → veri boşsa `return null` (Projects'ten farklı olarak mesaj da göstermiyor).
- `EngineeringProcess`, `MitsubishiSection`, `WhyPetra` → statik veri kullanıyorlar, her zaman render oluyorlar, canlı sitede görünüyorlar.

**Tutarsızlık (MEDIUM):** 4 "boş olabilir" bölümden (Statistics, Testimonials, Projects, Campaigns) sadece Projects kullanıcıya "yakında" mesajı gösteriyor; diğer üçü sessizce kayboluyor. Bu tutarsızlık, aynı sayfanın bazı yerlerinde "içerik hazırlanıyor" hissi verirken bazı yerlerinde bölümün hiç var olmadığı izlenimini veriyor.

**Öneri:** Ya hepsi sessiz kalsın ya hepsi tutarlı bir "yakında" mesajı göstersin — karar sizin, ama şu anki karma davranış kasıtlı görünmüyor.

## 3) Poppins/font sistemi — HIGH

`lib/fonts/poppins.ts` yok. `lib/theme/petra-theme.ts` `var(--font-poppins, var(--font-sans))` ile tanımlı, yani Poppins yoksa sistem sans-serif'e (muhtemelen Arial/Helvetica benzeri) sessizce düşüyor. Marka kimliği brief'te Poppins'i özellikle istiyor gibi duruyor (tema dosyasındaki yorum bunu doğruluyor). **Bu, görsel gerektirmeyen, tamamen kodla/paketle (Google Fonts, ücretsiz) çözülebilecek tek CRITICAL-yakın maddelerden biri.**

## 4) Petra marka renkleri ve typography — LOW (kod tarafı zaten doğru)

`petraTheme` tek merkezi dosya (`lib/theme/petra-theme.ts`): kırmızı `#E31E24` (~%10 kullanım, aksan), koyu zemin `#0B0D0F`, `radius: 0.25rem` (bilinçli olarak keskin/teknik, yuvarlak değil). Canlı sitede renkler bu tanıma sadık uygulanmış görünüyor. Sorun renklerde değil — Poppins eksikliği yüzünden typography'nin "vaat edilen" marka hissini henüz tam vermemesi (bkz. §3).

## 5) Header / navigation — MEDIUM

- Logo yerine sadece "PETRA / MÜHENDİSLİK" metin wordmark'ı var (bkz. §1).
- Masaüstünde header sticky, scroll'da şeffaftan koyu+blur'a geçiyor — çalışıyor, sorunsuz.
- `MobileNav` bileşeni koda var (`components/navigation/mobile-nav.tsx`) — kodda hamburger menü mantığı mevcut, ancak bu oturumda gerçek mobil ekran görüntüsüyle doğrulanamadı (bkz. üstteki sınırlama notu).

## 6) Hero — HIGH

Metin/CTA/yapı sağlam (başlık, alt metin, "Keşif Talep Et" + "WhatsApp'tan Ulaş" CTA'ları, güven rozetleri "Satış · Kurulum · Servis"). Ama arka plan görseli olmadığı için düz koyu zemin üzerine metin — sitenin ilk izlenimi en çok burada zayıflıyor. Görsel eklendiğinde en yüksek etkiyi burada yapacak.

## 7) Solutions (Çözümler) — HIGH

6 kart, her biri başlık + kısa açıklama içeriyor, kod tarafı (Faz 9.6) artık `short_description`/`description` ayrımını destekliyor. Kartlarda görsel alanı ayrılmış ama boş — görseller eklenene kadar kartlar birbirinden neredeyse hiç görsel olarak ayrışmıyor.

## 8) Engineering Process (Süreç) — LOW

4 adımlı süreç (Keşif/Projelendirme/Kurulum/Servis) hem anasayfada hem `/hakkimizda`'da birebir aynı şekilde tekrarlanıyor (bkz. §17). Kendi içinde çalışıyor, görsel gerektirmiyor.

## 9) Mitsubishi section — MEDIUM

`dealerStatusVerified: false` olduğu için doğru şekilde nötr metin gösteriliyor ("...ürünlerini müşterilerine sunar", "yetkili bayi" DEĞİL) — bu doğru ve bilinçli bir güvenlik/hukuki temkinlilik, korunmalı. Görsel `null` — marka lisans/telif kuralları netleşmeden bu görsel eklenmemeli (kod yorumunda bu zaten belirtilmiş: "only if a real, license-cleared brand asset is provided").

## 10) Projects (Projeler) — CRITICAL (içerik eksikliği), kod tarafı doğru

Dizi boş, boş-state mesajı doğru render oluyor. `/projeler` sayfası da aynı bileşeni kullanıyor. Kod hazır — tek eksik gerçek proje fotoğrafı + açıklaması.

## 11) Campaigns (Kampanyalar) — CRITICAL (içerik eksikliği)

Dizi boş, `return null` — hem anasayfada hem `/kampanyalar` sayfasında pratikte hiçbir şey yok (sadece sayfa başlığı + "Şu anda aktif bir kampanyamız bulunmuyor." metni, ki bu `/kampanyalar` sayfasının kendi statik metni, component'in kendisi değil). Bu, 9.7'de de en boş görünen sayfa olarak işaretlenmişti.

## 12) Why Petra (Neden Petra?) — LOW

Statik veri (`petraAdvantages`), her zaman render oluyor, görsel gerektirmiyor, sorunsuz.

## 13) Statistics — HIGH (içerik eksikliği)

Dizi boş → bölüm hiç render olmuyor. Rakamlar (müşteri sayısı, proje sayısı, deneyim yılı) güven inşa eden en güçlü unsurlardan biri olduğu için önceliği yüksek tutuyorum — görsel gerektirmiyor, sadece teyitli rakam gerektiriyor.

## 14) Testimonials (Referanslar) — MEDIUM (içerik eksikliği)

Dizi boş → bölüm hiç render olmuyor. Google yorumları/direkt referanslar sağlandığında hızlıca eklenebilir; görsel opsiyonel (tip tanımında var ama zorunlu değilmiş gibi duruyor — component kodunu bu açıdan tekrar teyit etmek gerekebilir bir sonraki uygulama fazında).

## 15) FAQ (SSS) — LOW

Statik veri (`petraFaqs`) + CMS-first/fallback zaten Faz 9.2'de bağlanmış, canlı sitede sorunsuz render oluyor.

## 16) Final CTA — LOW

WhatsApp yönlendirmesiyle çalışıyor, sorunsuz.

## 17) Footer — MEDIUM (kod hazır, sadece veri eksik)

`SiteFooter` bileşeni incelendi: telefon, WhatsApp, e-posta, adres/hizmet bölgesi, çalışma saatleri, **ve sosyal medya linkleri (`socialLinks`) için kod zaten tam hazır** — her alan `null`/boşsa görünmüyor, placeholder göstermiyor (doğru pattern). `petraSocialLinks` dizisi (`lib/data/petra/site-config.ts`) şu an boş `[]`. **Düzeltme (9.7'deki notumu güncelliyorum): bu kod değişikliği değil, sadece veri girişi** — Instagram/Facebook URL'si `petraSocialLinks`'e eklenince footer'da otomatik görünecek.

## 18) İletişim sayfası — HIGH

Form (Ad Soyad, Telefon, E-posta, Hizmet, Mesaj) çalışıyor durumda (Faz 9.5'te doğrulanmış leads sistemine bağlı). **Harita/konum görselleştirmesi kod tarafında hiç yok** — ne bir `<iframe>` ne statik harita görseli. Bu, mevcut komponent setinin bir eksiği (görsel değil, kod eksikliği) — ama anlamlı bir harita için önce tam adresin teyit edilmesi gerekiyor (`address: null`).

## 19) Responsive/mobile — belirsiz, bu oturumda doğrulanamadı

`MobileNav` bileşeni kodda mevcut; Tailwind responsive class'ları (`sm:`/`md:`/`lg:`) sections genelinde tutarlı kullanılıyor (örn. `WhyPetra`'da `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, footer'da `md:grid-cols-4`). Kod düzeyinde responsive tasarım prensipleri doğru uygulanmış görünüyor, ama **gerçek mobil viewport'ta hiç görsel doğrulama yapılamadı** (araç kısıtlaması). Production öncesi gerçek cihaz/DevTools testi zorunlu.

## 20) Loading/empty/error states — MEDIUM

- Boş-state davranışı §2'de ele alındı (tutarsız: Projects mesaj gösteriyor, Statistics/Testimonials/Campaigns göstermiyor).
- `app/` altında özel `error.tsx`, `loading.tsx`, `not-found.tsx` **bulunamadı** — proje şu an Next.js'in varsayılan/jenerik hata ve 404 sayfalarını kullanıyor (markasız, "Application error" tarzı generic ekranlar). Production'a çıkmadan önce en azından markalı bir 404 sayfası eklenmesi kullanıcı deneyimi açısından değerli olur (kod-only, görsel gerektirmez).

---

## ÖZET CHECKLİST

### A) Production'a çıkmadan önce yapılması gerekenler (öncelik sırasıyla)
1. Logo + hero görseli + en az bazı çözüm görselleri yüklenmeli (§1, §6, §7) — CRITICAL
2. Poppins fontu eklenmeli (§3) — HIGH, kod-only
3. En az birkaç gerçek istatistik girilmeli (§13) — HIGH, veri-only
4. `/kampanyalar` ya gerçek kampanya ile doldurulmalı ya da menüden geçici gizlenmeli (§11) — CRITICAL
5. İletişim bilgileri (adres, WhatsApp, çalışma saatleri) teyit edilip girilmeli (§17, §18)
6. Gerçek mobil cihazda/DevTools'ta tam kontrol yapılmalı (§19)
7. Markalı 404 sayfası eklenmeli (§20)

### B) Kullanıcıdan (Bilal) beklenen assetler
- Petra logosu (açık + koyu zemin versiyonu, SVG tercihen)
- Hero arka plan görseli/render
- 6 çözüm kategorisi görseli (split, multi-split, profesyonel, VRF, ısı pompası, sıcak su)
- Gerçek proje fotoğrafları (en az birkaç adet, açıklamalarıyla)
- Kampanya görselleri (kampanya içeriğiyle birlikte)
- Mitsubishi Heavy görseli — **yalnızca lisans/telif açısından temiz bir görsel** ise
- Referans/testimonial görselleri (varsa, zorunlu değil)
- Gerçek istatistik rakamları (müşteri sayısı, proje sayısı, deneyim yılı vb.)
- Teyitli iletişim bilgileri: tam adres (cadde/no), WhatsApp numarası (telefon numarasından ayrı teyit), e-posta, çalışma saatleri
- Sosyal medya URL'leri (Instagram vb.)

### C) Kod tarafında yapılacak işler (görsel/içerik beklemeden şimdi yapılabilir)
- Poppins font paketini ekle (`lib/fonts/poppins.ts`, `lib/fonts/README.md`'deki talimata göre)
- Markalı `not-found.tsx` (404) ekle, `error.tsx` değerlendirilebilir
- Statistics/Testimonials/Campaigns boş-state davranışını Projects ile tutarlı hale getirmek isteniyorsa (opsiyonel karar, kullanıcıya bağlı)
- `/iletisim` sayfasına harita `<iframe>` alanı için kod altyapısı hazırlanabilir (adres teyit edilene kadar boş/gizli kalır)

### D) Supabase/CMS tarafında yapılacak işler
- Gerçek görseller Faz 9.4'te kurulan Supabase Storage/Media sistemine yüklenmeli, ardından ilgili CMS içerik satırlarının (`solutions`, `projects`, `campaigns`, `hero_sections`, vb.) `image` alanları bu yeni URL'lerle güncellenmeli
- `projects`/`campaigns`/`testimonials` tablolarına gerçek satırlar eklenip `status = 'published'` yapılmalı (CMS-first pattern zaten hazır, sadece veri bekliyor)
- Logo, `site_settings` veya benzeri bir alanda mı yoksa statik `brand-assets.ts`'te mi tutulacağına karar verilmeli (şu an statik dosyada — CMS'e taşınacaksa küçük bir şema/kod değişikliği gerekir)

### E) Mobilde kontrol edilmesi gerekenler (bu oturumda doğrulanamadı)
- Header'ın gerçekten hamburger menüye düşüp düşmediği ve menünün açılıp kapanması
- `/iletisim` formundaki input alanlarının mobilde taşma yapıp yapmadığı
- `/cozumler/[slug]` detay sayfalarındaki büyük başlıkların (`text-[64px]` gibi) mobilde okunabilirliği
- `Reveal` scroll-fade-in animasyonunun mobil/düşük performanslı cihazlarda gecikme yaratıp yaratmadığı
- Genel dokunma hedefi (tap target) boyutları — butonlar, nav linkleri

---

**Sonuç:** Sitenin "eksik/demo" hissi vermesinin ana nedeni kod kalitesi değil — mühendislik tarafı (CMS bağlantıları, boş-state davranışları, fail-soft tasarım, marka teması) sağlam ve tutarlı. Eksiklik neredeyse tamamen gerçek görsel/içerik/teyitli bilgi eksikliğinden kaynaklanıyor. Kodla hemen çözülebilecek tek gerçek kazanımlar: Poppins fontu, markalı 404 sayfası, ve (isteğe bağlı) boş-state tutarlılığı.

Bu audit tamamlandı — kod/migration/veri değişikliği yapılmadı. Sıradaki adım için kararınızı bekliyorum.
