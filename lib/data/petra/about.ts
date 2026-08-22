import type { PetraProcessStep } from "@/lib/data/petra/types";

/**
 * Petra Mühendislik — Hakkımızda sayfası içeriği.
 *
 * KAYNAK: kullanıcının doğrudan verdiği kurumsal bilgiler (2026-08-19
 * "HAKKIMIZDA SAYFASI REVİZYONU" briefi) — 2017 Kahramanmaraş kuruluşu,
 * ısıtma/soğutma/iklimlendirme faaliyet alanı, keşif→projelendirme→
 * kurulum→servis süreç bütünlüğü. Kullanıcının kendi "KESİNLİKLE UYDURMA"
 * listesi burada da geçerli: çalışan sayısı, ciro, proje sayısı, yıl
 * deneyimi, sertifika, ödül, ISO belgesi, yetkili bayilik, distribütörlük,
 * marka ortaklığı, mühendis sayısı, "lider firma" gibi doğrulanmamış
 * iddialar — HİÇBİRİ bu dosyada yok ve component'ler bunları
 * eklememelidir.
 */

export const petraAboutHero = {
  eyebrow: "Hakkımızda",
  heading: ["2017'den Bugüne", "Mühendislik Odaklı", "İklimlendirme Çözümleri."],
  description:
    "2017 yılında Kahramanmaraş'ta kurulan Petra Mühendislik, ısıtma, soğutma ve iklimlendirme alanında profesyonel çözümler sunan bir mühendislik firmasıdır.",
};

export const petraFoundingStory = {
  heading: "2017'de Başlayan Bir Mühendislik Hikâyesi.",
  paragraphs: [
    "Petra Mühendislik, 2017 yılında Kahramanmaraş'ta kuruldu. Kurulduğu günden bu yana iklimlendirme sektörünü yalnızca ürün satışı olarak değil, doğru mühendislik çözümünün oluşturulması olarak ele aldı.",
    "Her yapının ihtiyacının farklı olduğuna inanıyoruz. Bu nedenle keşiften ürün seçimine, projelendirmeden uygulamaya ve teknik servise kadar süreci bir bütün olarak değerlendiriyoruz.",
    "Konut, ticari ve kurumsal yapılar için; müşterinin ihtiyacını analiz ederek, kalite ve teknik doğruluktan ödün vermeden uzun vadeli memnuniyeti hedefleyen bir yaklaşımla çalışıyoruz.",
  ],
};

export interface PetraTimelineItem {
  year: string;
  title: string;
  description: string;
}

/**
 * Yalnızca 2 doğrulanmış nokta: kuruluş yılı (2017) ve "bugün" (devam
 * eden faaliyet). Aradaki yıllar için doğrulanmamış tarih/kilometre taşı
 * UYDURULMADI — brief'in kendi talimatı ("Sonraki aşamalar için
 * doğrulanmamış tarih UYDURMA").
 */
export const petraTimeline: PetraTimelineItem[] = [
  {
    year: "2017",
    title: "Kuruluş",
    description: "Petra Mühendislik kuruldu.",
  },
  {
    year: "Bugün",
    title: "Devam Eden Süreç",
    description:
      "Uzmanlık, mühendislik yaklaşımı ve müşteri odaklı hizmet anlayışıyla çalışmalarımıza devam ediyoruz.",
  },
];

export const petraApproachIntro = {
  heading: "Bizim İçin İklimlendirme Sadece Bir Cihaz Değildir.",
  description:
    "Doğru kapasite, doğru ürün, doğru uygulama ve doğru servis; verimli ve uzun ömürlü bir sistemin temelidir.",
};

/**
 * "Mühendislik Yaklaşımımız" — Hakkımızda sayfasına özel 4 adım.
 * `lib/data/petra/process-steps.ts` (anasayfadaki "Sadece Klima Değil..."
 * bölümü — Keşif/Projelendirme/Kurulum/Servis) ile kasıtlı olarak AYNI
 * dosya değil: aynı süreç bütünlüğü fikrini farklı, Hakkımızda'ya özgü
 * bir çerçeveden (ihtiyaç analizinden teknik desteğe) anlatıyor; anasayfa
 * bölümü değişmeden kalıyor.
 */
export const petraApproachSteps: PetraProcessStep[] = [
  {
    index: "01",
    title: "İhtiyaç Analizi",
    description: "Projenin ve kullanım alanının ihtiyaçlarını değerlendiriyoruz.",
  },
  {
    index: "02",
    title: "Doğru Çözüm",
    description: "İhtiyaca uygun iklimlendirme sistemini belirliyoruz.",
  },
  {
    index: "03",
    title: "Profesyonel Uygulama",
    description: "Kurulum sürecini teknik gerekliliklere uygun şekilde yürütüyoruz.",
  },
  {
    index: "04",
    title: "Teknik Destek",
    description: "Kurulum sonrasında teknik destek ve servis süreçlerini sürdürüyoruz.",
  },
];

export const petraAboutCta = {
  headingLines: ["Projeniz İçin Doğru İklimlendirme", "Çözümünü Birlikte Belirleyelim."],
  description: "İhtiyacınızı paylaşın, projeniz için uygun çözümü birlikte değerlendirelim.",
  ctaPrimaryLabel: "Keşif Talep Et",
  ctaPrimaryHref: "/iletisim",
  ctaSecondaryLabel: "İletişime Geç",
};
