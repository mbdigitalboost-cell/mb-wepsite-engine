# Petra Mühendislik — Yasal Sayfalar Entegrasyonu

Tarih: 2026-08-22
Kapsam: `Petra_Yasal_Metinler.zip` içindeki 4 taslak metnin (Gizlilik Politikası, KVKK Aydınlatma Metni, Çerez Politikası, Kullanım Şartları) mevcut placeholder sayfaların yerine, Petra'nın premium tasarım diliyle entegre edilmesi.

## 1. Oluşturulan / değiştirilen route'lar

Route'lar zaten mevcuttu (yeni route oluşturulmadı) — sadece içerikleri değişti:
- `/gizlilik-politikasi`
- `/kvkk-aydinlatma-metni`
- `/cerez-politikasi`
- `/kullanim-sartlari`

(Not: brief'te `/kvkk` yazıyordu, ama projedeki mevcut route zaten `/kvkk-aydinlatma-metni` — footer ve navigasyon buna göre kuruluydu, brief'in kendi talimatı gereği ["mevcut route isimleri farklıysa mevcut mimariye uygun kullan"] mevcut isim korundu, yeni bir route eklenmedi.)

## 2. Değiştirilen / eklenen dosyalar

**Yeni veri:**
- `lib/data/petra/legal/types.ts` — `PetraLegalDocument`/`PetraLegalSection` tipi.
- `lib/data/petra/legal/gizlilik-politikasi.ts`
- `lib/data/petra/legal/kvkk-aydinlatma-metni.ts`
- `lib/data/petra/legal/cerez-politikasi.ts`
- `lib/data/petra/legal/kullanim-sartlari.ts`

Bu 4 dosya, ZIP'teki `.md` dosyalarının içeriğini **birebir** (kelime değişikliği yok) yapısal olarak (başlık/paragraf/not) böler.

**Yeni yardımcı:**
- `lib/utils/render-legal-text.tsx` — yalnızca bu 4 belgenin ihtiyaç duyduğu `**kalın**` ve paragraf/satır kırılımını React'e çeviren minimal render fonksiyonu (yeni bir markdown kütüphanesi eklenmedi).

**Yeni bileşenler:**
- `components/legal/legal-hero.tsx` — eyebrow "YASAL", görünür breadcrumb (Ana Sayfa › Yasal › {başlık}), H1, "Son Güncelleme" satırı, düşük opasiteli teknik grid + kırmızı glow arka plan (sitenin diğer premium section'larıyla aynı dil).
- `components/legal/legal-document.tsx` — giriş paragrafı, (varsa) uyarı notu, "İçindekiler" (bölüm başlıklarına anchor link), numaralı bölümler, (varsa) sondaki uyarı notu. İçerik genişliği `max-w-3xl` (rahat okunabilir, sıkışık tek kolon değil).

**Düzenlendi:**
- `app/(public)/gizlilik-politikasi/page.tsx`
- `app/(public)/kvkk-aydinlatma-metni/page.tsx`
- `app/(public)/cerez-politikasi/page.tsx`
- `app/(public)/kullanim-sartlari/page.tsx`

Her biri: `LegalPlaceholder` yerine `LegalHero` + `LegalDocument`, artı `petraBreadcrumbStructuredData` ile sayfa özelinde JSON-LD breadcrumb (mevcut `/cozumler/[slug]` sayfasındaki aynı desen).

**Değişmedi:** `components/legal/legal-placeholder.tsx` (silinmedi — ileride metni olmayan başka bir yasal sayfa için hâlâ kullanılabilir), `lib/data/petra/navigation.ts` / footer'daki `petraLegalLinks` (zaten doğru 4 route'a işaret ediyordu, değişiklik gerekmedi), header, diğer sayfalar, CMS, Supabase, env değişkenleri, admin paneli.

## 3. Uydurulmayanlar — kontrol

ZIP'in kendi `README.md`'si köşeli parantezli alanların bilinçli boş bırakıldığını belirtiyordu; bunların hepsi **aynen** korundu:
- `[TARİH]` (Son Güncelleme) — 4 sayfada da.
- `[ONAYLI TİCARİ UNVAN]`, `[PETRA MÜHENDİSLİK'İN ONAYLI TİCARİ UNVANI]` — KVKK'da.
- `[ONAYLI AÇIK ADRES]`, `[ONAYLI ADRES]` — Gizlilik/KVKK/Kullanım Şartları'nda.
- `[ONAYLI E-POSTA]`, `[ONAYLI TELEFON]` — 4 sayfada da.

Hiçbir yerde: sahte vergi numarası, sahte MERSİS numarası, sahte şirket unvanı, sahte adres, sahte e-posta yok. Çerez Politikası'nda gerçekte kullanılmayan Google Analytics/Meta Pixel/Hotjar gibi servisler listelenmedi — metin, ZIP'teki haliyle "kullanılması halinde" ifadesini koruyor ve "production'da kullanılan gerçek servisler ayrıca listelenmelidir" notunu aynen taşıyor. Hukuki anlam hiçbir cümlede değiştirilmedi, yalnızca görsel/yapısal sunum eklendi.

## 4. Footer linkleri

`components/layout/site-footer.tsx` → `petraLegalLinks` (`lib/data/petra/navigation.ts`) zaten bu 4 route'a doğru işaret ediyordu:
- Gizlilik Politikası → `/gizlilik-politikasi`
- KVKK Aydınlatma Metni → `/kvkk-aydinlatma-metni`
- Çerez Politikası → `/cerez-politikasi`
- Kullanım Şartları → `/kullanim-sartlari`

Değişiklik gerekmedi, tıklanan her link artık gerçek içerikli sayfaya gidiyor (önceden "hazırlanıyor" placeholder'ına gidiyordu).

## 5. SEO metadata

Her sayfa kendi `title`/`description`/`alternates.canonical`'ını tanımlıyor (route değişmedi, sadece `description` daha spesifik hale getirildi). Site genelindeki `title.template` (`app/(public)/layout.tsx`) sayesinde tarayıcı sekmesinde otomatik olarak istenen format çıkıyor:
- "Gizlilik Politikası | Petra Mühendislik"
- "KVKK Aydınlatma Metni | Petra Mühendislik"
- "Çerez Politikası | Petra Mühendislik"
- "Kullanım Şartları | Petra Mühendislik"

Ayrıca her sayfaya `petraBreadcrumbStructuredData` ile `BreadcrumbList` JSON-LD eklendi (Ana Sayfa → {sayfa başlığı}).

## 6. Erişilebilirlik

- Her sayfada tek `<h1>` (LegalHero), bölüm başlıkları `<h2>` — hiyerarşi düz, atlama yok.
- Breadcrumb `<nav aria-label="Breadcrumb">`, İçindekiler `<nav aria-label="İçindekiler">`.
- Tüm linkler (breadcrumb, İçindekiler, footer) standart `<a>`/`next/link` — klavye ile focus edilebilir, `focus-visible` stilleri korunuyor.
- İçindekiler linkleri gerçek `#anchor` bağlantıları; bölüm başlıklarına `scroll-mt-28` eklendi (sabit header'ın altında kalmasın diye) — Playwright ile tıklanıp doğrulandı, hedef başlık görünür alana geliyor.
- Dekoratif öğeler (`HvacGridPattern`, glow) `aria-hidden="true"`.
- Kontrast: mevcut `text-white`/`text-brand-muted`/`text-brand-primary` sistemiyle aynı, yeni renk eklenmedi.

## 7. Responsive kontrol

1440px, 412px, 390px genişliklerde 4 sayfa da test edildi (ekran görüntüleri gönderildi):
- Breadcrumb mobilde satır kaymadan sığıyor.
- İçindekiler grid'i mobilde tek kolona düşüyor.
- Uzun iletişim blokları (Petra Mühendislik / E-posta / Telefon / Adres) satır satır düzgün kırılıyor, taşma yok.
- Notice/uyarı kutuları mobilde tam genişlikte okunabilir.
- Yatay scroll yok.

## 8. Test sonuçları

- `npm run lint` → **PASS**
- `npx tsc --noEmit` → **PASS**
- `npm run build` → **PASS**, tüm 4 route statik (`○`) olarak üretildi.
- 4 sayfa da canlı sunucuda **200** döndü (`curl` ile doğrulandı).
- Playwright ile 1440/412/390px'de: **konsol hatası yok**, **yatay taşma yok** (`scrollWidth === clientWidth`), her sayfada **tek `<h1>`**.
- Bir defaya mahsus flakiness notu: ilk otomatik taramada `gizlilik-politikasi@1440`'da footer'daki MB Digital Boost rozetinin (`mb-mark.png`, tüm sayfalarda ortak, bu fazla ilgisiz) geç yüklendiği görüldü — bu, sandbox'ın `next/image` lazy-load zamanlamasıyla ilgili bilinen bir ekran görüntüsü artefaktı (anasayfada da aynı davranış tekrarlanarak doğrulandı); gerçek bir kırık görsel değil, bu fazın kod değişikliğiyle ilgisi yok.

## 9. Yapılmayanlar (brief'in kendi kısıtı)

- Git commit/push yapılmadı.
- Supabase'e dokunulmadı, migration oluşturulmadı.
- Env değişkenlerine dokunulmadı, hiçbir secret kullanılmadı.
- CMS sistemi değiştirilmedi (bu 4 sayfa statik veri dosyalarından besleniyor, CMS'e bağlanmadı — mevcut mimariyle tutarlı, brief zaten "gereksiz yere değiştirme" demişti).

## 10. Sıradaki adım

Kullanıcının kendi VS Code / Claude Code oturumunda çalıştırması gereken komutlar aşağıda.
