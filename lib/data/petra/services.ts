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

/**
 * Faz 9.9: decorative banner image for /hizmetler, from the customer-provided
 * AI-generated visual pack (see public/images/petra/README.md's "Faz 9.9"
 * note). Deliberately generic/decorative — no caption implying this is a
 * specific real Petra employee or job site. Kept as a standalone constant
 * (not on `PetraService`, which stays a plain reusable {title, description}
 * shape used by the generic CMS-wired services list) so it doesn't couple
 * page-level decoration into the shared multi-tenant type.
 */
export const petraServicesBannerImage: string | null = "/images/petra/services/09_bakim_servis_v2.jpg";
