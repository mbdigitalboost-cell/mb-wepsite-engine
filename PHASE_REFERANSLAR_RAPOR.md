# Petra Mühendislik — Referanslar Bölümü (Premium Showcase)

Tarih: 2026-08-19
Kapsam: Anasayfada yeni "Referanslarımız" teaser bölümü + tüm 25 referansı içeren yeni `/referanslar` sayfası.

## 1. Değiştirilen / eklenen dosyalar

**Yeni görseller:**
- `public/images/petra/references/*.svg|.jpg|.png` — kullanıcının `Petra_Referans_Logolari_25_Paket.zip` paketinden 25 referansın tamamı için 25 dosya (23 SVG + 1 JPG + 1 PNG), orijinal dosya adlarıyla kopyalandı.

**Yeni veri:**
- `lib/data/petra/references.ts` — `PetraReference` tipi + 25 referansın tamamı (`REFERANS_LISTESI.tsv`/`SOURCES_AND_USAGE.txt` birebir kaynak alındı).

**Yeni bileşenler:**
- `components/sections/references/reference-logo.tsx` — gerçek logo/fallback rozet render'ı (badge/panel varyantları).
- `components/sections/references/references-showcase.tsx` — sinematik "tek aktif referans" showcase (büyük numara, isim, kategori, logo paneli, "01/25" ilerleme çizgisi, ←/→ navigasyon, masaüstü mouse-parallax).
- `components/sections/references/reference-list.tsx` — kategoriye göre gruplanmış, 25 referansın tamamını gösteren ince satır listesi + geniş ekranda yan önizleme paneli.
- `components/sections/references-section.tsx` — anasayfa teaser bölümü (8 öne çıkan referans + "Tüm Referansları Gör →" CTA).

**Yeni route:**
- `app/(public)/referanslar/page.tsx` — tüm 25 referansı içeren tam sayfa (showcase + liste + "Keşif Talep Et →" CTA).

**Düzenlendi:**
- `app/(public)/page.tsx` — `<ReferencesSection />`, "Neden Petra?" ile "İstatistikler" arasına eklendi (brief'in "Neden Petra? → Referanslarımız → CTA" akışı).
- `app/globals.css` — `reference-fade-in` keyframe + `.animate-reference-fade` utility (aktif referans değiştiğinde fade+translate geçişi; global `prefers-reduced-motion` kuralı bunu otomatik olarak devre dışı bırakıyor, ayrı bir JS kontrolüne gerek kalmadı).

**Değişmedi:** header, footer, hero, çözümler, admin paneli, Supabase şeması, CMS adaptörleri, mevcut nav linkleri.

## 2. Veri doğruluğu — uydurma YOK

- **25 referansın tamamı eklendi.**
- **Doğrulanmamış marka logoları uydurulmadı.**
- Gerçek logo: yalnızca **2 kayıt** — Bahçeşehir Koleji (`bahcesehir-koleji.jpg`), KSÜ Tıp Fakültesi Onkoloji Bölümü (`ksu-tip-fakultesi.png`) — paketin kendi `SOURCES_AND_USAGE.txt` dosyasında "GERÇEK LOGO" olarak işaretli.
- Fallback: **23 kayıt** — paketteki SVG'ler (daire + kurum baş harfleri + kurum adı + "REFERANS" etiketi) hiçbir yerde gerçek marka logosuymuş gibi sunulmadı; `ReferenceLogo` bileşeninin alt metni bu kayıtlarda özellikle "logo" değil "referans işareti" diyor.
- Her referansın kategorisi, kullanıcının kendi verdiği 5 gruba (Kamu & Sağlık, Turizm & Konaklama, Ticari & Endüstriyel, Eğitim, Diğer Projeler) birebir uyuyor.
- Hiçbir kayıtta proje açıklaması, tarih, m², sistem tipi, kapasite, marka işbirliği iddiası YOK — yalnızca kurum adı + kategori + logo/fallback görseli. `href` her kayıtta `null`: gerçek detay sayfası olmadığı için sahte link üretilmedi; tüm satır/showcase etkileşimleri gerçek `<a href>` değil, `<button>` (hover/focus).

## 3. "Wow effect" — uygulanan tasarım

**Referanslar bölümü sadece veri listesi olarak değil, premium görsel showcase olarak tasarlandı.**

Uygulanan animasyonlar:
1. Showcase paneli: masaüstünde mouse-parallax (grid 3px, logo 2px, büyük numara 4px, kırmızı ışık efekti 6px genlikte, `useParallaxPointer` hook'u — Faz Hero Parallax'taki aynı altyapı, ama yalnızca `source === "mouse"` olduğunda çalışıyor, dokunmatik/mobilde tamamen kapalı).
2. Aktif referans değiştiğinde (←/→ ile) fade + 10px translateY geçişi (`animate-reference-fade`, `key={active.id}` ile yeniden tetikleniyor).
3. Showcase paneli scroll'da `Reveal variant="scale-in"` ile beliriyor (opacity + scale 0.95→1).
4. Başlık/CTA blokları `Reveal` ile fade-up.
5. İnce "01/25" ilerleme çizgisi, aktif indekse göre genişlik geçişi (`transition-[width]`).
6. Liste satırları: hover/focus'ta numara büyüyüp kırmızıya dönüyor, logo hafif büyüyor, isim beyazlaşıyor, ok sağa kayıyor, soldan animasyonlu ince kırmızı çizgi + hafif glow beliriyor.
7. Geniş ekranda (lg+) yan önizleme paneli, hover edilen referansı büyük logo + isim + soyut mühendislik arka planıyla gösteriyor, kendi fade geçişiyle.
8. Section arka planları: çok düşük opasiteli teknik grid (`HvacGridPattern`) + çapraz blueprint çizgileri + çok bulanık kırmızı glow — hiçbiri gerçek proje fotoğrafı değil, tamamen soyut.

Tüm animasyonlar `prefers-reduced-motion: reduce` altında (mevcut global CSS kuralı + `useParallaxPointer`/`useInView`'in kendi kontrolleri) devre dışı kalıyor.

## 4. Anasayfa yerleşimi

`ReferencesSection`, 8 `featured` referansı aynı sinematik showcase bileşeniyle gösteriyor (küçültülmüş/basitleştirilmiş bir versiyon değil), altında "Tüm Referansları Gör →" butonu `/referanslar`'a yönleniyor. Bölüm sırası: Hero → Trust Bar → Çözümler → Süreç → Mitsubishi → Projeler → Kampanyalar → **Neden Petra?** → **Referanslarımız** → İstatistikler → Referanslar (yorumlar) → SSS → Final CTA.

## 5. `/referanslar` sayfası

Sıra: sayfa başlığı (h1 "Gerçek projeler. Gerçek mühendislik.") → tüm 25 referansı içeren showcase → kategoriye göre gruplanmış tam liste (yan önizleme paneliyle) → "Bir sonraki projeniz burada olabilir." + "Keşif Talep Et →" (`/iletisim`'e yönleniyor, satış CTA'sı, proje iddiası değil).

## 6. Mobil sonucu

375/390/430px genişliklerde test edildi: tek kolon, yatay taşma yok, showcase paneli daralıyor ama bozulmuyor, liste satırları tam genişlikte okunabilir, yan önizleme paneli `lg`'nin altında tamamen gizli (hover'a bağlı bir davranış mobilde hiçbir bilgiyi gizlemiyor), parallax dokunmatikte devre dışı, kısa animasyon süreleri korunuyor (mevcut `Reveal`/`animate-reference-fade` süreleri zaten 300-700ms aralığında).

## 7. Desktop sonucu

1920/1440/1024px genişliklerde test edildi (bu mesajla birlikte ekran görüntüleri gönderildi): showcase, gruplu liste, yan önizleme paneli, ilerleme çizgisi, hover efektleri beklendiği gibi render oldu.

## 8. Lint / tsc / build

- `npx tsc --noEmit` → **PASS**, hata yok.
- `npm run lint` → **PASS**, hata/uyarı yok.
- `npm run build` → **PASS**, `/referanslar` dahil 26 route başarıyla üretildi (`○ /referanslar` statik). `[cms/connection] ... Host not in allowlist` mesajları bu sandbox'ın ağ kısıtından kaynaklanıyor, bu fazla ilgisiz.

## 9. Playwright testi

`npm run start` ile prod build ayağa kaldırılıp 1920/1440/1024/430/390/375 genişliklerinde hem anasayfa hem `/referanslar` test edildi:
- **Hiçbir genişlikte konsol hatası yok.**
- **Hiçbir genişlikte yatay taşma yok** (`scrollWidth === clientWidth` her testte doğrulandı).
- 25 referansın tamamı listede ve showcase döngüsünde mevcut.
- Tüm logo/fallback dosya yolları doğru çözülüyor, kırık görsel yok.

## 10. Yapılmayanlar (brief'in kendi kısıtı)

- Git commit/push yapılmadı.
- Supabase migration/tablo değişikliği yapılmadı — bu bölüm tamamen statik veriden (`lib/data/petra/references.ts`) besleniyor, CMS'e bağlanmadı (veri şekli `{id, name, category, logo, logoType, href, featured, order}` ileride CMS entegrasyonuna hazır, ama şu an bağlı değil).
- Admin paneline dokunulmadı.
- Ana navigasyona (`petraNavLinks`) `/referanslar` eklenmedi — sayfaya giriş noktası, brief'te açıkça istenen anasayfa teaser'ındaki "Tüm Referansları Gör →" butonu.

## 11. Sıradaki adım

Kullanıcının kendi VS Code / Claude Code oturumunda çalıştırması gereken komutlar aşağıda.
