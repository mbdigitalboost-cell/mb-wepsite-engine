import type { PetraTrustItem } from "@/lib/data/petra/types";

/**
 * Directly reflects Petra's confirmed service scope (satış/keşif/
 * projelendirme/kurulum/servis) — no dealer/warranty/experience-year
 * claims, since none of those are confirmed.
 */
export const petraTrustItems: PetraTrustItem[] = [
  { title: "Satış & Danışmanlık", description: "İhtiyacınıza uygun sistem seçimi." },
  { title: "Keşif & Projelendirme", description: "Yerinde değerlendirme ve teknik proje." },
  { title: "Profesyonel Kurulum", description: "Uzman ekiplerle montaj." },
  { title: "Teknik Servis", description: "Kurulum sonrası destek." },
];
