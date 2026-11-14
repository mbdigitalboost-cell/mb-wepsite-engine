import { notFound } from "next/navigation";

/**
 * Faz 28 — mağaza segmentinin catch-all'ı. İki iş görür:
 *  1. /store/<slug>/eslesmeyen-yol artık kök (Petra) 404'üne değil, bu
 *     segmentin not-found.tsx'ine düşer (mağaza header/footer'ı ile).
 *  2. proxy.ts mağaza sitesinde izinsiz her yolu (ör. /iletisim) buraya
 *     `/store/<slug>/__404` olarak rewrite eder (lib/sites/route-policy.ts).
 * notFound() yayın (stream) başlamadan atıldığı için HTTP durumu gerçekten 404.
 */
export default function UnknownStorePath(): never {
  notFound();
}
