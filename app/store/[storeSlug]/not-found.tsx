import type { Metadata } from "next";
import { getCurrentSite } from "@/lib/sites/current";
import { storeBase } from "@/lib/sites/store-href";
import { StoreNotFoundContent } from "@/components/sites/store-not-found-content";

/**
 * Faz 28 — mağaza segmentinin 404'ü (önceden yoktu: notFound() kökteki
 * Petra 404'üne düşüyor, mağaza header'ının altında "Sayfa Bulunamadı |
 * Petra Mühendislik" görünüyordu — canlıda doğrulandı). not-found params
 * almaz; mağaza yolu bu deploy'un sitesinden (SITE_KEY) gelir — panel
 * /store/**'u zaten mağazanın kendi domainine 308'ler.
 */
export function generateMetadata(): Metadata {
  const site = getCurrentSite();
  return {
    title: { absolute: `Sayfa bulunamadı | ${site.displayName}` },
    robots: { index: false, follow: true },
  };
}

export default function StoreNotFound() {
  const site = getCurrentSite();
  return <StoreNotFoundContent storeBasePath={site.storeSlug ? storeBase(site.storeSlug) : ""} />;
}
