import { requireCustomerAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { CmsUnavailableNotice } from "@/components/cms/cms-unavailable-notice";
import { CustomerCmsNav } from "@/components/navigation/customer-cms-nav";
import { TrackingForm } from "./tracking-form";

export default async function TrackingPage({
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
      <h1 className="text-xl font-semibold tracking-tight">Tracking</h1>

      {!connection ? (
        <div className="mt-6">
          <CmsUnavailableNotice />
        </div>
      ) : (
        <TrackingContent customerId={customerId} />
      )}
    </div>
  );
}

async function TrackingContent({ customerId }: { customerId: string }) {
  const connection = await loadCustomerConnection(customerId);
  if (!connection) return null;

  // Selects meta_capi_token too (service-role bypasses RLS — this is the
  // trusted editor, not the public path) ONLY to compute `hasToken`
  // below; the value itself is never spread into what's passed to the
  // Client Component.
  const { data: tracking } = await connection.client
    .from("tracking_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  const initialValues = {
    ga4Id: tracking?.ga4_id ?? "",
    gtmId: tracking?.gtm_id ?? "",
    metaPixelId: tracking?.meta_pixel_id ?? "",
    metaCapiEnabled: tracking?.meta_capi_enabled ?? false,
  };

  return (
    <div className="mt-6">
      <TrackingForm
        customerId={customerId}
        trackingId={tracking?.id ?? null}
        initialValues={initialValues}
        hasToken={Boolean(tracking?.meta_capi_token)}
      />
    </div>
  );
}
