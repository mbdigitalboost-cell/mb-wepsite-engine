import { requireCustomerAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { CmsUnavailableNotice } from "@/components/cms/cms-unavailable-notice";
import { CustomerCmsNav } from "@/components/navigation/customer-cms-nav";
import { NavigationForm } from "../navigation-form";
import { createNavigationItemAction } from "../actions";

export default async function NewNavigationItemPage({
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
      <h1 className="text-xl font-semibold tracking-tight">Yeni Menü Öğesi</h1>

      {!connection ? (
        <div className="mt-6">
          <CmsUnavailableNotice />
        </div>
      ) : (
        <div className="mt-6">
          <NavigationForm
            action={createNavigationItemAction.bind(null, customerId)}
            submitLabel="Taslak Olarak Oluştur"
          />
        </div>
      )}
    </div>
  );
}
