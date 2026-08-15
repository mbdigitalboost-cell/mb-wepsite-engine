import { requireCustomerAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { CmsUnavailableNotice } from "@/components/cms/cms-unavailable-notice";
import { CustomerCmsNav } from "@/components/navigation/customer-cms-nav";
import { SettingsForm } from "./settings-form";

/**
 * Customer-project site_settings editor — distinct from the Platform
 * `customers.name/slug` edit on the customer overview page (Phase 4).
 * This is CMS content (company name, contact info, brand tokens) that
 * lives in the CUSTOMER's own Supabase project, not the Platform one.
 */
export default async function SiteSettingsPage({
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
      <h1 className="text-xl font-semibold tracking-tight">Site Ayarları</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Doğrulanmamış alanları boş bırakın — burada girilmeyen bir değer
        public sitede uydurulmaz, mevcut statik fallback kullanılmaya devam eder.
      </p>

      {!connection ? (
        <div className="mt-6">
          <CmsUnavailableNotice />
        </div>
      ) : (
        <SiteSettingsContent customerId={customerId} />
      )}
    </div>
  );
}

async function SiteSettingsContent({ customerId }: { customerId: string }) {
  const connection = await loadCustomerConnection(customerId);
  if (!connection) return null;

  const { data: settings } = await connection.client
    .from("site_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const initialValues = {
    companyName: settings?.company_name ?? "",
    alternateName: settings?.alternate_name ?? "",
    phone: settings?.phone ?? "",
    whatsapp: settings?.whatsapp ?? "",
    email: settings?.email ?? "",
    address: settings?.address ?? "",
    serviceArea: settings?.service_area ?? "",
    workingHours: settings?.working_hours ?? "",
    logo: settings?.logo ?? "",
    logoWhite: settings?.logo_white ?? "",
    favicon: settings?.favicon ?? "",
    primaryColor: settings?.primary_color ?? "",
    secondaryColor: settings?.secondary_color ?? "",
    radius: settings?.radius ?? "",
    buttonStyle: settings?.button_style ?? "",
  };

  return (
    <div className="mt-6">
      <SettingsForm customerId={customerId} settingsId={settings?.id ?? null} initialValues={initialValues} />
    </div>
  );
}
