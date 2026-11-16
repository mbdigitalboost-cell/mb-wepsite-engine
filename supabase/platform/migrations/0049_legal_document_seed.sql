-- =============================================================================
-- PLATFORM MIGRATION 0049
-- Faz 33 — Taktikalp46 yasal metin ŞABLONLARI (sürüm 1). 0048'den SONRA çalıştırın.
--
-- OTOMATİK ÜRETİLDİ: scripts/build-legal-templates.mjs (kaynak: docs/legal-templates/*.md).
-- Bu metinler ŞABLONDUR; reviewed_by_lawyer = false. Hukukçu kontrolünden sonra
-- admin → Mağaza → Yasal Metinler'den "Hukukçu kontrol etti" işaretlenir.
-- Satıcı bilgileri değişkenlerdir ({{satici.unvan}} vb.) — 0048'deki
-- store_seller_profiles satırından doldurulur; bilinmeyen alanın satırı çıkmaz.
-- Tekrar çalıştırılabilir (sürüm 1 varsa dokunmaz).
-- =============================================================================

insert into public.store_legal_documents (store_id, kind, title, body, version)
select s.id, 'pre_information', $legal$Ön Bilgilendirme Formu$legal$, $legal$Bu form, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, siparişiniz onaylanmadan önce sizi bilgilendirmek amacıyla hazırlanmıştır.

## 1. Satıcı

**Satıcı (ticari unvan):** {{satici.unvan}}
**İşletme sahibi / yetkili:** {{satici.yetkili}}
**Adres:** {{satici.adres}}
**Telefon / WhatsApp:** {{satici.telefon}}
**E-posta:** {{satici.eposta}}
**KEP adresi:** {{satici.kep}}
**Vergi dairesi:** {{satici.vergi_dairesi}}
**Vergi kimlik no:** {{satici.vergi_no}}
**MERSİS no:** {{satici.mersis}}
**ETBİS kaydı:** {{satici.etbis}}
**İnternet sitesi:** {{satici.web}}

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

### Cayma hakkı

Alıcı; malı kendisinin veya belirlediği üçüncü kişinin teslim aldığı günden itibaren **{{iade.sure_gun}} gün** içinde, herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir. Sözleşmenin kurulmasından malın teslimine kadar geçen sürede de cayma hakkı kullanılabilir.

### Cayma hakkı nasıl kullanılır?

Cayma bildirimi, süre içinde yazılı olarak veya kalıcı veri saklayıcısı (e-posta, WhatsApp mesajı gibi) aracılığıyla satıcıya yöneltilmelidir. Aşağıdaki yollardan birini kullanabilirsiniz:

{{#if iade.cevrimici}}
- [Siparişlerim](/siparislerim) sayfasından siparişinizi açıp iade talebi oluşturabilirsiniz.
{{/if}}
- {{satici.eposta}} adresine e-posta gönderebilirsiniz.
- {{satici.telefon}} numarasına WhatsApp üzerinden yazılı mesaj gönderebilirsiniz.
- [Cayma formunu](/cayma-formu) doldurup yukarıdaki adreslerden birine iletebilirsiniz; formu kullanmak zorunlu değildir, cayma kararınızı bildiren açık bir beyan yeterlidir.

Cayma bildiriminizin bize ulaştığı size gecikmeksizin teyit edilir.

### Ürünün geri gönderilmesi

Alıcı, cayma bildirimini yönelttiği tarihten itibaren **14 gün** içinde ürünü geri gönderir.

{{#if iade.kargo_firmasi}}
**İade için anlaşmalı taşıyıcı:** {{iade.kargo_firmasi}}
**İade kodu:** {{iade.kod}}
Ürün bu taşıyıcıyla gönderildiğinde iade kargo ücreti alıcıdan alınmaz.
{{/if}}
**İade adresi:** {{iade.adres}}

Ürünün satıcının belirttiği taşıyıcıyla geri gönderilmesi ya da satıcının iade için bir taşıyıcı belirtmemiş olması hâlinde iade masrafı alıcıdan talep edilmez.

{{#if iade.talimat}}
**Mağazanın iade talimatı:** {{iade.talimat}}
{{/if}}

Ürünün cayma süresi içinde işleyişine, teknik özelliklerine ve kullanım talimatlarına uygun kullanılması nedeniyle oluşan değişiklik ve bozulmalardan alıcı sorumlu değildir.

### Ödemenin iadesi

Satıcı, varsa teslimat masrafları dahil tahsil ettiği tüm ödemeleri **14 gün** içinde; alıcının kullandığı ödeme aracına uygun şekilde, alıcıya herhangi bir masraf veya yükümlülük getirmeden ve tek seferde iade eder:

- Kartla (iyzico güvenli ödeme sayfası üzerinden) yapılan ödemeler aynı karta iade edilir. Taksitli alışverişlerde de iade tek seferde yapılır.
- Kapıda ödeme ve havale/EFT ile yapılan ödemeler, alıcının bildireceği kendi adına kayıtlı IBAN'a iade edilir.
- Henüz ödemesi alınmamış (teslim edilmemiş kapıda ödemeli) siparişte iade edilecek bir tutar doğmaz.

Bu süre; ürünün satıcının belirttiği taşıyıcıya teslim edildiği tarihten, başka bir taşıyıcıyla gönderilmişse ürünün satıcıya ulaştığı tarihten, ürün henüz teslim edilmemişse cayma bildiriminin satıcıya ulaştığı tarihten itibaren işler.

Siparişin tamamından caymada kargo ücreti dahil ödenen tüm tutar iade edilir. Siparişteki ürünlerin yalnız bir kısmından caymada, o ürünlere düşen tutar (siparişte indirim uygulandıysa orantılı olarak) iade edilir.

Cayma hakkı konusunda gerektiği şekilde bilgilendirilmeyen alıcı, cayma hakkını kullanmak için {{iade.sure_gun}} günlük süreyle bağlı değildir; bu süre her hâlükârda cayma süresinin bittiği tarihten itibaren bir yıl sonra sona erer.

### Cayma hakkının kullanılamayacağı durumlar

Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesi uyarınca, diğer hâllerin yanında aşağıdaki ürünlerde cayma hakkı kullanılamaz:

- Alıcının istekleri veya kişisel ihtiyaçları doğrultusunda hazırlanan ürünler (ör. sipariş sırasında seçilen kişiye özel yazı ya da işleme içeren ürünler). Mağazada "kişiye özel" olarak işaretlenen ürün ve seçenekler bu kapsamdadır.
- Tesliminden sonra ambalaj, bant, mühür, paket gibi koruyucu unsurları açılmış olup iadesi sağlık ve hijyen açısından uygun olmayan ürünler.
- Çabuk bozulabilen veya son kullanma tarihi geçebilecek ürünler.

Bu istisnalar, ürünün ayıplı (kusurlu) olması hâlinde 6502 sayılı Kanun'dan doğan haklarınızı etkilemez.

## 8. Şikâyet ve başvuru

Talep ve şikâyetlerinizi öncelikle {{satici.eposta}} adresine e-posta göndererek ya da {{satici.telefon}} numarasından bize ulaşarak iletebilirsiniz.

Uyuşmazlık hâlinde; Ticaret Bakanlığınca her yıl ilan edilen parasal sınırlar dahilinde alıcının yerleşim yerindeki veya tüketici işleminin yapıldığı yerdeki Tüketici Hakem Heyetine, bu sınırları aşan uyuşmazlıklarda Tüketici Mahkemesine başvurulabilir. Tüketici mahkemesinde dava açmadan önce, kanunda öngörülen hâllerde arabulucuya başvurulması zorunludur. Tüketici hakem heyetlerine e-Devlet Kapısı üzerinden de başvurulabilir.

## 9. Onay

Alıcı, bu Ön Bilgilendirme Formu'nu siparişini onaylamadan önce okuduğunu ve elektronik ortamda onayladığını kabul eder. Bu form ve Mesafeli Satış Sözleşmesi siparişle birlikte kaydedilir; alıcı onayladığı metni [Siparişlerim](/siparislerim) sayfasından görüntüleyip yazdırabilir.

**Belge tarihi:** {{belge.tarih}}$legal$, 1
from public.stores s where s.slug = 'taktikalp46'
union all
select s.id, 'distance_sales', $legal$Mesafeli Satış Sözleşmesi$legal$, $legal$## 1. Taraflar

### Satıcı

**Satıcı (ticari unvan):** {{satici.unvan}}
**İşletme sahibi / yetkili:** {{satici.yetkili}}
**Adres:** {{satici.adres}}
**Telefon / WhatsApp:** {{satici.telefon}}
**E-posta:** {{satici.eposta}}
**KEP adresi:** {{satici.kep}}
**Vergi dairesi:** {{satici.vergi_dairesi}}
**Vergi kimlik no:** {{satici.vergi_no}}
**MERSİS no:** {{satici.mersis}}
**ETBİS kaydı:** {{satici.etbis}}
**İnternet sitesi:** {{satici.web}}

### Alıcı

**Adı soyadı:** {{alici.ad|Siparişi veren kişi}}
**Telefon:** {{alici.telefon}}
**E-posta:** {{alici.eposta}}
**Teslimat adresi:** {{siparis.teslimat_adresi}}
**Fatura bilgisi:** {{alici.fatura}}

## 2. Sözleşmenin konusu

Bu sözleşmenin konusu, alıcının satıcıya ait {{satici.web|internet sitesi}} üzerinden elektronik ortamda siparişini verdiği aşağıda nitelikleri ve satış fiyatı belirtilen ürünlerin satışı ve teslimine ilişkin olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerinin belirlenmesidir.

## 3. Ürünler ve fiyat

**Sipariş no:** {{siparis.no}}
**Sipariş tarihi:** {{siparis.tarih}}

{{siparis.urunler}}

**Ürünler toplamı:** {{siparis.ara_toplam}}
**İndirim ({{siparis.indirim_kodu|indirim}}):** −{{siparis.indirim}}
**Kargo:** {{siparis.kargo}}
**Kapıda ödeme ücreti:** {{siparis.kapida_odeme_ucreti}}
**Tüm vergiler dahil toplam:** {{siparis.toplam|Ödeme adımında gösterilen toplam tutar}}
**Ödeme yöntemi:** {{siparis.odeme_yontemi}}

Ürünlerin temel nitelikleri ilgili ürün sayfalarında ve sipariş öncesinde onaylanan Ön Bilgilendirme Formu'nda yer alır.

## 4. Teslimat

Ürünler, alıcının belirttiği teslimat adresine anlaşmalı kargo firması aracılığıyla, siparişin satıcıya ulaştığı tarihten itibaren en geç **30 gün** içinde teslim edilir. Ürün, satıcının belirttiği kargo ile alıcıya teslim edilene kadar oluşan kayıp ve hasardan satıcı sorumludur.

Satıcı, sipariş konusu ürünün tesliminin imkânsızlaştığını öğrendiği tarihten itibaren 3 gün içinde alıcıya bildirir ve varsa teslimat masrafları dahil tahsil ettiği tüm ödemeleri bildirim tarihinden itibaren en geç 14 gün içinde iade eder.

Alıcı, teslim aldığı ürünün hasarlı olduğunu fark ederse kargo görevlisine tutanak tutturmasını ve satıcıya bilgi vermesini satıcı tavsiye eder; bu tavsiye, alıcının yasal haklarını sınırlamaz.

## 5. Ödeme

Alıcı, sipariş toplamını seçtiği ödeme yöntemiyle öder. Kartla ödemeler iyzico güvenli ödeme sayfasında alınır; kart bilgileri satıcı tarafından görülmez ve saklanmaz. Kapıda ödemede tutar teslimat sırasında, havale/EFT'de sipariş sonrasında bildirilen hesaba ödenir.

## 6. Cayma hakkı

### Cayma hakkı

Alıcı; malı kendisinin veya belirlediği üçüncü kişinin teslim aldığı günden itibaren **{{iade.sure_gun}} gün** içinde, herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir. Sözleşmenin kurulmasından malın teslimine kadar geçen sürede de cayma hakkı kullanılabilir.

### Cayma hakkı nasıl kullanılır?

Cayma bildirimi, süre içinde yazılı olarak veya kalıcı veri saklayıcısı (e-posta, WhatsApp mesajı gibi) aracılığıyla satıcıya yöneltilmelidir. Aşağıdaki yollardan birini kullanabilirsiniz:

{{#if iade.cevrimici}}
- [Siparişlerim](/siparislerim) sayfasından siparişinizi açıp iade talebi oluşturabilirsiniz.
{{/if}}
- {{satici.eposta}} adresine e-posta gönderebilirsiniz.
- {{satici.telefon}} numarasına WhatsApp üzerinden yazılı mesaj gönderebilirsiniz.
- [Cayma formunu](/cayma-formu) doldurup yukarıdaki adreslerden birine iletebilirsiniz; formu kullanmak zorunlu değildir, cayma kararınızı bildiren açık bir beyan yeterlidir.

Cayma bildiriminizin bize ulaştığı size gecikmeksizin teyit edilir.

### Ürünün geri gönderilmesi

Alıcı, cayma bildirimini yönelttiği tarihten itibaren **14 gün** içinde ürünü geri gönderir.

{{#if iade.kargo_firmasi}}
**İade için anlaşmalı taşıyıcı:** {{iade.kargo_firmasi}}
**İade kodu:** {{iade.kod}}
Ürün bu taşıyıcıyla gönderildiğinde iade kargo ücreti alıcıdan alınmaz.
{{/if}}
**İade adresi:** {{iade.adres}}

Ürünün satıcının belirttiği taşıyıcıyla geri gönderilmesi ya da satıcının iade için bir taşıyıcı belirtmemiş olması hâlinde iade masrafı alıcıdan talep edilmez.

{{#if iade.talimat}}
**Mağazanın iade talimatı:** {{iade.talimat}}
{{/if}}

Ürünün cayma süresi içinde işleyişine, teknik özelliklerine ve kullanım talimatlarına uygun kullanılması nedeniyle oluşan değişiklik ve bozulmalardan alıcı sorumlu değildir.

### Ödemenin iadesi

Satıcı, varsa teslimat masrafları dahil tahsil ettiği tüm ödemeleri **14 gün** içinde; alıcının kullandığı ödeme aracına uygun şekilde, alıcıya herhangi bir masraf veya yükümlülük getirmeden ve tek seferde iade eder:

- Kartla (iyzico güvenli ödeme sayfası üzerinden) yapılan ödemeler aynı karta iade edilir. Taksitli alışverişlerde de iade tek seferde yapılır.
- Kapıda ödeme ve havale/EFT ile yapılan ödemeler, alıcının bildireceği kendi adına kayıtlı IBAN'a iade edilir.
- Henüz ödemesi alınmamış (teslim edilmemiş kapıda ödemeli) siparişte iade edilecek bir tutar doğmaz.

Bu süre; ürünün satıcının belirttiği taşıyıcıya teslim edildiği tarihten, başka bir taşıyıcıyla gönderilmişse ürünün satıcıya ulaştığı tarihten, ürün henüz teslim edilmemişse cayma bildiriminin satıcıya ulaştığı tarihten itibaren işler.

Siparişin tamamından caymada kargo ücreti dahil ödenen tüm tutar iade edilir. Siparişteki ürünlerin yalnız bir kısmından caymada, o ürünlere düşen tutar (siparişte indirim uygulandıysa orantılı olarak) iade edilir.

Cayma hakkı konusunda gerektiği şekilde bilgilendirilmeyen alıcı, cayma hakkını kullanmak için {{iade.sure_gun}} günlük süreyle bağlı değildir; bu süre her hâlükârda cayma süresinin bittiği tarihten itibaren bir yıl sonra sona erer.

### Cayma hakkının kullanılamayacağı durumlar

Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesi uyarınca, diğer hâllerin yanında aşağıdaki ürünlerde cayma hakkı kullanılamaz:

- Alıcının istekleri veya kişisel ihtiyaçları doğrultusunda hazırlanan ürünler (ör. sipariş sırasında seçilen kişiye özel yazı ya da işleme içeren ürünler). Mağazada "kişiye özel" olarak işaretlenen ürün ve seçenekler bu kapsamdadır.
- Tesliminden sonra ambalaj, bant, mühür, paket gibi koruyucu unsurları açılmış olup iadesi sağlık ve hijyen açısından uygun olmayan ürünler.
- Çabuk bozulabilen veya son kullanma tarihi geçebilecek ürünler.

Bu istisnalar, ürünün ayıplı (kusurlu) olması hâlinde 6502 sayılı Kanun'dan doğan haklarınızı etkilemez.

## 7. Temerrüt

Tarafların bu sözleşmeden doğan borçlarını yerine getirmemesi hâlinde 6098 sayılı Türk Borçlar Kanunu'nun borçlunun temerrüdüne ilişkin hükümleri uygulanır. Satıcının ürünü taahhüt ettiği sürede teslim etmemesi hâlinde alıcı sözleşmeyi feshedebilir; bu durumda satıcı, teslimat masrafları dahil tahsil ettiği tüm ödemeleri fesih bildiriminin kendisine ulaştığı tarihten itibaren 14 gün içinde kanuni faiziyle birlikte iade eder.

## 8. Uyuşmazlıkların çözümü

Talep ve şikâyetlerinizi öncelikle {{satici.eposta}} adresine e-posta göndererek ya da {{satici.telefon}} numarasından bize ulaşarak iletebilirsiniz.

Uyuşmazlık hâlinde; Ticaret Bakanlığınca her yıl ilan edilen parasal sınırlar dahilinde alıcının yerleşim yerindeki veya tüketici işleminin yapıldığı yerdeki Tüketici Hakem Heyetine, bu sınırları aşan uyuşmazlıklarda Tüketici Mahkemesine başvurulabilir. Tüketici mahkemesinde dava açmadan önce, kanunda öngörülen hâllerde arabulucuya başvurulması zorunludur. Tüketici hakem heyetlerine e-Devlet Kapısı üzerinden de başvurulabilir.

## 9. Yürürlük

Alıcı, sipariş öncesinde Ön Bilgilendirme Formu'nu okuyup onayladığını ve bu sözleşmenin tüm koşullarını elektronik ortamda kabul ettiğini beyan eder. Sözleşme, alıcının ödeme adımında "Ön Bilgilendirme Formu'nu ve Mesafeli Satış Sözleşmesi'ni okudum, onaylıyorum" kutusunu işaretleyip siparişi onaylamasıyla kurulur. Sözleşmenin onaylanan metni siparişle birlikte saklanır ve alıcı tarafından [Siparişlerim](/siparislerim) sayfasından görüntülenip yazdırılabilir.

**Belge tarihi:** {{belge.tarih}}$legal$, 1
from public.stores s where s.slug = 'taktikalp46'
union all
select s.id, 'returns', $legal$İade ve Cayma Koşulları$legal$, $legal${{magaza.adi}} üzerinden yaptığınız alışverişlerde, ürünü teslim aldığınız günden itibaren **{{iade.sure_gun}} gün** içinde gerekçe göstermeden cayma (iade) hakkınız vardır.

## İade talebi nasıl oluşturulur?

{{#if iade.cevrimici}}
- [Siparişlerim](/siparislerim) sayfasından siparişinizi açın (üye değilseniz sipariş numaranız ve telefonunuzla sorgulayabilirsiniz).
- "İade talebi" ile iade etmek istediğiniz ürünleri ve nedenini seçin; kapıda ödeme ya da havale/EFT ile ödediyseniz iadenin yapılacağı IBAN'ı girin.
- Talebiniz onaylandığında, aşağıdaki iade bilgileriyle ürünü kargoya verin.
{{/if}}
{{#if iade.cevrimdisi}}
Çevrimiçi iade talebi şu an bu mağazada açık değildir; cayma hakkınız yasal olarak devam eder. İade talebinizi {{satici.eposta}} adresine e-posta ile ya da {{satici.telefon}} numarasına WhatsApp üzerinden yazılı olarak iletebilirsiniz. Mesajınıza sipariş numaranızı ve iade etmek istediğiniz ürünleri yazmanız yeterlidir.
{{/if}}

### Cayma hakkı

Alıcı; malı kendisinin veya belirlediği üçüncü kişinin teslim aldığı günden itibaren **{{iade.sure_gun}} gün** içinde, herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir. Sözleşmenin kurulmasından malın teslimine kadar geçen sürede de cayma hakkı kullanılabilir.

### Cayma hakkı nasıl kullanılır?

Cayma bildirimi, süre içinde yazılı olarak veya kalıcı veri saklayıcısı (e-posta, WhatsApp mesajı gibi) aracılığıyla satıcıya yöneltilmelidir. Aşağıdaki yollardan birini kullanabilirsiniz:

{{#if iade.cevrimici}}
- [Siparişlerim](/siparislerim) sayfasından siparişinizi açıp iade talebi oluşturabilirsiniz.
{{/if}}
- {{satici.eposta}} adresine e-posta gönderebilirsiniz.
- {{satici.telefon}} numarasına WhatsApp üzerinden yazılı mesaj gönderebilirsiniz.
- [Cayma formunu](/cayma-formu) doldurup yukarıdaki adreslerden birine iletebilirsiniz; formu kullanmak zorunlu değildir, cayma kararınızı bildiren açık bir beyan yeterlidir.

Cayma bildiriminizin bize ulaştığı size gecikmeksizin teyit edilir.

### Ürünün geri gönderilmesi

Alıcı, cayma bildirimini yönelttiği tarihten itibaren **14 gün** içinde ürünü geri gönderir.

{{#if iade.kargo_firmasi}}
**İade için anlaşmalı taşıyıcı:** {{iade.kargo_firmasi}}
**İade kodu:** {{iade.kod}}
Ürün bu taşıyıcıyla gönderildiğinde iade kargo ücreti alıcıdan alınmaz.
{{/if}}
**İade adresi:** {{iade.adres}}

Ürünün satıcının belirttiği taşıyıcıyla geri gönderilmesi ya da satıcının iade için bir taşıyıcı belirtmemiş olması hâlinde iade masrafı alıcıdan talep edilmez.

{{#if iade.talimat}}
**Mağazanın iade talimatı:** {{iade.talimat}}
{{/if}}

Ürünün cayma süresi içinde işleyişine, teknik özelliklerine ve kullanım talimatlarına uygun kullanılması nedeniyle oluşan değişiklik ve bozulmalardan alıcı sorumlu değildir.

### Ödemenin iadesi

Satıcı, varsa teslimat masrafları dahil tahsil ettiği tüm ödemeleri **14 gün** içinde; alıcının kullandığı ödeme aracına uygun şekilde, alıcıya herhangi bir masraf veya yükümlülük getirmeden ve tek seferde iade eder:

- Kartla (iyzico güvenli ödeme sayfası üzerinden) yapılan ödemeler aynı karta iade edilir. Taksitli alışverişlerde de iade tek seferde yapılır.
- Kapıda ödeme ve havale/EFT ile yapılan ödemeler, alıcının bildireceği kendi adına kayıtlı IBAN'a iade edilir.
- Henüz ödemesi alınmamış (teslim edilmemiş kapıda ödemeli) siparişte iade edilecek bir tutar doğmaz.

Bu süre; ürünün satıcının belirttiği taşıyıcıya teslim edildiği tarihten, başka bir taşıyıcıyla gönderilmişse ürünün satıcıya ulaştığı tarihten, ürün henüz teslim edilmemişse cayma bildiriminin satıcıya ulaştığı tarihten itibaren işler.

Siparişin tamamından caymada kargo ücreti dahil ödenen tüm tutar iade edilir. Siparişteki ürünlerin yalnız bir kısmından caymada, o ürünlere düşen tutar (siparişte indirim uygulandıysa orantılı olarak) iade edilir.

Cayma hakkı konusunda gerektiği şekilde bilgilendirilmeyen alıcı, cayma hakkını kullanmak için {{iade.sure_gun}} günlük süreyle bağlı değildir; bu süre her hâlükârda cayma süresinin bittiği tarihten itibaren bir yıl sonra sona erer.

### Cayma hakkının kullanılamayacağı durumlar

Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesi uyarınca, diğer hâllerin yanında aşağıdaki ürünlerde cayma hakkı kullanılamaz:

- Alıcının istekleri veya kişisel ihtiyaçları doğrultusunda hazırlanan ürünler (ör. sipariş sırasında seçilen kişiye özel yazı ya da işleme içeren ürünler). Mağazada "kişiye özel" olarak işaretlenen ürün ve seçenekler bu kapsamdadır.
- Tesliminden sonra ambalaj, bant, mühür, paket gibi koruyucu unsurları açılmış olup iadesi sağlık ve hijyen açısından uygun olmayan ürünler.
- Çabuk bozulabilen veya son kullanma tarihi geçebilecek ürünler.

Bu istisnalar, ürünün ayıplı (kusurlu) olması hâlinde 6502 sayılı Kanun'dan doğan haklarınızı etkilemez.

## Ayıplı (kusurlu) ürün

Teslim aldığınız ürün ayıplıysa cayma hakkından bağımsız olarak 6502 sayılı Kanun uyarınca; sözleşmeden dönme, ayıp oranında bedel indirimi, ücretsiz onarım veya ayıpsız benzeriyle değiştirme haklarından birini seçebilirsiniz. Ayıplı maldan sorumluluk, kanunda daha uzun bir süre öngörülmedikçe teslimden itibaren iki yıllık zamanaşımına tabidir. Bunun için bizimle {{satici.eposta}} veya {{satici.telefon}} üzerinden iletişime geçebilirsiniz.

## Şikâyet ve başvuru

Talep ve şikâyetlerinizi öncelikle {{satici.eposta}} adresine e-posta göndererek ya da {{satici.telefon}} numarasından bize ulaşarak iletebilirsiniz.

Uyuşmazlık hâlinde; Ticaret Bakanlığınca her yıl ilan edilen parasal sınırlar dahilinde alıcının yerleşim yerindeki veya tüketici işleminin yapıldığı yerdeki Tüketici Hakem Heyetine, bu sınırları aşan uyuşmazlıklarda Tüketici Mahkemesine başvurulabilir. Tüketici mahkemesinde dava açmadan önce, kanunda öngörülen hâllerde arabulucuya başvurulması zorunludur. Tüketici hakem heyetlerine e-Devlet Kapısı üzerinden de başvurulabilir.$legal$, 1
from public.stores s where s.slug = 'taktikalp46'
union all
select s.id, 'withdrawal_form', $legal$Cayma Formu$legal$, $legal$(Bu form, yalnızca sözleşmeden cayma hakkı kullanılmak istenildiğinde doldurulup gönderilecektir. Formu kullanmak zorunlu değildir; cayma kararınızı bildiren açık bir beyan da yeterlidir.)

**Kime:**
{{satici.unvan}}
{{satici.adres}}
E-posta: {{satici.eposta}}
Telefon / WhatsApp: {{satici.telefon}}

Bu formla aşağıdaki malların satışına ilişkin sözleşmeden cayma hakkımı kullandığımı beyan ederim.

- Sipariş numarası: ..............................................
- Sipariş tarihi / teslim tarihi: ..............................................
- Cayma hakkına konu mal: ..............................................
- Cayma hakkına konu malın bedeli: ..............................................
- Tüketicinin adı ve soyadı: ..............................................
- Tüketicinin adresi: ..............................................
- Tüketicinin imzası (sadece kâğıt üzerinde gönderilen formlar için): ..............................................
- Tarih: ..............................................

{{#if iade.cevrimici}}
İsterseniz bu form yerine [Siparişlerim](/siparislerim) sayfasından çevrimiçi iade talebi de oluşturabilirsiniz.
{{/if}}$legal$, 1
from public.stores s where s.slug = 'taktikalp46'
union all
select s.id, 'privacy_kvkk', $legal$KVKK Aydınlatma Metni$legal$, $legal$Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun ("KVKK") 10. maddesi uyarınca, {{magaza.adi}} internet sitesi üzerinden alışveriş yapan, üye olan veya bizimle iletişime geçen kişileri kişisel verilerinin işlenmesi hakkında bilgilendirmek amacıyla hazırlanmıştır.

## 1. Veri sorumlusu

**Satıcı (ticari unvan):** {{satici.unvan}}
**İşletme sahibi / yetkili:** {{satici.yetkili}}
**Adres:** {{satici.adres}}
**Telefon / WhatsApp:** {{satici.telefon}}
**E-posta:** {{satici.eposta}}
**KEP adresi:** {{satici.kep}}
**Vergi dairesi:** {{satici.vergi_dairesi}}
**Vergi kimlik no:** {{satici.vergi_no}}
**MERSİS no:** {{satici.mersis}}
**ETBİS kaydı:** {{satici.etbis}}
**İnternet sitesi:** {{satici.web}}

## 2. İşlenen kişisel veriler

- **Kimlik:** ad soyad; fatura için verdiğiniz T.C. kimlik numarası (bireysel faturada isteğe bağlı) veya vergi kimlik numarası ve vergi dairesi (kurumsal faturada).
- **İletişim:** telefon numarası, e-posta adresi, teslimat ve fatura adresi.
- **Müşteri işlem:** sipariş içeriği ve tutarları, ödeme yöntemi, sipariş ve kargo durumu, iptal/iade talepleri ve notlarınız.
- **Finans:** yalnız kapıda ödeme veya havale/EFT ile yapılan siparişlerin iadesinde, iadenin yapılacağı IBAN ve hesap sahibi adı. Kart bilgileriniz ödeme kuruluşu iyzico tarafından alınır; satıcıya iletilmez ve satıcı tarafından saklanmaz.
- **Üyelik:** üye olursanız e-posta adresiniz, kayıtlı adresleriniz ve oturum bilgisi.
- **İşlem güvenliği:** oturum çerezi, kötüye kullanımı önlemek için kullanılan teknik kayıtlar (ör. indirim kodu deneme sınırı için IP adresinden türetilen geri döndürülemez bir anahtar).
- **Pazarlama:** yalnız ayrıca ticari elektronik ileti onayı verdiyseniz, kampanya duyurusu için iletişim bilgileriniz.

## 3. İşleme amaçları ve hukuki sebepler

- Siparişin alınması, ödemenin tahsili, ürünün teslimi, faturalandırma, iptal/iade ve cayma taleplerinin yürütülmesi — **sözleşmenin kurulması ve ifası** (KVKK m.5/2-c).
- Vergi, ticaret ve tüketici mevzuatından doğan kayıt, saklama ve bildirim yükümlülükleri — **hukuki yükümlülük** (KVKK m.5/2-ç).
- Uyuşmazlık hâlinde hakların tesisi, kullanılması ve korunması — KVKK m.5/2-e.
- Talep ve şikâyetlerin yanıtlanması, işlem güvenliği ve kötüye kullanımın önlenmesi — **meşru menfaat** (KVKK m.5/2-f).
- Kampanya ve indirim duyuruları — yalnız 6563 sayılı Kanun uyarınca vereceğiniz ticari elektronik ileti onayı kapsamında; onayınızı dilediğiniz zaman geri alabilirsiniz.

## 4. Kişisel verilerin aktarılması

Kişisel verileriniz yukarıdaki amaçlarla sınırlı olarak şu alıcılara aktarılabilir:

- **Kargo:** Basit Kargo entegrasyonu ve anlaşmalı kargo firmaları — teslimat ve iade gönderileri için ad, telefon ve adres.
- **Ödeme:** iyzico (ödeme kuruluşu) — kartla ödeme ve iadesi için sipariş ve alıcı bilgileri.
- **Altyapı hizmet sağlayıcıları:** veritabanı ve kimlik doğrulama hizmeti Supabase (sunucular Avrupa Birliği — İrlanda), internet sitesinin barındırma hizmeti Vercel (sunucu işlevleri Amerika Birleşik Devletleri), e-posta bildirim hizmeti Resend (Amerika Birleşik Devletleri), WhatsApp mesajları için Meta.
- **Yetkili kamu kurum ve kuruluşları:** kanunen yetkili kurumların talebi hâlinde.

Altyapı hizmetleri yurt dışındaki sunucular üzerinden sağlandığından kişisel verileriniz KVKK'nın 9. maddesinde öngörülen usul ve şartlarla yurt dışına aktarılmaktadır.

## 5. Toplama yöntemi

Kişisel verileriniz; internet sitesindeki sipariş, üyelik, iade ve iletişim formları aracılığıyla elektronik ortamda, sizin tarafınızdan; işlem güvenliğine ilişkin teknik kayıtlar ise otomatik yollarla (çerezler ve sunucu kayıtları) toplanır. Ayrıntılar için [Çerez Politikası](/cerez-politikasi) sayfasına bakabilirsiniz.

## 6. Saklama süresi

Kişisel verileriniz, işleme amacının gerektirdiği süre ve ilgili mevzuatta (vergi, ticaret ve tüketici mevzuatı) öngörülen saklama süreleri boyunca saklanır; sürenin sonunda silinir, yok edilir veya anonim hâle getirilir.

## 7. Haklarınız (KVKK m.11)

Kişisel verilerinizle ilgili olarak; işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini isteme, KVKK m.7'deki şartlar çerçevesinde silinmesini veya yok edilmesini isteme, bu işlemlerin aktarıldığı üçüncü kişilere bildirilmesini isteme, münhasıran otomatik sistemlerle analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme ve kanuna aykırı işleme sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme haklarına sahipsiniz.

## 8. Başvuru

Taleplerinizi, Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ'e uygun olarak; yazılı olarak {{satici.adres}} adresine veya sistemimizde kayıtlı e-posta adresinizden {{satici.eposta}} adresine iletebilirsiniz.
KEP ile başvuru: {{satici.kep}}
Başvurunuz, talebin niteliğine göre en geç 30 gün içinde ücretsiz olarak sonuçlandırılır; işlemin ayrıca bir maliyet gerektirmesi hâlinde Kişisel Verileri Koruma Kurulunca belirlenen tarife uygulanabilir.$legal$, 1
from public.stores s where s.slug = 'taktikalp46'
union all
select s.id, 'cookies', $legal$Çerez Politikası$legal$, $legal$Bu politika, {{magaza.adi}} internet sitesinde kullanılan çerezler ve benzeri tarayıcı depolama teknolojileri hakkında sizi bilgilendirmek amacıyla hazırlanmıştır.

## Çerez nedir?

Çerezler, ziyaret ettiğiniz internet sitesi tarafından tarayıcınıza kaydedilen küçük metin dosyalarıdır. Bu sitede ayrıca tarayıcınızın yerel depolama (localStorage) ve oturum depolama (sessionStorage) alanları kullanılır.

## Kullandığımız çerezler ve depolama alanları

Sitemizde bugün yalnız sitenin çalışması için **zorunlu** çerezler ve depolama alanları kullanılmaktadır:

- **sb-storefront-auth** (çerez) — Müşteri hesabına giriş yaptığınızda oturumunuzu açık tutar. Yalnız giriş yapan müşterilerde oluşur; çıkış yaptığınızda veya oturum sona erdiğinde geçersiz hâle gelir.
- **mb-store-cart** (yerel depolama) — Sepetinizdeki ürünleri tarayıcınızda saklar. Sepeti boşalttığınızda, siparişiniz tamamlandığında veya tarayıcı verilerini sildiğinizde silinir.
- **mb-checkout-discount** (oturum depolama) — Ödeme adımında uyguladığınız indirim kodunu sayfa yenilendiğinde korur. Tarayıcı sekmesi kapandığında silinir.

Bu zorunlu çerezler ve depolama alanları, talep ettiğiniz alışveriş hizmetini sunabilmemiz için gereklidir; bu nedenle onayınıza bağlı değildir.

Sitemizde bugün **analitik, reklam veya pazarlama amaçlı çerez kullanılmamaktadır.** İleride bu tür çerezler kullanılmaya başlanırsa, bu politika güncellenir ve bu çerezler yalnızca açık onayınızı almamızdan sonra çalıştırılır.

Kartla ödeme sırasında açılan iyzico güvenli ödeme sayfası, kendi çerezlerini kullanabilir; bu çerezler iyzico'nun kendi politikalarına tabidir.

## Çerezleri nasıl yönetebilirsiniz?

Tarayıcınızın ayarlarından çerezleri ve site verilerini silebilir veya engelleyebilirsiniz. Zorunlu çerezleri engellemeniz hâlinde sepet ve müşteri hesabı gibi özellikler çalışmayabilir.

Kişisel verilerinizin işlenmesine ilişkin ayrıntılar için [KVKK Aydınlatma Metni](/kvkk) sayfasına bakabilirsiniz.$legal$, 1
from public.stores s where s.slug = 'taktikalp46'
on conflict (store_id, kind, version) do nothing;

-- Doğrulama (beklenen: 6 satır, hepsi version 1, reviewed_by_lawyer false):
-- select kind, version, reviewed_by_lawyer, char_length(body) as len
-- from public.store_legal_documents d join public.stores s on s.id = d.store_id
-- where s.slug = 'taktikalp46' order by kind;
