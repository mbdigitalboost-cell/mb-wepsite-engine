import { notFound } from "next/navigation";
import { requireCustomerAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { CmsUnavailableNotice } from "@/components/cms/cms-unavailable-notice";
import { CustomerCmsNav } from "@/components/navigation/customer-cms-nav";
import { NavigationForm } from "../navigation-form";
import { NavigationStatusButtons } from "../status-buttons";
import { updateNavigationItemAction, deleteNavigationItemAction } from "../actions";

export default async function EditNavigationItemPage({
  params,
}: {
  params: Promise<{ customerId: string; itemId: string }>;
}) {
  const { customerId, itemId } = await params;
  await requireCustomerAccess(customerId);
  const connection = await loadCustomerConnection(customerId);

  if (!connection) {
    return (
      <div>
        <CustomerCmsNav customerId={customerId} />
        <CmsUnavailableNotice />
      </div>
    );
  }

  const { data } = await connection.client.from("navigation_items").select("*").eq("id", itemId).maybeSingle();
  if (!data) notFound();

  return (
    <div>
      <CustomerCmsNav customerId={customerId} />
      <h1 className="text-xl font-semibold tracking-tight">Menü Öğesi Düzenle</h1>

      <div className="mt-4">
        <NavigationStatusButtons customerId={customerId} itemId={itemId} currentStatus={data.status} />
      </div>

      <div className="mt-6">
        <NavigationForm
          initialLabel={data.label}
          initialHref={data.href}
          initialSortOrder={data.sort_order}
          action={updateNavigationItemAction.bind(null, customerId, itemId)}
          submitLabel="Değişiklikleri Kaydet"
        />
      </div>

      <form action={deleteNavigationItemAction.bind(null, customerId, itemId)} className="mt-6 border-t border-black/10 pt-6">
        <button type="submit" className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
          Menü Öğesini Sil
        </button>
      </form>
    </div>
  );
}
