import { Snowflake, LayoutGrid, Building2, Network, Recycle, Droplets } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Faz 9.9: no image generation tool is available in this environment, so
 * solutions without a real photo (see lib/data/petra/solutions.ts —
 * `multi-split-klimalar`, `profesyonel-klimalar`, `isi-pompalari` are
 * still `image: null`, either because every AI-generated candidate
 * showed an unlicensed third-party equipment-brand logo, or because none
 * was ever supplied) get a themed icon over the existing brand-gradient
 * fallback instead of a blank tile — see components/sections/solutions.tsx
 * and app/(public)/cozumler/[slug]/page.tsx, both of which use this map.
 * Purely decorative (not a real product photo, not presented as one) —
 * this is display polish, not a substitute for the real photography this
 * still needs before launch.
 */
export const petraSolutionIcons: Record<string, LucideIcon> = {
  "split-klimalar": Snowflake,
  "multi-split-klimalar": LayoutGrid,
  "profesyonel-klimalar": Building2,
  "vrf-sistemleri": Network,
  "isi-pompalari": Recycle,
  "sicak-su-sistemleri": Droplets,
};

export const petraSolutionIconFallback: LucideIcon = Snowflake;
