import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomerAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { getContentTypeConfig, isContentTypeKey } from "@/lib/cms/dashboard/content-types";
import { CmsUnavailableNotice } from "@/components/cms/cms-unavailable-notice";
import { CustomerCmsNav } from "@/components/navigation/customer-cms-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ContentStatus } from "@/lib/cms/customer-types";

const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: "Taslak",
  published: "Yayında",
  archived: "Arşiv",
};

/**
 * List view for one of the 6 generic content types. Sees ALL statuses
 * (draft/published/archived) — the public site only ever sees
 * `published` (enforced by that customer project's RLS, migration 0005),
 * this is the trusted editor view using the service-role connection.
 */
export default async function ContentTypeListPage({
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

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">{config.label}</h1>
        {connection ? (
          <Button href={`/dashboard/customers/${customerId}/content/${type}/new`} size="sm">
            Yeni
          </Button>
        ) : null}
      </div>

      {!connection ? (
        <div className="mt-6">
          <CmsUnavailableNotice />
        </div>
      ) : (
        <ContentTypeList customerId={customerId} type={type} />
      )}
    </div>
  );
}

async function ContentTypeList({ customerId, type }: { customerId: string; type: string }) {
  const config = getContentTypeConfig(type)!;
  const connection = await loadCustomerConnection(customerId);
  if (!connection) return null;

  // `type` is a validated ContentTypeKey at runtime, but as a plain
  // `string` parameter it's broader than postgrest-js's table-name union,
  // which collapses Row/Insert/Update inference for a dynamic `.from()`
  // call (same issue worked around in lib/cms/adapters/shared.ts during
  // Phase 5). Casting the client to `any` for this one dynamic call keeps
  // the rest of the file fully typed; rows are read field-by-field below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
  const { data, error } = await (connection.client as any)
    .from(type)
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return <p className="mt-6 text-sm text-red-600">İçerik yüklenemedi: {error.message}</p>;
  }

  if (!data || data.length === 0) {
    return <p className="mt-6 text-sm text-foreground/60">Henüz içerik yok.</p>;
  }

  return (
    <ul className="mt-6 divide-y divide-black/10 rounded-lg border border-black/10">
      {data.map((row: Record<string, unknown>) => {
        const record = row as Record<string, unknown>;
        const title = String(record[config.titleField] ?? record.id);
        const status = record.status as ContentStatus;
        return (
          <li key={String(record.id)}>
            <Link
              href={`/dashboard/customers/${customerId}/content/${type}/${record.id}`}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-black/5"
            >
              <span className="font-medium text-foreground">{title}</span>
              <span className="flex items-center gap-3 text-xs text-foreground/50">
                Sıra: {String(record.sort_order ?? 0)}
                <Badge variant={status === "published" ? "solid" : "outline"}>{STATUS_LABELS[status] ?? status}</Badge>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
