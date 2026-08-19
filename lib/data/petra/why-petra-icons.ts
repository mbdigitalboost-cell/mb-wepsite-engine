import { Compass, Wrench, LifeBuoy, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Homepage visual revision: "Neden Petra?" cards get a themed line-icon,
 * same pattern as lib/data/petra/process-icons.ts (keyed by the
 * advantage's `title` — see lib/data/petra/why-petra.ts — so reordering
 * that array never silently mismatches an icon). Pure iconography, no
 * fabricated imagery.
 */
export const petraWhyPetraIcons: Record<string, LucideIcon> = {
  "Mühendislik Yaklaşımı": Compass,
  "Profesyonel Kurulum": Wrench,
  "Teknik Servis Desteği": LifeBuoy,
  "Uçtan Uca Süreç": Workflow,
};

export const petraWhyPetraIconFallback: LucideIcon = Compass;
