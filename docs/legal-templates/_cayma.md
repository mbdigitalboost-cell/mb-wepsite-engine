<!--
Ortak bölüm: cayma hakkı (Ön Bilgilendirme Formu, Mesafeli Satış Sözleşmesi
ve İade ve Cayma Koşulları sayfası aynı metni kullanır).
Kaynak: 6502 sayılı TKHK m.48/4; MSY m.9 (süre ve başlangıcı), m.10 (eksik
bilgilendirme), m.11 (kullanım usulü, EK form, teyit), m.12 (satıcının
yükümlülükleri: 14 gün, ödeme aracına uygun, tek seferde, masrafsız),
m.13 (tüketicinin geri gönderme yükümlülüğü), m.14/2 (olağan kullanım);
T.C. Ticaret Bakanlığı "Mesafeli Sözleşmeler Hakkında Bilgilendirme"
(17.08.2026): iade süresinin başlangıcı, iade kargo masrafı.
Bedel iadesi yöntemi Faz 30 kurallarıyla birebir (lib/commerce/returns/eligibility.ts
refundMethodFor): kart → aynı karta (iyzico); kapıda ödeme ve havale → IBAN;
ödemesi alınmamış kapıda ödemeli iptal → iade edilecek tutar yok.
-->
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
