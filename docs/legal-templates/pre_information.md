<!--
Ön Bilgilendirme Formu.
Kaynak: 6502 sayılı TKHK m.48/2; Mesafeli Sözleşmeler Yönetmeliği (RG 27.11.2014/29188)
m.5 (ön bilgilendirmenin içeriği — a: temel nitelikler, b-c: satıcı kimliği ve
iletişim, d: vergiler dahil toplam fiyat ve teslim masrafları, f: ödeme/teslimat/
şikâyet, g-ğ: cayma hakkı ve bildirim adresi, h: iade masrafı, ı: istisnalar,
i: şikâyet ve başvuru), m.6 (ön bilgilendirmenin yöntemi; internetten kurulan
sözleşmede ödeme yükümlülüğü ve kabul edilen ödeme araçları), m.7 (teyit),
m.16 (ifa süresi — en geç 30 gün; imkânsızlaşmada 3 gün içinde bildirim ve
14 gün içinde iade). Kayıp/hasar cümlesi: T.C. Ticaret Bakanlığı "Mesafeli
Sözleşmeler Hakkında Bilgilendirme" (17.08.2026).
Tutarlar Faz 31/32 sunucu hesabından gelir (siparis.* değişkenleri).
-->
# Ön Bilgilendirme Formu

Bu form, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, siparişiniz onaylanmadan önce sizi bilgilendirmek amacıyla hazırlanmıştır.

## 1. Satıcı

{{> _satici}}

## 2. Alıcı ve teslimat

**Alıcı:** {{alici.ad}}
**Telefon:** {{alici.telefon}}
**E-posta:** {{alici.eposta}}
**Teslimat adresi:** {{siparis.teslimat_adresi|Sipariş sırasında alıcının belirttiği adres}}
**Fatura bilgisi:** {{alici.fatura}}

## 3. Ürünler ve temel nitelikleri

Ürünlerin temel nitelikleri (malzeme, renk ve seçenekler, uyumlu modeller vb.) ilgili ürün sayfasında yer alır.

{{siparis.urunler}}

## 4. Fiyat ve ek masraflar

**Sipariş no:** {{siparis.no}}
**Ürünler toplamı:** {{siparis.ara_toplam}}
**İndirim ({{siparis.indirim_kodu|indirim}}):** −{{siparis.indirim}}
**Kargo:** {{siparis.kargo}}
**Kapıda ödeme ücreti:** {{siparis.kapida_odeme_ucreti}}
**Tüm vergiler dahil toplam:** {{siparis.toplam|Ödeme adımında gösterilen toplam tutar}}

{{#if kargo.ucret}}
Kargo ücreti siparişe {{kargo.ucret}} olarak eklenir.
{{/if}}
{{#if kargo.ucretsiz_esik}}
{{kargo.ucretsiz_esik}} ve üzeri siparişlerde kargo ücretsizdir; bu sınırda {{kargo.esik_bazi}} esas alınır.
{{/if}}
Kapıda ödeme seçildiğinde {{kargo.kapida_odeme_ucreti}} ek ücret alınır.
Yukarıda gösterilenler dışında alıcıdan ek bir ödeme talep edilmez.

## 5. Ödeme

**Seçilen ödeme yöntemi:** {{siparis.odeme_yontemi}}
**Mağazada kabul edilen ödeme yöntemleri:** {{odeme.yontemleri}}

{{#if odeme.kart}}
Kartla ödemeler iyzico güvenli ödeme sayfasında alınır; kart bilgileri satıcıya iletilmez ve satıcı tarafından saklanmaz.
{{/if}}
Siparişi onaylamakla ödeme yükümlülüğü altına girdiğinizi kabul edersiniz.

## 6. Teslimat

Ürünler, alıcının belirttiği teslimat adresine anlaşmalı kargo firması aracılığıyla gönderilir. Teslimat süresi, siparişin satıcıya ulaştığı tarihten itibaren yasal üst sınır olan **30 günü** geçemez.

Teslimatın imkânsızlaşması hâlinde satıcı bu durumu öğrendiği tarihten itibaren 3 gün içinde alıcıya bildirir ve varsa teslimat masrafları dahil tahsil ettiği tüm ödemeleri bildirim tarihinden itibaren en geç 14 gün içinde iade eder.

Ürün, satıcının belirttiği kargo ile alıcıya teslim edilene kadar oluşan kayıp ve hasardan satıcı sorumludur.

## 7. Cayma hakkı

{{> _cayma}}

{{> _istisnalar}}

## 8. Şikâyet ve başvuru

{{> _sikayet}}

## 9. Onay

Alıcı, bu Ön Bilgilendirme Formu'nu siparişini onaylamadan önce okuduğunu ve elektronik ortamda onayladığını kabul eder. Bu form ve Mesafeli Satış Sözleşmesi siparişle birlikte kaydedilir; alıcı onayladığı metni [Siparişlerim](/siparislerim) sayfasından görüntüleyip yazdırabilir.

**Belge tarihi:** {{belge.tarih}}
