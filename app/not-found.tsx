import type { Metadata } from "next";
import { getCurrentSite } from "@/lib/sites/current";
import { storeBasePath } from "@/lib/sites/registry";
import { PetraNotFound, petraNotFoundMetadata } from "@/components/sites/petra/petra-not-found";
import { PanelNotFound } from "@/components/sites/panel-not-found";
import { StoreNotFoundContent } from "@/components/sites/store-not-found-content";

/**
 * Faz 28 — kök 404 artık SİTEYE GÖRE dağıtıcı (önceden her deploy'da sabit
 * Petra 404'üydü; t46store.com'da "Sayfa Bulunamadı | Petra Mühendislik"
 * görünüyordu).
 *  - corporate (petra): Petra'nın 404'ü, birebir aynı
 *    (components/sites/petra/petra-not-found.tsx).
 *  - panel: nötr "MB Digital Boost" 404'ü, noindex.
 *  - store: normalde buraya düşülmez (proxy mağaza segmentinin 404'üne
 *    rewrite eder: app/store/[storeSlug]/not-found.tsx); düşerse yine
 *    mağaza markası, ASLA başka sitenin markası.
 * Yeni bir kurumsal site eklendiğinde buraya kendi dalı eklenir.
 */
export function generateMetadata(): Metadata {
  const site = getCurrentSite();
  if (site.kind === "corporate" && site.key === "petra") return petraNotFoundMetadata;
  return {
    title: { absolute: `Sayfa bulunamadı | ${site.displayName}` },
    robots: { index: false, follow: false },
  };
}

export default function NotFound() {
  const site = getCurrentSite();
  if (site.kind === "corporate" && site.key === "petra") return <PetraNotFound />;
  if (site.kind === "store") return <StoreNotFoundContent storeBasePath={storeBasePath(site) ?? "/"} />;
  return <PanelNotFound />;
}
