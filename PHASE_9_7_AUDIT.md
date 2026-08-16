# PHASE 9.7 — Petra Görsel Tasarım ve Production UI Audit

**Kapsam:** `https://petra-muhendislik.vercel.app/` canlı production sitesi, masaüstü görünüm (1568×~800 viewport, Chrome, otomatik gezinme ile).
**Ziyaret edilen rotalar:** `/`, `/cozumler`, `/cozumler/split-klimalar`, `/hizmetler`, `/projeler`, `/kampanyalar`, `/hakkimizda`, `/iletisim`.
**Kod değişikliği, migration, Supabase veri değişikliği, git commit: YOK.** Bu rapor tamamen gözlem ve `lib/data/petra/*.ts` / `public/images/petra/README.md` / `lib/fonts/README.md` kod referanslarına dayanıyor.

**Önemli sınırlama — mobil test yapılamadı:** Bu sandbox'taki Chrome uzantısının `resize_window` aracı pencere/viewport boyutunu gerçekten küçültmüyor (birden fazla denemede ekran görüntüleri hep ~1568px masaüstü genişliğinde ve masaüstü navigasyon menüsüyle geldi — mobil hamburger menüye hiç geçmedi). Bu bir kod/site sorunu değil, bu oturumdaki tarayıcı otomasyon aracının bir kısıtlaması. Bu yüzden **"mobil problemler" bölümü kod incelemesine dayanıyor** (Tailwind responsive class'ları, `md:`/`lg:` breakpoint kullanımı), gerçek mobil ekran görüntüsüne dayanmıyor. Gerçek bir telefon/tarayıcı DevTools ile ayrıca doğrulanmasını öneririm.

---

## 1) Kritik görsel eksikler

1. **Hiçbir yerde gerçek görsel yok.** Hero arka planı, 6 çözüm kartı, Mitsubishi bölümü, projeler, kampanyalar — hepsi `image: null`. Site şu an tamamen tipografi + düz renk kartlarından oluşuyor; bir ziyaretçiye "tamamlanmamış / demo" hissi veriyor. Kod tarafı (`lib/data/petra/solutions.ts`, `hero.ts`, `brand-assets.ts`) zaten bunu bilinçli olarak `null` bırakmış ve dosya adlarını yorum satırlarında belirtmiş — yani bu bir bug değil, gerçek görsel bekleyen bir alan.
2. **Logo yok.** Header'da sadece "PETRA / MÜHENDİSLİK" metni var, gerçek marka logosu (`logoSrcDark`/`logoSrcLight`) hiç yüklenmemiş.
3. **`/kampanyalar` sayfası neredeyse boş.** Başlık + "Şu anda aktif bir kampanyamız bulunmuyor." mesajından ibaret; hemen altında footer geliyor. Bu, ziyaretçiye sitenin yarım kaldığı izlenimini en güçlü veren sayfa.
4. **`/cozumler/[slug]` detay sayfaları çok yalın.** Başlık + kısa paragraf + tek CTA butonundan başka içerik yok (görsel yok, teknik özellik listesi yok, ilgili diğer çözümlere link yok). Kod incelemesinde bu bilinçli bir minimal tasarım gibi duruyor ama gerçek içerik/görsel eklenmeden production'a çıkarsa en zayıf sayfa tipi bu olur.
5. **`/iletisim` sayfasında harita yok.** Sağ sütunda sadece telefon ve adres metni var; Google Maps embed'i veya benzeri bir konum görselleştirmesi yok. Adres zaten "Onikişubat, Kahramanmaraş" gibi genel — bu haliyle harita da olsa pin koyacak tam adres (cadde/no) henüz teyit edilmemiş durumda (`site-config.ts`'te `address: null`).

## 2) Orta seviye UI problemleri

1. **Statistics ve Testimonials bölümleri anasayfada tamamen yok** (component `null` döndürüyor, boş state mesajı bile göstermiyor — `Projects`/`Campaigns` gibi "yakında" kutusu yok). Ziyaretçi bu bölümlerin hiç var olmadığını düşünür; "kaç yıldır hizmet veriyorsunuz", "kaç müşteri" gibi güven sinyalleri sitede hiç yok.
2. **`/hakkimizda` sayfasında ekip fotoğrafı, kuruluş hikayesi, sertifika/yetkinlik rozetleri yok.** Sayfa "Neden Petra?" başlığı altında 4 kısa madde ve tekrar kullanılan 4 adımlı süreç bölümünden (Keşif/Projelendirme/Kurulum/Servis — anasayfada da aynısı var) ibaret. İçerik anasayfayla ciddi tekrar içeriyor.
3. **Footer'da sosyal medya ikonu yok.** Kullanıcı Instagram üzerinden doğrulanmış içerikle çalışıldığı belli (`site-config.ts` yorumları), ama footer'da Instagram/Facebook linki hiç yok.
4. **Header CTA'sı ("Keşif Talep Et") ve WhatsApp CTA'sı tutarsız yerleşimde** — anasayfada ikisi de var, iç sayfalarda (`/hizmetler`, `/hakkimizda` vb.) sadece header'daki kırmızı buton var, WhatsApp butonu sayfa içeriğinde tekrar çıkmıyor (sadece final-cta bölümünde anasayfada var).
5. **Kart tasarımları (çözüm kartları, süreç adımları) görsel olmadığı için birbirinden çok az farklılaşıyor** — hepsi aynı koyu kart + kırmızı aksan renginde; görseller eklenmeden bu tekdüzelik çözülmeyecek.

## 3) Mobil problemler (kod incelemesine dayalı — bkz. yukarıdaki sınırlama notu)

Gerçek mobil ekran görüntüsü alınamadı. Kod tarafında dikkat edilmesi gerekenler:

1. Header navigasyonu (`site-header.tsx`) masaüstünde 6 menü öğesi + telefon + 2 buton gösteriyor; bunun mobilde hamburger menüye düşüp düşmediği bu oturumda görsel olarak doğrulanamadı — gerçek cihazda kontrol edilmeli.
2. `Reveal` (scroll-fade-in) animasyon bileşeni, yavaş bağlantılı/düşük performanslı mobil cihazlarda içeriğin geç/soluk görünmesine yol açabilir (masaüstü testinde de scroll sonrası 1-2 saniye soluk kalan içerik gözlemlendi — bkz. `/projeler` boş state notu aşağıda). Mobilde bu gecikme daha belirgin olabilir.
3. `/iletisim` formundaki input alanları ve `/cozumler` detay sayfasındaki büyük başlıklar (`text-[64px]` gibi) mobilde taşma/okunabilirlik riski taşıyabilir — gerçek cihazda kontrol edilmeli.

## 4) Gerçek görsel gerektiren alanlar (müşteriden bekleniyor)

`public/images/petra/README.md`'de zaten tanımlı, kod tarafı hazır, sadece dosya bekleniyor:
- Hero arka plan görseli/render (`/images/petra/hero/`)
- 6 çözüm kartı görseli: split-klima, multi-split-klima, profesyonel-klima, vrf-sistemleri, isi-pompasi, sicak-su-sistemleri (`/images/petra/solutions/`)
- Marka logosu (açık ve koyu zemin versiyonları) (`/images/petra/brand/`)
- Gerçek proje fotoğrafları (`/images/petra/projects/`) — `Projects` bölümü bunlar olmadan boş state gösteriyor
- Kampanya görselleri (`/images/petra/campaigns/`) — aynı şekilde `Campaigns` boş
- Hizmetler/servis görselleri (`/images/petra/services/`)
- Ekip/ofis fotoğrafları — `/hakkimizda` için (README'de ayrı bir klasör olarak tanımlı değil ama sayfanın ihtiyacı bu)

## 5) Kodla hemen düzeltilebilecek alanlar

1. **Poppins fontu henüz eklenmemiş** — `lib/fonts/poppins.ts` yok, `lib/theme/petra-theme.ts` `var(--font-poppins, var(--font-sans))` ile sistem fontuna düşüyor. Font dosyası/paketi temin edilirse (Google Fonts üzerinden ücretsiz, görsel gerektirmez) bu tamamen kodla çözülebilir.
2. **Footer'a sosyal medya link alanı eklenebilir** — Instagram linki zaten müşteri profilinden biliniyor olmalı (site-config.ts'teki doğrulama yorumlarına göre), sadece `petraSocialLink`/footer bileşenine eklenmesi gerekiyor.
3. **`/iletisim`'e statik harita embed'i (iframe)** eklenebilir — tam adres teyit edilmeden bile genel "Onikişubat, Kahramanmaraş" bölgesini gösteren bir harita eklenebilir (pin olmadan, sadece bölge haritası).
4. **`/hakkimizda` ile anasayfa arasındaki 4-adımlı süreç tekrarını azaltmak** — `/hakkimizda` sayfasına özgü, farklı içerik yazılması (kod + metin, görsel gerekmez).
5. **Statistics bölümüne de `Projects`/`Campaigns` gibi bir "yakında" boş-state mesajı eklenebilir** — tutarlılık için (şu an sessizce `null` dönüyor, diğer ikisi mesaj gösteriyor).

## 6) Kullanıcıdan görsel/içerik bekleyen alanlar

- Bölüm 4'teki tüm görseller
- Gerçek istatistikler (müşteri sayısı, proje sayısı, deneyim yılı, destek saatleri) — `petraStatistics` boş, brief'teki örnek rakamlar (1000+, 500+, 15+, 7/24) asla gerçek içerik olarak kullanılmayacak
- Gerçek müşteri yorumları/referanslar — `petraTestimonials` boş
- Gerçek kampanya/fiyat bilgisi — `petraCampaigns` boş
- Tam ve teyitli adres (cadde/no) — şu an `address: null`, harita/structured data için gerekli
- WhatsApp numarası teyidi — telefon numarası biliniyor ama WhatsApp olduğu teyit edilmemiş (`whatsapp: null`)
- Çalışma saatleri — `workingHours: null`
- E-posta adresi — `email: null`

## 7) Production'a çıkmadan önce yapılması gerekenler (öncelik sırasıyla)

1. En azından hero + 6 çözüm kartı + logo görsellerini temin et/yükle (Faz 9.4'te kurulan gerçek Supabase Storage altyapısı zaten hazır — sadece dosya yükleme kalıyor).
2. `/kampanyalar` sayfasını ya en az 1 gerçek kampanya ile doldur ya da bu menü öğesini geçici olarak gizle (şu anki hali "kırık" değil ama çok boş görünüyor).
3. Adres/WhatsApp/e-posta/çalışma saatleri bilgilerini müşteriden teyit ettir — bunlar hem UI hem SEO (structured data) için kullanılacak.
4. Poppins fontunu ekle (kod-only, hızlı kazanım).
5. Footer'a sosyal medya linki ekle.
6. `/iletisim`'e harita ekle.
7. En az birkaç gerçek istatistik ve/veya müşteri yorumu temin edilirse anasayfa güven açısından ciddi güçlenir — bunlar olmadan da site "yalan söylemiyor" ama eksik hissettiriyor.
8. Mobil görünümü gerçek bir cihaz veya tarayıcı DevTools ile ayrıca doğrula (bu oturumda teknik kısıtlama nedeniyle yapılamadı).

---

**Not:** `/projeler` sayfasında otomatik test sırasında ilk ekran görüntüsünde boş-state mesajı ("Tamamlanan projelerimiz yakında burada yer alacak.") görünmüyormuş gibi geldi; scroll + 2 saniye bekleme sonrası mesajın doğru şekilde render olduğu görüldü. Bu, `Reveal` bileşeninin scroll-tetiklemeli fade-in animasyonunun otomasyon aracında yarattığı bir zamanlama artefaktıydı — mesaj her zaman tam olarak render oluyor. Gerçek bir ziyaretçi için düşük öncelikli/kozmetik bir not olarak değerlendiriyorum, kritik bir bug değil.
