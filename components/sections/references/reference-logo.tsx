import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import type { PetraReference } from "@/lib/data/petra/references";

interface ReferenceLogoProps {
  reference: PetraReference;
  /** "badge" = small circular icon for list rows. "panel" = large uncropped image for the showcase. */
  variant?: "badge" | "panel";
  className?: string;
  sizes?: string;
}

/**
 * Renders a reference's logo asset — see lib/data/petra/references.ts for
 * the full explanation of `logoType`. Two real logos (Bahçeşehir Koleji,
 * KSÜ Tıp Fakültesi) get a light backing so they stay legible regardless
 * of their own file's background; the 23 `fallback` entries are the
 * neutral circle+initials+name badges shipped in the reference pack and
 * are never labeled or styled as if they were an official brand logo
 * (alt text says "referans işareti", not "logo").
 *
 * `variant="badge"` crops the fallback badge to just its circle+initials
 * top portion (object-position) so it reads as a compact icon next to the
 * reference's real name, which the row/list already renders as text.
 * `variant="panel"` shows the full image uncropped, including the
 * fallback badge's own baked-in name/"REFERANS" caption.
 */
export function ReferenceLogo({ reference, variant = "badge", className, sizes = "96px" }: ReferenceLogoProps) {
  const isReal = reference.logoType === "real";
  const isBadge = variant === "badge";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border",
        isBadge ? "aspect-square rounded-full" : "aspect-square rounded-[var(--radius-brand)]",
        isReal ? "border-white/15 bg-white/95" : "border-white/10 bg-[#0f1216]",
        isReal && isBadge && "p-1.5",
        isReal && !isBadge && "p-6",
        className,
      )}
    >
      <Image
        src={reference.logo}
        alt={isReal ? reference.name : `${reference.name} referans işareti`}
        fill
        sizes={sizes}
        className={cn("object-contain", !isReal && isBadge && "object-cover object-[50%_30%]")}
      />
    </div>
  );
}
