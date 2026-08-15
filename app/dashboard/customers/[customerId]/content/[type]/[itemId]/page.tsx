import { notFound } from "next/navigation";
import { requireCustomerAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { getContentTypeConfig, isContentTypeKey } from "@/lib/cms/dashboard/content-types";
import { CmsUnavailableNotice } from "@/components/cms/cms-unavailable-notice";
import { CustomerCmsNav } from "@/components/navigation/customer-cms-nav";
import { ContentForm } from "../content-form";
import { StatusButtons } from "../status-buttons";
import { updateContentItemAction } from "../actions";
import type { ContentStatus } from "@/lib/cms/customer-types";

export default async function EditContentItemPage({
  params,
}: {
  params: Promise<{ customerId: string; type: string; itemId: string }>;
}) {
  const { customerId, type, itemId } = await params;
  if (!isContentTypeKey(type)) notFound();
  const config = getContentTypeConfig(type)!;

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

  const { data } = await connection.client.from(type).select("*").eq("id", itemId).maybeSingle();
  if (!data) notFound();

  const record = data as Record<string, unknown>;
  const initialValues: Record<string, string> = {};
  for (const field of config.fields) {
    initialValues[field.key] = record[field.key] == null ? "" : String(record[field.key]);
  }

  return (
    <div>
      <CustomerCmsNav customerId={customerId} />
      <h1 className="text-xl font-semibold tracking-tight">
        {config.label.replace(/lar$|ler$/, "")} Düzenle
      </h1>

      <div className="mt-4">
        <StatusButtons
          customerId={customerId}
          type={type}
          itemId={itemId}
          currentStatus={record.status as ContentStatus}
        />
      </div>

      <div className="mt-6">
        <ContentForm
          fields={config.fields}
          initialValues={initialValues}
          initialSortOrder={Number(record.sort_order ?? 0)}
          action={updateContentItemAction.bind(null, customerId, type, itemId)}
          submitLabel="Değişiklikleri Kaydet"
        />
      </div>
    </div>
  );
}
