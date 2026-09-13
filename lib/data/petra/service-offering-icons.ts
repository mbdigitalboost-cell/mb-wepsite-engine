import { Wrench, Hammer, Droplets, Move, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Faz D: themed icon per concrete service offering (see
 * lib/data/petra/service-offerings.ts) — same keyed-by-title pattern as
 * lib/data/petra/why-petra-icons.ts / process-icons.ts, so reordering the
 * offerings array never silently mismatches an icon. Pure iconography,
 * no fabricated imagery.
 */
export const petraServiceOfferingIcons: Record<string, LucideIcon> = {
  "Klima Montajı ve Kurulumu": Wrench,
  "Arıza Tespiti ve Onarım (Tamir)": Hammer,
  "Klima Gaz Dolumu (Gaz Şarjı)": Droplets,
  "Klima Deplasesi (Sökme ve Yeniden Takma)": Move,
  "Klima Temizliği": Sparkles,
};

export const petraServiceOfferingIconFallback: LucideIcon = Wrench;
