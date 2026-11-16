# Taktikalp46 — Yasal Metinler: Hukukçu Kontrol Listesi

Bu liste, www.t46store.com'daki yasal metinlerin bir hukukçu tarafından kontrol edilmesi için hazırlandı. Metinler mevzuata dayanılarak **şablon** olarak yazıldı; hukuki görüş değildir. Kontrol edilen her metin için admin panelinde (Mağaza → Yasal Metinler → ilgili metin) "Hukukçu kontrol etti" işaretlenir. Değişiklik gerekiyorsa aynı ekrandan düzenlenip yeni sürüm olarak yayımlanır; eski sürümler ve verilmiş siparişlerin onayladığı metinler değişmez.

## 1. İncelenecek sayfalar

| Metin | Vitrin adresi | Dayandığı ana düzenlemeler |
|---|---|---|
| Ön Bilgilendirme Formu | /sozlesmeler/on-bilgilendirme | 6502 s. TKHK m.48; Mesafeli Sözleşmeler Yönetmeliği (MSY) m.5, 6, 7, 16 |
| Mesafeli Satış Sözleşmesi | /sozlesmeler/mesafeli-satis | 6502 m.48; MSY m.7, 9–16, 18, 20; 6098 s. TBK (temerrüt); 3095 s. Kanun |
| İade ve Cayma Koşulları | /iade-ve-cayma | MSY m.9–15; 6502 m.8–12 (ayıplı mal) |
| Cayma Formu | /cayma-formu | MSY EK (Örnek Cayma Formu), m.11 |
| KVKK Aydınlatma Metni | /kvkk | 6698 s. KVKK m.4, 5, 8, 9, 10, 11, 13; Aydınlatma ve Başvuru Tebliğleri |
| Çerez Politikası | /cerez-politikasi | KVKK m.5, 10; KVKK Kurumu Çerez Uygulamaları Rehberi |
| İletişim / satıcı kimliği | /iletisim | 6563 s. ETK m.3; MSY m.5/1-b,c |

Ödeme adımında ayrıca: zorunlu onay kutusu ("Ön Bilgilendirme Formu'nu ve Mesafeli Satış Sözleşmesi'ni okudum, onaylıyorum."), ayrı ve isteğe bağlı ticari elektronik ileti onayı, KVKK aydınlatma metnine bağlantı (onay kutusu değil). Sipariş anında doldurulmuş metnin kopyası siparişle saklanır; müşteri "Siparişlerim"den görüntüleyip yazdırabilir.

## 2. Metinlere otomatik giren bilgiler (değişkenler)

- **Satıcı:** unvan (TAKTİKALP46), yetkili (Alperen Önsel), vergi no 52612445762, Aslanbey VD, adres (Vadi Mah. 97058 Sk. No:91 Onikişubat / Kahramanmaraş), telefon/WhatsApp 0537 322 26 46, e-posta taktikalp46@gmail.com, site adresi. **MERSİS, KEP ve ETBİS boş** — bu satırlar metinlerde hiç görünmüyor.
- **Kargo:** kargo ücreti 250 TL; 2.000 TL ve üzeri siparişte ücretsiz; sınırda indirim öncesi ürün tutarı esas alınıyor; kapıda ödeme ek ücreti 0 (satır görünmüyor).
- **İade:** cayma süresi 14 gün; çevrimiçi iade talebi açık; iade kargo firması, iade kodu, iade talimatı ve ayrı iade adresi **henüz girilmedi** (girilince metinlerde görünür; iade adresi yoksa satıcı adresi yazılır).
- **Ödeme yöntemleri:** kapıda nakit, kapıda kart, havale/EFT (kartla ödeme açılınca metne eklenir).
- **Sipariş (yalnız siparişe özel metinde):** sipariş no, tarih, ürünler (ad, seçenek, ek seçenek, adet, tutar), ürün toplamı, indirim, kargo, kapıda ödeme ücreti, vergiler dahil toplam, ödeme yöntemi, teslimat adresi, alıcı adı/telefon/e-posta, fatura bilgisi (TC/vergi kimlik numarası sözleşmeye yazılmıyor).

## 3. Lütfen özellikle teyit edin

1. **Fiyatlar ve KDV:** metinler toplamı "tüm vergiler dahil" olarak gösteriyor. Satış fiyatlarının KDV dahil olduğunu teyit edin.
2. **Kısmi cayma ve kargo ücreti:** siparişin tamamından caymada kargo dahil tüm tutar iade ediliyor; yalnız bazı ürünlerden caymada yalnız o ürünlere düşen tutar (indirim orantılı) iade ediliyor, kargo iade edilmiyor. Bunun MSY m.12 ile uyumu.
3. **Kapıda kartla ödemede iade yöntemi:** kapıda ödeme (nakit ve kart) ile havale/EFT iadeleri müşterinin IBAN'ına yapılıyor. "Ödeme aracına uygun iade" kuralı açısından kapıda kart ödemesinin IBAN'a iadesi uygun mu?
4. **İade süresinin başlangıcı:** metinler, Ticaret Bakanlığı rehberindeki (17.08.2026) açıklamayı izliyor: 14 günlük iade süresi ürünün anlaşmalı kargoya teslim edildiği tarihten, başka kargoyla gönderilmişse satıcıya ulaştığı tarihten, ürün henüz teslim edilmemişse cayma bildiriminden başlıyor. Tüketicinin geri gönderme süresi 14 gün olarak yazıldı.
5. **Kişiye özel ürünler (MSY m.15/1-b):** admin'de "kişiye özel" işaretlenen ürün/seçeneklerin (ör. kılıf üstü yazı) cayma dışında tutulması ve bunun ürün sayfasında yeterince açık gösterilmesi.
6. **Teslim süresi:** mağazanın kendi teslim süresi bilinmediği için yalnız yasal üst sınır (30 gün) yazıldı. Daha kısa bir süre taahhüt edilecekse metne eklenmeli.
7. **KVKK — yurt dışı aktarım (m.9):** veritabanı Supabase (AB/İrlanda), barındırma Vercel (sunucu işlevleri ABD), e-posta Resend (ABD), WhatsApp Meta. Hangi aktarım mekanizmasına dayanılacağı (ör. standart sözleşme ve Kurum'a bildirim) belirlenmeli; metin yalnız "m.9'daki usul ve şartlarla" diyor.
8. **KVKK — ticari ileti için ayrıca açık rıza:** metin, kampanya iletişimini yalnız 6563 s. Kanun kapsamındaki ticari ileti onayına dayandırıyor. KVKK açısından ayrı açık rıza gerekip gerekmediği.
9. **KVKK — saklama süreleri:** belirli süreler yazılmadı ("ilgili mevzuatta öngörülen süreler"). Somut süre eklenmesi isteniyorsa belirlenmeli.
10. **İYS (İleti Yönetim Sistemi):** ticari elektronik ileti gönderilecekse İYS kaydı ve onayların İYS'ye aktarılması gerekip gerekmediği. (Sistem şu an onayı yalnız kendi veritabanında tutuyor; izinsiz kişiye kampanya gönderimi admin panelinde engelli.)
11. **ETBİS:** kayıt durumu bilinmiyor. Kayıtlıysa bilgi ve karekod bağlantısı admin'de "İşletme Bilgileri"ne girilince altbilgide görünür.
12. **MERSİS / ticaret sicili:** şahıs işletmesi için MERSİS no'nun gerekip gerekmediği (şu an boş, metinlerde satır yok).
13. **Çerez Politikası:** bugün yalnız zorunlu çerez/depolama var (oturum çerezi sb-storefront-auth, sepet ve indirim kodu için tarayıcı depolaması), analitik/pazarlama çerezi yok. Analitik ileride eklenirse yalnız onayla yüklenecek şekilde altyapı hazır.
14. **Uyuşmazlık:** tüketici hakem heyeti parasal sınırları sabit yazılmadı ("her yıl ilan edilen parasal sınırlar"); tüketici mahkemesi öncesi arabuluculuk cümlesi eklendi.

## 4. Kontrol sonrası

- Değişiklik gerekiyorsa: Mağaza → Yasal Metinler → metin → düzenle → "Önizle" → "Yayınla (yeni sürüm)".
- Uygunsa: aynı ekranda sürümün yanındaki "Hukukçu kontrol etti"yi işaretleyin. İşaret yalnız o sürüm içindir; yeni sürüm yayımlanırsa yeniden kontrol gerekir.
