/**
 * Faz 12 devamı — koyu temalı form alanı stilleri, SADECE storefront
 * (app/store/[storeSlug]/**) için. lib/utils/input-classes.ts'in AYNI
 * kopyası/varyantı DEĞİL, bilinçli olarak AYRI bir dosya: o dosya admin
 * dashboard'un (~12 form bileşeni) paylaşımlı, açık temalı stili — checkout
 * ve adres formları da (sepet/checkout-form.tsx, hesap/adreslerim/
 * address-form.tsx, components/commerce/public/location-select.tsx) bugüne
 * kadar TAM OLARAK AYNI dosyayı (`inputClasses`) kullanıyordu (grep ile
 * doğrulandı) — yani bu üçü "tenant-bağımsız paylaşımlı" değil, "storefront
 * ile admin panel arasında YANLIŞLIKLA paylaşılmış" durumdaydı. Panelin
 * kendi stilini (açık tema, bg-transparent + text-foreground) DEĞİŞTİRMEDEN
 * storefront'u düzeltmenin tek yolu ayrı bir dosya — input-classes.ts'e
 * dokunmak paneldeki HER formu da koyulaştırırdı (istenmeyen).
 *
 * KÖK NEDEN (ekran görüntüsü + kod okunarak teyit edildi, varsayımla değil):
 * eski `inputClasses`, `bg-transparent` + `text-foreground` kullanıyordu —
 * "sistem karanlık modundaysa otomatik uyum sağlasın" niyetiyle. İki ayrı
 * mekanizma bunu pratikte bozuyor: (1) bir `<select>`'in AÇILAN dropdown
 * popup'ı, çoğu tarayıcıda `background-color: transparent`'i popup'a
 * taşımıyor — popup'ın kendisi tarayıcının varsayılan (genelde BEYAZ) zemini
 * ile açılıyor, ama `color` (açık renk, karanlık mod flip'i) popup'a
 * TAŞINIYOR — açık renkli yazı beyaz zeminde kayboluyor (kullanıcının özellikle
 * işaret ettiği "açılır listenin kendisi de okunur olmalı" tam olarak bu).
 * (2) Android/bazı mobil tarayıcıların "web içeriği için koyu tema" ("force
 * dark") özelliği, ARKA PLANI EXPLICIT OLARAK TANIMLAMAMIŞ form elemanlarına
 * (`bg-transparent` tam olarak bu) kendi sentetik koyu zeminini uyguluyor
 * ama METİN rengini her zaman doğru tahmin edemiyor — koyu zemin + koyu
 * kalan yazı = görünmez metin. İKİSİNİN DE ortak çözümü aynı: transparan/
 * miras alınan renklere güvenmek yerine, aşağıdaki gibi OPAK, HARDCODED bir
 * zemin + metin rengi vermek — hangi tarayıcı/sistem teması olursa olsun
 * kendi kendine yeten, öngörülebilir bir kontrast garantiliyor.
 *
 * Zemin #171717 (kart rengi), metin #F5F5F5, placeholder #A3A3A3, border
 * #292929, focus border+ring #D95F00 ("Silahını Seç" butonuyla aynı turuncu,
 * kullanıcının kendi isteği) — taktikalp46-homepage-sections.tsx/
 * store-header.tsx'te zaten kullanılan AYNI v2 token seti, yeni bir palet
 * icat edilmedi.
 */
export const storefrontInputClasses =
  "w-full rounded-md border border-[#292929] bg-[#171717] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#A3A3A3] transition-colors focus-visible:border-[#D95F00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D95F00]/30";

/**
 * Radio/checkbox — aynı sayfaların içindeki "kayıtlı adres seç"/"ödeme
 * yöntemi" gibi seçim kontrolleri. Önceden `border-black/20` (arka planı
 * koyu bir kartın üzerinde neredeyse görünmez bir border) — burada da AYNI
 * kök nedenden (hardcoded/miras alınan koyu bir renk yerine, açık/görünür
 * bir border) kaçınılıyor. `accent-[#D95F00]` işaretlendiğinde (checked)
 * kutucuğun/yuvarlağın kendisini de aynı marka turuncusuyla boyuyor.
 */
export const storefrontRadioClasses = "h-4 w-4 border-[#4A4A46] accent-[#D95F00]";
