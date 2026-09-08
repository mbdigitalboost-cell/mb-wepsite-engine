import type { Metadata } from "next";
import { BadgePercent } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Campaigns } from "@/components/sections/campaigns";
import { petraCampaigns } from "@/lib/data/petra/campaigns";
import { getCampaigns } from "@/lib/cms/adapters";
import { isCmsRow, mapCampaignRows } from "@/lib/cms/petra/mappers";
import { resolveStaticPageSeo, applyHomeSeoOverrides } from "@/lib/seo/build-metadata";
import { petraBreadcrumbStructuredData } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/seo/json-ld";
import type { CampaignRow } from "@/lib/cms/customer-types";

const PETRA_CONNECTION_KEY = "PETRA";
const ROUTE_KEY = "kampanyalar";

// Faz 4G — güvenlik ağı: bkz. app/(public)/page.tsx'in aynı satırındaki
// yorum. Admin'deki anlık webhook birincil mekanizma; bu sadece arıza
// durumunda devreye giren bir üst sınır.
export const revalidate = 300;

const staticMetadata: Metadata = {
  title: "Kampanyalar",
  description: "Petra Mühendislik güncel kampanyaları.",
  alternates: { canonical: "/kampanyalar" },
};

// Faz 6F-4A-3.3: bkz. app/(public)/hakkimizda/page.tsx'in aynı satırdaki yorumu.
export async function generateMetadata(): Promise<Metadata> {
  const seo = await resolveStaticPageSeo(PETRA_CONNECTION_KEY, ROUTE_KEY);
  return applyHomeSeoOverrides(staticMetadata, seo);
}

// Phase 9.2: CMS-first, static petraCampaigns (empty by design) as
// fallback — same pattern as app/(public)/page.tsx (Phase 6 §20).
//
// Faz 9.9: empty state now uses the shared `EmptyState` (see
// components/ui/empty-state.tsx) — same component `/projeler` uses when
// it has nothing published, so the two dedicated list pages look
// consistent with each other (PHASE_9_9_RAPOR.md's "Empty state
// tutarlılığı" section).
export default async function CampaignsPage() {
  const campaignsResult = await getCampaigns(PETRA_CONNECTION_KEY, petraCampaigns);
  const campaigns = isCmsRow((campaignsResult as unknown[])[0])
    ? mapCampaignRows(campaignsResult as CampaignRow[])
    : petraCampaigns;
  // Faz SEO-5: 4 legal sayfanın ve /cozumler/[slug]'ın zaten kullandığı
  // AYNI Breadcrumb JSON-LD deseni — kampanya olsun olmasın sayfa aynı
  // hiyerarşide kaldığı için her iki return dalında da render ediliyor.
  const breadcrumbJsonLd = petraBreadcrumbStructuredData([
    { name: "Ana Sayfa", path: "/" },
    { name: "Kampanyalar", path: "/kampanyalar" },
  ]);

  if (campaigns.length === 0) {
    return (
      <>
        {breadcrumbJsonLd ? <JsonLd data={breadcrumbJsonLd} /> : null}
        <PageHeader eyebrow="Kampanyalar" title="Kampanyalar" />
        <EmptyState
          icon={BadgePercent}
          title="Şu anda aktif bir kampanyamız bulunmuyor"
          description="Güncel kampanyalarımızı yayınladığımızda burada paylaşacağız."
        />
      </>
    );
  }

  return (
    <>
      {breadcrumbJsonLd ? <JsonLd data={breadcrumbJsonLd} /> : null}
      <Campaigns headingLevel="h1" campaigns={campaigns} />
    </>
  );
}
