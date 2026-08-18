import { notFound } from "next/navigation";
import { requireCustomerAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { getContentTypeConfig, isContentTypeKey } from "@/lib/cms/dashboard/content-types";
import { CmsUnavailableNotice } from "@/components/cms/cms-unavailable-notice";
import { CustomerCmsNav } from "@/components/navigation/customer-cms-nav";
import { ContentForm } from "../content-form";
import { createContentItemAction } from "../actions";

export default async function NewContentItemPage({
  params,
}: {
  params: Promise<{ customerId: string; type: string }>;
}) {
  const { customerId, type } = await params;
  if (!isContentTypeKey(type)) notFound();
  const config = getContentTypeConfig(type)!;

  await requireCustomerAccess(customerId);
  const connection = await loadCustomerConnection(customerId);

  return (
    <div>
      <CustomerCmsNav customerId={customerId} />
      <h1 className="text-xl font-semibold tracking-tight">Yeni {config.label.replace(/lar$|ler$/, "")}</h1>

      {!connection ? (
        <div className="mt-6">
          <CmsUnavailableNotice />
        </div>
      ) : (
        <div className="mt-6">
          <ContentForm
            customerId={customerId}
            imageFolder={config.imageFolder}
            fields={config.fields}
            action={createContentItemAction.bind(null, customerId, type)}
            submitLabel="Taslak Olarak Oluştur"
          />
        </div>
      )}
    </div>
  );
}
