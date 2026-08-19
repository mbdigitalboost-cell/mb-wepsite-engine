# PHASE 13 — Mitsubishi Heavy Ürün Vitrini / Tıklanabilir Model Slider

Tarih: 2026-08-19

## 1. Önce ne incelendi

- `lib/data/petra/mitsubishi.ts` ve `components/sections/mitsubishi-section.tsx` — mevcut "Görsel hazırlanıyor" placeholder'ının kod hali, taze olarak yeniden okundu.
- `app/` altındaki tüm route'lar (`find app -type d`) — `/urunler/[slug]` veya benzeri herhangi bir ürün detay route'u **bulunamadı**.
- `lib/cms/*` (adapters, mappers, dashboard/content-types.ts) — mevcut CMS içerik tipleri: hero, services, solutions, projects, campaigns, testimonials, faqs, seo, tracking, media, site-settings, nav. **Ürün (product) tablosu/adaptörü yok.**
- `supabase/customer-template/migrations/*.sql` (0001–0007) — hiçbirinde `products` veya benzeri bir tablo yok.
- `lib/data/petra/solutions.ts` — `/cozumler/split-klimalar` dahil 6 gerçek, halihazırda yayında olan çözüm sayfası mevcut ve doğrulandı.

Sonuç: mevcut mimariye uygun, gerçek bir ürün detay route'u/CMS yapısı **yok**. Spec'in 3. ve 10. maddesi gereği yeni bir mimari uydurulmadı; statik fallback uygulandı (bkz. §3).

## 2. Eklenen görseller

`MITSUBISHI_HEAVY_MODELLERI_GORSELLER.zip` içindeki 6 gerçek görsel, dosya adları korunarak `public/images/petra/mitsubishi/` altına kopyalandı:

| Dosya | Boyut (px) |
|---|---|
| `01_fdts_serisi_kanal_tipi.jpg` | 475×400 |
| `02_fdtc_serisi_gommeli_tavan.jpg` | 498×400 |
| `03_fde_serisi_dik_tip.jpg` | 481×400 |
| `04_fdf_serisi_kaset_tipi.jpg` | 475×364 |
| `05_fdk_serisi_duvar_tipi.jpg` | 498×364 |
| `06_fdc_serisi_dis_unite.jpg` | 481×364 |

Görseller aynen kullanıldı — yeniden üretilmedi, üzerine yazı/logo/CTA eklenmedi. Görsellerin içinde zaten var olan "Mitsubishi Heavy Industries" logosuna dokunulmadı, kod tarafında ayrıca sahte bir logo oluşturulmadı.

## 3. Ürün detay route durumu (ÖNEMLİ)

Gerçek bir ürün detay sayfası/route'u (`/urunler/[slug]` vb.) **mevcut değil** ve bu fazda uydurulmadı. Bunun yerine:

- Her ürün kartının `href`'i, sitede zaten var olan ve Mitsubishi bölümünün kendi "Ürünleri İncele" CTA'sıyla aynı hedef olan **`/cozumler`** sayfasına yönlendirilir (`lib/data/petra/mitsubishi-models.ts` içindeki `FALLBACK_HREF`).
- Kırık link veya sahte ürün detay sayfası oluşturulmadı.
- İleride gerçek bir ürün detay CMS/route'u eklenirse, tek yapılacak `mitsubishi-models.ts`'deki `href` alanlarını güncellemek (veya bu dosyayı CMS'den okunan veriyle değiştirmek) — slider bileşeni değişmeden çalışmaya devam eder.

## 4. Ürün veri modeli

`lib/data/petra/mitsubishi-models.ts` (YENİ) — merkezi, tek bir dizi: `id, slug, name, type, image, shortDescription, href`. 6 kayıt: FDTS (Kanal Tipi), FDTC (Gömmeli Tavan Tipi), FDE (Dik Tip), FDF (Kaset Tipi), FDK (Duvar Tipi), FDC (Dış Ünite).

`type` ve `name` alanları doğrudan kullanıcının verdiği dosya adlarından türetildi. Kapasite, BTU, fiyat, garanti, stok veya model kodu gibi **hiçbir teknik özellik uydurulmadı**; `shortDescription` alanları sadece ünite tipinin genel/nötr bir tanımıdır (örn. "Duvara monte edilen, yaygın kullanılan iç ünite tipi.").

Mevcut Petra CMS'de bir ürün tablosu bulunmadığı için (bkz. §1, §3) bu faz **statik fallback** olarak uygulandı — CMS migration'ı çalıştırılmadı (spec madde 13 gereği).

## 5. Slider nasıl çalışıyor

`components/sections/mitsubishi-slider.tsx` (YENİ, client component):

- İlk açılışta FDTS Serisi / Kanal Tipi gösterilir (dizinin ilk elemanı).
- **Autoplay**: 6 saniyede bir otomatik geçiş; hover veya focus'ta durur.
- **Manuel kontrol**: sol/sağ ok butonları (hover'da/focus'ta belirir), alt kısımda 6 nokta göstergesi (aktif nokta genişler ve kırmızı renk alır — `bg-brand-primary`).
- **Klavye**: konteyner içinde herhangi bir öğeye focus varken sağ/sol ok tuşlarıyla geçiş yapılabilir.
- **Dokunmatik (mobil) swipe**: 40px'lik yatay kaydırma eşiği ile sağa/sola geçiş.
- **Animasyon**: 700ms'lik yumuşak opacity crossfade — agresif değil, "premium" hissi için yavaş.
- Görsel geçişleri `aria-hidden` ile senkronize; ekran okuyucular yalnızca aktif slaytı görür.

## 6. Tıklama davranışı

Her kart (görsel + başlık + açıklama + "Detayları Gör" metni) tek bir `<Link>` içinde — sadece görsel değil, bütün kart tıklanabilir. `/cozumler`'a yönlenir (bkz. §3) ve tıklamada mevcut `service_view` tracking eventi (`source: "mitsubishi_slider"`, `model: <slug>`) tetiklenir — sitenin geri kalanındaki CTA'larla aynı tracking sözlüğü kullanıldı, yeni event adı uydurulmadı.

## 7. CMS durumu

Değişmedi — bu faz Supabase migration çalıştırmadı, gerçek Supabase verisine dokunmadı (spec madde 13). `petraMitsubishi` (marka adı, başlık, açıklama, dealer-status metni, CTA) aynen kullanılmaya devam ediyor; sadece sağdaki tekli statik görsel/placeholder alanı slider ile değiştirildi.

## 8. Tasarım / erişilebilirlik / performans

- Koyu navy/charcoal arka plan (`bg-brand-secondary`), beyaz tipografi, `brand-primary` (Petra kırmızısı) vurgu, ince `border-white/10` çerçeveler — mevcut tasarım dili korundu.
- `next/image` + `fill` + `sizes="(max-width: 1024px) 100vw, 50vw"`; sadece ilk görsel `priority`, diğer 5'i lazy.
- Görsellere anlamlı `alt` metni (`"{marka} {model adı} - {tip}"`), navigasyon butonlarında `aria-label`, nokta göstergelerinde `role="tab"`/`aria-selected`, konteynerde `role="region"`/`aria-roledescription="carousel"`.
- `focus-visible` outline'lar hem link hem butonlarda mevcut.

## 9. Responsive test (Playwright ile gerçek ekran görüntüsü alınarak doğrulandı)

- **Desktop (1440×900)**: solda mevcut Petra metin bloğu, sağda slider — 2 kolonlu grid korunuyor. ✅
- **Mobil (390×844)**: görsel üstte, ürün bilgisi görselin üzerinde gradient overlay ile altta; slider taşmadı, görsel kesilmedi/yarım kalmadı; klima cihazı görselin tamamında görünüyor (`object-cover` ama 4:3 oranı görselin kendi oranına yakın olduğu için kırpma agresif değil). Ok butonları ve nokta göstergesi mobilde de çalıştı (test edildi: "Sonraki model" tıklanınca FDTS → FDTC geçişi gerçekleşti, nokta göstergesi güncellendi). ✅

## 10. Test sonuçları

- `npx tsc --noEmit` → **PASS**, hata yok.
- `npm run lint` (ESLint) → **PASS**, uyarı/hata yok.
- `npm run build` → **PASS**, 25 route başarıyla üretildi (`/`, `/cozumler`, `/cozumler/[slug]` altındaki 6 sayfa dahil). Build sırasında görülen `[cms/connection] Platform lookup failed ... Host not in allowlist` mesajları, bu bulut sandbox'ının ağ erişim listesinden kaynaklanan **beklenen** bir durum (Petra'nın canlı Supabase'ine bu ortamdan erişilemiyor) — bu fazdan önce de mevcuttu, bu fazın neden olduğu bir hata değil.
- `curl` ile `/`, `/cozumler`, `/cozumler/split-klimalar`, `/iletisim` route'ları `npm run start` ile ayağa kaldırılan production build üzerinde test edildi → hepsi **200 OK**.
- Kırık image path, 404 link veya konsol hatası gözlemlenmedi.

## 11. Değişen / eklenen dosyalar

- YENİ `public/images/petra/mitsubishi/01_fdts_serisi_kanal_tipi.jpg` … `06_fdc_serisi_dis_unite.jpg` (6 dosya)
- YENİ `lib/data/petra/mitsubishi-models.ts`
- YENİ `components/sections/mitsubishi-slider.tsx`
- DÜZENLENDİ `components/sections/mitsubishi-section.tsx` (placeholder kaldırıldı, slider bağlandı)

`lib/data/petra/mitsubishi.ts` **değiştirilmedi** (marka adı/başlık/açıklama/CTA/dealer-status mantığı aynen korundu).

## 12. Kalan eksikler / netleştirilmesi gerekenler

- Gerçek bir ürün detay sayfası (her model için ayrı, gerçek içerikli bir sayfa) henüz yok — şu an tüm kartlar `/cozumler`'a yönleniyor. İleride istenirse bu bir sonraki faz olarak ele alınabilir (gerçek ürün metinleri/özellikleri doğrulanmadan böyle bir sayfa açılmamalı).
- Mitsubishi Heavy ile Petra arasındaki bayi/yetkili servis ilişkisi hâlâ doğrulanmadı (`dealerStatusVerified: false`) — bu faz bu durumu değiştirmedi, değiştirmesi de istenmedi.
- Bu faz kapsamında **hiçbir Supabase migration çalıştırılmadı, gerçek veri değiştirilmedi, git push yapılmadı** — spec madde 13 gereği. Değişiklikler yalnızca local'de hazır; commit/push adımları her zamanki gibi ayrıca iletilecek.
