import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/ui/reveal";
import { Campaigns } from "@/components/sections/campaigns";
import { petraCampaigns } from "@/lib/data/petra/campaigns";

export const metadata: Metadata = {
  title: "Kampanyalar",
  description: "Petra Mühendislik güncel kampanyaları.",
  alternates: { canonical: "/kampanyalar" },
};

export default function CampaignsPage() {
  if (petraCampaigns.length === 0) {
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

  return <Campaigns headingLevel="h1" />;
}
