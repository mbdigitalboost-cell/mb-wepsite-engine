import { requireCustomerAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { CmsUnavailableNotice } from "@/components/cms/cms-unavailable-notice";
import { CustomerCmsNav } from "@/components/navigation/customer-cms-nav";
import { HeroForm } from "./hero-form";
import { HeroStatusButtons } from "./hero-status-buttons";
import type { ContentStatus } from "@/lib/cms/customer-types";

export default async function HeroContentPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  await requireCustomerAccess(customerId);
  const connection = await loadCustomerConnection(customerId);

  return (
    <div>
      <CustomerCmsNav customerId={customerId} />
      <h1 className="text-xl font-semibold tracking-tight">Hero</h1>
      <p className="mt-1 text-sm text-foreground/60">Site geneli (page_id boş) hero içeriği.</p>

      {!connection ? (
        <div className="mt-6">
          <CmsUnavailableNotice />
        </div>
      ) : (
        <HeroContent customerId={customerId} />
      )}
    </div>
  );
}

async function HeroContent({ customerId }: { customerId: string }) {
  const connection = await loadCustomerConnection(customerId);
  if (!connection) return null;

  const { data: hero } = await connection.client
    .from("hero_sections")
    .select("*")
    .is("page_id", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const initialValues = {
    heading: hero?.heading ?? "",
    subtext: hero?.subtext ?? "",
    ctaPrimaryLabel: hero?.cta_primary_label ?? "",
    ctaPrimaryHref: hero?.cta_primary_href ?? "",
    ctaSecondaryLabel: hero?.cta_secondary_label ?? "",
    ctaSecondaryHref: hero?.cta_secondary_href ?? "",
    backgroundImage: hero?.background_image ?? "",
  };

  return (
    <div className="mt-6">
      {hero ? (
        <div className="mb-4">
          <HeroStatusButtons
            customerId={customerId}
            heroId={hero.id}
            currentStatus={hero.status as ContentStatus}
          />
        </div>
      ) : (
        <p className="mb-4 text-sm text-foreground/60">Henüz kaydedilmiş hero yok — ilk kaydınız taslak olarak oluşturulacak.</p>
      )}
      <HeroForm customerId={customerId} heroId={hero?.id ?? null} initialValues={initialValues} />
    </div>
  );
}
