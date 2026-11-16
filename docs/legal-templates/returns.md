<!--
İade ve Cayma Koşulları (müşteri dilinde anlatım).
Kaynak: MSY m.9–15 (ortak bölüm _cayma.md, _istisnalar.md); 6502 sayılı TKHK
m.8–12 (ayıplı mal, seçimlik haklar, 2 yıllık zamanaşımı); Faz 30 iade akışı
(app/store/[storeSlug]/siparislerim/[orderId] — iade talebi; store_return_settings
kargo/kod/talimat/adres). Çevrimiçi iade kapalı olsa bile cayma hakkı yasal
olarak vardır — o durumda e-posta / WhatsApp yolu yazılır.
-->
# İade ve Cayma Koşulları

{{magaza.adi}} üzerinden yaptığınız alışverişlerde, ürünü teslim aldığınız günden itibaren **{{iade.sure_gun}} gün** içinde gerekçe göstermeden cayma (iade) hakkınız vardır.

## İade talebi nasıl oluşturulur?

{{#if iade.cevrimici}}
- [Siparişlerim](/siparislerim) sayfasından siparişinizi açın (üye değilseniz sipariş numaranız ve telefonunuzla sorgulayabilirsiniz).
- "İade talebi" ile iade etmek istediğiniz ürünleri ve nedenini seçin; kapıda ödeme ya da havale/EFT ile ödediyseniz iadenin yapılacağı IBAN'ı girin.
- Talebiniz onaylandığında, aşağıdaki iade bilgileriyle ürünü kargoya verin.
{{/if}}
{{#if iade.cevrimdisi}}
Çevrimiçi iade talebi şu an bu mağazada açık değildir; cayma hakkınız yasal olarak devam eder. İade talebinizi {{satici.eposta}} adresine e-posta ile ya da {{satici.telefon}} numarasına WhatsApp üzerinden yazılı olarak iletebilirsiniz. Mesajınıza sipariş numaranızı ve iade etmek istediğiniz ürünleri yazmanız yeterlidir.
{{/if}}

{{> _cayma}}

{{> _istisnalar}}

## Ayıplı (kusurlu) ürün

Teslim aldığınız ürün ayıplıysa cayma hakkından bağımsız olarak 6502 sayılı Kanun uyarınca; sözleşmeden dönme, ayıp oranında bedel indirimi, ücretsiz onarım veya ayıpsız benzeriyle değiştirme haklarından birini seçebilirsiniz. Ayıplı maldan sorumluluk, kanunda daha uzun bir süre öngörülmedikçe teslimden itibaren iki yıllık zamanaşımına tabidir. Bunun için bizimle {{satici.eposta}} veya {{satici.telefon}} üzerinden iletişime geçebilirsiniz.

## Şikâyet ve başvuru

{{> _sikayet}}
