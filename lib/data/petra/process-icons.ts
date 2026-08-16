import { Search, Compass, Wrench, Headset } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Faz 9.9: PHASE_9_9_RAPOR.md's brief asked for the missing visual area
 * in the engineering/process section to be filled. No image generation
 * tool is available in this environment (see the report's "Görseller"
 * section), so this is a themed icon per step — pure iconography, not a
 * substitute photo — layered onto the existing step numbers in
 * components/sections/engineering-process.tsx. Keyed by step `title`
 * (matches lib/data/petra/process-steps.ts exactly) rather than index,
 * so reordering the steps array doesn't silently mismatch the icons.
 */
export const petraProcessIcons: Record<string, LucideIcon> = {
  "Keşif": Search,
  "Projelendirme": Compass,
  "Kurulum": Wrench,
  "Servis": Headset,
};

export const petraProcessIconFallback: LucideIcon = Wrench;
