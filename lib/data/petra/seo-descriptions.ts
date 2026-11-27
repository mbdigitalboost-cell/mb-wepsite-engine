/**
 * Petra SEO iyileştirme — Google açıklamaları (meta description).
 *
 * Bu dosya SAF VERİDİR (import yok): hem sayfalar hem de testler aynı
 * metni buradan okur. Metinler sitede zaten yayında olan içerikten
 * yazıldı; sitede olmayan bir iddia (fiyat, süre, puan, rakam) yoktur.
 *
 * ÇÖZÜM SAYFALARI (/cozumler/[slug]) — öncelik sırası
 * (lib/seo/build-metadata.ts → resolveSolutionSeo):
 *   1. CMS'te o çözüm için girilmiş `seo_description` (admin panel),
 *   2. buradaki slug eşlemesi,
 *   3. çözümün kısa kart özeti (bugüne kadarki davranış).
 * Kart özeti (`solutions.short_description`) DEĞİŞMEDİ: ana sayfa ve
 * /cozumler kartlarında aynen kullanılmaya devam ediyor. Burada slug'ı
 * olmayan (ör. CMS'ten sonradan eklenen) bir çözüm 3. adıma düşer.
 *
 * STATİK SAYFALAR — sayfanın kendi `staticMetadata.description` değeri
 * olarak kullanılır; CMS'te o sayfa için `route_key`'li bir SEO satırı
 * girilirse yine CMS kazanır (applyHomeSeoOverrides).
 */

export const petraSolutionSeoDescriptions: Readonly<Record<string, string>> = {
  "split-klimalar":
    "Konut ve küçük ticari mekanlar için tek iç ve dış üniteli split klima sistemleri. Petra Mühendislik ile Kahramanmaraş'ta satış, keşif ve kurulum.",
  "multi-split-klimalar":
    "Tek dış üniteye bağlı birden fazla iç üniteyle her odayı bağımsız iklimlendirin. Kahramanmaraş'ta multi-split klima keşfi ve kurulumu: Petra Mühendislik.",
  "profesyonel-klimalar":
    "Ofis, mağaza ve endüstriyel alanlar için yüksek kapasiteli profesyonel klimalar. Kahramanmaraş'ta projelendirmeden kuruluma Petra Mühendislik.",
  "vrf-sistemleri":
    "Büyük binalarda farklı bölgeleri bağımsız ve verimli iklimlendiren VRF sistemleri. Kahramanmaraş'ta VRF projelendirme ve kurulumu: Petra Mühendislik.",
  "isi-pompalari":
    "Havadaki ısı enerjisini aktararak hem ısıtan hem soğutan, verimliliği yüksek ısı pompaları. Kahramanmaraş'ta satış ve kurulum: Petra Mühendislik.",
  "sicak-su-sistemleri":
    "Konut ve ticari yapılar için verimli sıcak su üretim sistemleri. Kahramanmaraş'ta keşif, kurulum ve teknik servis desteği: Petra Mühendislik.",
};

export const petraStaticPageSeoDescriptions = {
  kampanyalar:
    "Petra Mühendislik'in Kahramanmaraş'taki klima ve iklimlendirme kampanyaları. Yeni kampanyalar yayınlandığında bu sayfada duyurulur.",
  iletisim:
    "Petra Mühendislik ile iletişime geçin: Kahramanmaraş'ta klima ve iklimlendirme için keşif talebi oluşturun, telefonla veya WhatsApp'tan ulaşın.",
  hizmetler:
    "Kahramanmaraş'ta klima satışı, yerinde keşif, projelendirme, profesyonel kurulum ve teknik servis. Petra Mühendislik ile uçtan uca iklimlendirme hizmeti.",
  projeler:
    "Petra Mühendislik ekibinin VRF, klima ve mekanik sistem uygulamalarından gerçek saha görüntüleri: ticari binalarda dış ünite kurulumu ve boru montajı.",
  /**
   * Devir metnindeki öneri "tavan yüksekliği, cephe, güneş ve yalıtım
   * durumuna göre" diyordu; hesaplayıcının formülü (lib/btu/calculate.ts)
   * yalnız alan × bölge katsayısı + kişi sayısı kullanıyor ve sonuç
   * kutusu diğer alanlar için "bilgi amaçlı, hesaba katılmadı" yazıyor.
   * Kullanıcı kararıyla metin hesaplayıcının gerçekte yaptığına çevrildi.
   */
  "btu-hesaplama":
    "Oda ölçüleri, bölge ve kişi sayısına göre yaklaşık klima BTU ihtiyacınızı ücretsiz hesaplayın. Kesin kapasite için yerinde keşif isteyin.",
} as const;

/** Slug eşlemesi; prototip anahtarlarına (ör. "constructor") karşı güvenli. Eşleme yoksa null. */
export function petraSolutionSeoDescription(slug: string): string | null {
  return Object.prototype.hasOwnProperty.call(petraSolutionSeoDescriptions, slug) ? petraSolutionSeoDescriptions[slug] : null;
}
