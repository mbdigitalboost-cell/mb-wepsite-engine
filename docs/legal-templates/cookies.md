<!--
Çerez Politikası.
Kaynak: 6698 sayılı KVKK m.5/2-c,f ve m.10; Kişisel Verileri Koruma Kurumu
"Çerez Uygulamaları Hakkında Rehber" (zorunlu çerezler açık rızaya tabi değil;
analitik/pazarlama çerezleri için açık rıza); 5809 sayılı Elektronik
Haberleşme Kanunu m.51 (cihazda bilgi saklama — hukukçuya teyit).
Liste koddan çıkarıldı (2026-11-16): lib/supabase/storefront-* →
"sb-storefront-auth" çerezi (yalnız giriş yapan müşteri); cart-context.tsx →
localStorage "mb-store-cart:<mağaza>"; checkout-form.tsx → sessionStorage
"mb-checkout-discount:<mağaza>".
Faz 35: üçüncü taraf bölümü {{cerez.ucuncu_taraf}} değişkeniyle mağazanın
GERÇEK takip ayarından (store_tracking_settings) üretilir; çerez adları ve
süreleri sağlayıcıların resmî sayfalarından: Google Analytics Yardım "[GA4]
Cookie usage on websites" (_ga, _ga_<container-id>: 2 yıl); Google "How Google
uses cookies" (_gcl_: 90 gün); Meta geliştirici dokümanı "ClickID and the fbp
and fbc Parameters" (_fbc: 90 gün; _fbp için süre belirtilmiyor → "Meta'nın
çerez politikasında belirtilen süre").
-->
# Çerez Politikası

Bu politika, {{magaza.adi}} internet sitesinde kullanılan çerezler ve benzeri tarayıcı depolama teknolojileri hakkında sizi bilgilendirmek amacıyla hazırlanmıştır.

## Çerez nedir?

Çerezler, ziyaret ettiğiniz internet sitesi tarafından tarayıcınıza kaydedilen küçük metin dosyalarıdır. Bu sitede ayrıca tarayıcınızın yerel depolama (localStorage) ve oturum depolama (sessionStorage) alanları kullanılır.

## Kullandığımız çerezler ve depolama alanları

Sitenin çalışması için gerekli **zorunlu** çerezler ve depolama alanları:

- **sb-storefront-auth** (çerez) — Müşteri hesabına giriş yaptığınızda oturumunuzu açık tutar. Yalnız giriş yapan müşterilerde oluşur; çıkış yaptığınızda veya oturum sona erdiğinde geçersiz hâle gelir.
- **mb-store-cart** (yerel depolama) — Sepetinizdeki ürünleri tarayıcınızda saklar. Sepeti boşalttığınızda, siparişiniz tamamlandığında veya tarayıcı verilerini sildiğinizde silinir.
- **mb-checkout-discount** (oturum depolama) — Ödeme adımında uyguladığınız indirim kodunu sayfa yenilendiğinde korur. Tarayıcı sekmesi kapandığında silinir.
{{#if cerez.onay_cerezi}}
- **mb_consent** (çerez) — Çerez tercihinizi (analitik / reklam izni verip vermediğinizi) 6 ay boyunca hatırlar; böylece her sayfada yeniden sorulmaz.
{{/if}}

Bu zorunlu çerezler ve depolama alanları, talep ettiğiniz alışveriş hizmetini sunabilmemiz için gereklidir; bu nedenle onayınıza bağlı değildir.

## Analitik ve reklam çerezleri (üçüncü taraf)

{{cerez.ucuncu_taraf}}

Kartla ödeme sırasında açılan iyzico güvenli ödeme sayfası, kendi çerezlerini kullanabilir; bu çerezler iyzico'nun kendi politikalarına tabidir.

## Çerezleri nasıl yönetebilirsiniz?

Tarayıcınızın ayarlarından çerezleri ve site verilerini silebilir veya engelleyebilirsiniz. Zorunlu çerezleri engellemeniz hâlinde sepet ve müşteri hesabı gibi özellikler çalışmayabilir.

Kişisel verilerinizin işlenmesine ilişkin ayrıntılar için [KVKK Aydınlatma Metni](/kvkk) sayfasına bakabilirsiniz.
