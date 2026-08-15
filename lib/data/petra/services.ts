import type { PetraService } from "@/lib/data/petra/types";

/** Service approach as confirmed in the brief: satış → keşif → projelendirme → kurulum → teknik servis. */
export const petraServices: PetraService[] = [
  {
    title: "Satış",
    description: "İhtiyacınıza uygun iklimlendirme sistemlerinin satışı ve danışmanlığı.",
  },
  {
    title: "Keşif",
    description: "Mekanınızı yerinde değerlendirip doğru çözümü belirliyoruz.",
  },
  {
    title: "Projelendirme",
    description: "İhtiyaca özel sistem tasarımı ve teknik projelendirme.",
  },
  {
    title: "Kurulum",
    description: "Profesyonel montaj ve devreye alma süreci.",
  },
  {
    title: "Teknik Servis",
    description: "Kurulum sonrası bakım ve teknik servis desteği.",
  },
];
