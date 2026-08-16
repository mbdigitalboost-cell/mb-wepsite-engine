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
 * Decorative banner image for /hizmetler. Kept as a standalone constant
 * (not on `PetraService`, which stays a plain reusable {title, description}
 * shape used by the generic CMS-wired services list) so it doesn't couple
 * page-level decoration into the shared multi-tenant type.
 *
 * Faz 12 revizyon: replaced with a higher-resolution photo from the same
 * customer-provided pack used for the solutions cards (see
 * lib/data/petra/solutions.ts's doc) — baked-in "BAKIM & SERVİS" title/
 * caption text removed via inpainting since this banner has no text
 * overlay of its own to begin with (unlike the solutions cards).
 */
export const petraServicesBannerImage: string | null = "/images/petra/services/10_bakim_servis_v3.jpg";
