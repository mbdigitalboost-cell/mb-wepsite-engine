import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/ui/reveal";
import { Campaigns } from "@/components/sections/campaigns";
import { petraCampaigns } from "@/lib/data/petra/campaigns";
import { getCampaigns } from "@/lib/cms/adapters";
import { isCmsRow, mapCampaignRows } from "@/lib/cms/petra/mappers";
import type { NamedContentRow } from "@/lib/cms/customer-types";

const PETRA_CONNECTION_KEY = "PETRA";

export const metadata: Metadata = {
  title: "Kampanyalar",
  description: "Petra Mühendislik güncel kampanyaları.",
  alternates: { canonical: "/kampanyalar" },
};

// Phase 9.2: CMS-first, static petraCampaigns (empty by design) as
// fallback — same pattern as app/(public)/page.tsx (Phase 6 §20).
export default async function CampaignsPage() {
  const campaignsResult = await getCampaigns(PETRA_CONNECTION_KEY, petraCampaigns);
  const campaigns = isCmsRow((campaignsResult as unknown[])[0])
    ? mapCampaignRows(campaignsResult as NamedContentRow[])
    : petraCampaigns;

  if (campaigns.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Kampanyalar" title="Kampanyalar" />
        <section className="pb-24 lg:pb-32">
          <Container>
            <Reveal>
              <div className="rounded-[var(--radius-brand)] border border-dashed border-white/15 p-12 text-center">
                <p className="text-sm text-brand-muted">Şu anda aktif bir kampanyamız bulunmuyor.</p>
              </div>
            </Reveal>
          </Container>
        </section>
      </>
    );
  }

  return <Campaigns headingLevel="h1" campaigns={campaigns} />;
}
