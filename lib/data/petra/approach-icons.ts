import { ClipboardList, Target, HardHat, LifeBuoy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Hakkımızda sayfasının "Mühendislik Yaklaşımımız" bölümü için themed
 * line-icon eşlemesi — lib/data/petra/process-icons.ts ve
 * why-petra-icons.ts ile aynı desen (kayıt `title`'a göre, index'e göre
 * değil), lib/data/petra/about.ts'teki petraApproachSteps ile eşleşir.
 * Pure iconography, uydurma görsel/fotoğraf değil.
 */
export const petraApproachIcons: Record<string, LucideIcon> = {
  "İhtiyaç Analizi": ClipboardList,
  "Doğru Çözüm": Target,
  "Profesyonel Uygulama": HardHat,
  "Teknik Destek": LifeBuoy,
};

export const petraApproachIconFallback: LucideIcon = Target;
