export const petraHero = {
  headingLines: ["İKLİMLENDİRMEDE", "MÜHENDİSLİK", "VE GÜVEN."],
  /** Index into headingLines that renders in the brand accent color. */
  accentLineIndex: 1,
  // Faz SEO-A: "Kahramanmaraş'ta" eklendi — bu, DB seo_settings'teki
  // title/description'da zaten var olan AYNI, teyitli konum bilgisinin
  // (petraFoundingStory: "2017 yılında Kahramanmaraş'ta kuruldu")
  // ilk kez sayfanın GÖVDE metninde (meta etiketi değil, kullanıcının
  // gerçekten OKUDUĞU ilk cümlede) görünmesi — yeni bir iddia değil,
  // zaten teyitli bir bilginin taşınması.
  subtext: "Kahramanmaraş'ta konut ve ticari alanlar için profesyonel iklimlendirme çözümleri.",
  ctaPrimaryLabel: "Keşif Talep Et",
  ctaPrimaryHref: "/iletisim",
  ctaSecondaryLabel: "WhatsApp'tan Ulaş",
  /**
   * Faz 6A: statik fallback'in ikincil butonu her zaman WhatsApp'a gider
   * (bkz. hero.tsx'teki `secondaryHref = hero.ctaSecondaryHref || whatsappHref`)
   * — bu alan sadece CMS satırlarının `cta_secondary_href` kolonuyla aynı
   * şekle sahip olmak için burada `undefined` olarak duruyor, statik hero
   * için bir davranış değişikliği YOK.
   */
  ctaSecondaryHref: undefined as string | undefined,
  /**
   * Faz "Hero — Yeni Görsel" revizyon: customer-provided photographic
   * hero banner (kondenser üniteleri + kırmızı/beyaz ışık şeritleri,
   * gece dış mekan sahnesi) — ÖNCEKİ `10_hero_main_v3.jpg`'nin aksine bu
   * görselde HİÇ baked-in başlık/CTA/nav yok (Petra logosu ekipmanın
   * ÜZERİNDE gerçek bir marka etiketi olarak duruyor, bir sayfa-UI
   * öğesi DEĞİL) — bu yüzden `backgroundHasEmbeddedHeadline: false`:
   * gerçek, kod-render'lı H1/subtext/CTA/trustInfo bu fotoğrafın ÜZERİNDE
   * HER ZAMAN görünür kalmalı (eski görselin aksine, burada onların
   * yerini alacak baked-in bir metin YOK).
   */
  backgroundImage: "/images/petra/hero/11_hero_main_v1.jpg" as string | null,
  backgroundHasEmbeddedHeadline: false,
  /**
   * Baked-in, korunması gereken bir içerik (logo/başlık) olmadığı için
   * artık düz, ortalanmış crop yeterli — eski görselin off-center
   * (`"22% center"`) düzeltmesine gerek kalmadı.
   */
  backgroundObjectPosition: "center",
  /**
   * Aynı yeni görsel setinin dikey/portre kırpımı — aynı sahne, farklı
   * oran (941×1672 ≈ eski `10_hero_mobile_v1.jpg`'den farklı, ~0.56:1).
   * Bu görselde de baked-in başlık/CTA YOK — `backgroundHasEmbeddedHeadlineMobile:
   * false`, gerçek H1/subtext/CTA/trustInfo mobilde de HER ZAMAN görünür.
   */
  backgroundImageMobile: "/images/petra/hero/11_hero_mobile_v1.jpg" as string | null,
  backgroundHasEmbeddedHeadlineMobile: false,
  /** Baked-in içerik yok, düz ortalanmış crop yeterli — eski `"center top"` düzeltmesine gerek kalmadı. */
  backgroundObjectPositionMobile: "center" as string | undefined,
  /** Confirmed by the customer's stated service scope — see brief §4. */
  trustInfo: ["Satış", "Kurulum", "Servis"],
  /**
   * This image's baked-in icon-caption row ("Mühendislik Yaklaşımı" /
   * "Yüksek Verimlilik" / ...) sits at the exact same height as the real
   * trustInfo line below the CTA buttons, so without an offset the two
   * directly overlap. Shifts the real line right, clear of that row, on
   * desktop widths (lg+) where both are visible at once — see
   * components/sections/hero.tsx's `trustInfoOffset` usage.
   */
  /**
   * Yeni görselde baked-in bir icon-caption satırı YOK (bu alanın TEK
   * amacı öyle bir satırla çakışmayı önlemekti) — artık offset'e gerek
   * yok, trustInfo kendi doğal konumunda kalıyor.
   */
  trustInfoOffset: undefined as string | undefined,
  /**
   * `backgroundHasEmbeddedHeadline` artık `false` olduğu için bu alan
   * zaten `hero.tsx`'te hiç okunmuyor (`hideDesktop && hero.ctaTopOffset`
   * koşulu) — netlik için `undefined` bırakıldı.
   */
  ctaTopOffset: undefined as string | undefined,
  ctaTopOffsetMobile: undefined as string | undefined,
  /**
   * Faz "Hero — Yeni Görsel + Mouse-Reactive Motion": bu görsel, KENDİ
   * içinde zaten gerçek kırmızı/beyaz ışık şeritleri taşıyor — bu bayrak,
   * `components/sections/hero-atmosphere.tsx`'teki (o şeritlere yaklaşık
   * hizalı, otonom akış + mouse-reaktif modülasyonlu) EK motion katmanının
   * SADECE bu, elle küratörlüğü yapılmış statik fallback görseliyle
   * gösterilmesini sağlıyor — `backgroundHasEmbeddedHeadline`'dan BİLEREK
   * AYRI bir bayrak: o artık `false` (baked-in başlık yok), ama bu görsel
   * hâlâ "hizalanmış motion katmanı olan, küratörlü" bir görsel. Admin
   * gelecekte TAMAMEN FARKLI bir fotoğraf yüklerse (`mapHeroRow`'un
   * `backgroundHasAtmosphere: false` sabit kuralı gereği) bu katman hiç
   * görünmez — yanlış hizalı şeritlerin alakasız bir fotoğrafın üzerine
   * binmesi böylece engellenir.
   */
  backgroundHasAtmosphere: true,
};
