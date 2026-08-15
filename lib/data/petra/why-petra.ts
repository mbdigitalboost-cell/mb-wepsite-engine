export interface PetraAdvantage {
  title: string;
  description: string;
}

/**
 * "Garantili Hizmet" / warranty-period claims and years-in-business are
 * intentionally excluded — unconfirmed per the brief. Kept to advantages
 * directly backed by the confirmed service scope.
 */
export const petraAdvantages: PetraAdvantage[] = [
  {
    title: "Mühendislik Yaklaşımı",
    description: "Her proje, doğru sistem seçimi için teknik değerlendirmeyle başlar.",
  },
  {
    title: "Profesyonel Kurulum",
    description: "Kurulum, uzman ekipler tarafından gerçekleştirilir.",
  },
  {
    title: "Teknik Servis Desteği",
    description: "Kurulum sonrasında teknik servis desteği sağlanır.",
  },
  {
    title: "Uçtan Uca Süreç",
    description: "Keşiften servise, tüm süreç tek elden yönetilir.",
  },
];
