import type { Metadata } from "next";
import { BadgePercent } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Campaigns } from "@/components/sections/campaigns";
import { petraCampaigns } from "@/lib/data/petra/campaigns";
import { getCampaigns } from "@/lib/cms/adapters";
import { isCmsRow, mapCampaignRows } from "@/lib/cms/petra/mappers";
import type { CampaignRow } from "@/lib/cms/customer-types";

const PETRA_CONNECTION_KEY = "PETRA";

export const metadata: Metadata = {
  title: "Kampanyalar",
  description: "Petra Mühendislik güncel kampanyaları.",
  alternates: { canonical: "/kampanyalar" },
};

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

  if (campaigns.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Kampanyalar" title="Kampanyalar" />
        <EmptyState
          icon={BadgePercent}
          title="Şu anda aktif bir kampanyamız bulunmuyor"
          description="Güncel kampanyalarımızı yayınladığımızda burada paylaşacağız."
        />
      </>
    );
  }

  return <Campaigns headingLevel="h1" campaigns={campaigns} />;
}
