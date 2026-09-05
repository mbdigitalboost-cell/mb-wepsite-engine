import Link from "next/link";
import { requireCustomerAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
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

export default async function NavigationListPage({
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

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Menü</h1>
        {connection ? (
          <Button href={`/dashboard/customers/${customerId}/navigation/new`} size="sm">
            Yeni
          </Button>
        ) : null}
      </div>

      {!connection ? (
        <div className="mt-6">
          <CmsUnavailableNotice />
        </div>
      ) : (
        <NavigationList customerId={customerId} />
      )}
    </div>
  );
}

async function NavigationList({ customerId }: { customerId: string }) {
  const connection = await loadCustomerConnection(customerId);
  if (!connection) return null;

  const { data, error } = await connection.client
    .from("navigation_items")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return <p className="mt-6 text-sm text-red-600">Menü yüklenemedi: {error.message}</p>;
  }

  if (!data || data.length === 0) {
    return (
      <p className="mt-6 text-sm text-foreground/60">
        Henüz menü öğesi yok. Public sitede mevcut sabit menü (lib/data/petra/navigation.ts) gösterilmeye devam ediyor.
      </p>
    );
  }

  return (
    <ul className="mt-6 divide-y divide-black/10 rounded-lg border border-black/10">
      {data.map((item) => (
        <li key={item.id}>
          <Link
            href={`/dashboard/customers/${customerId}/navigation/${item.id}`}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-brand-accent/5"
          >
            <span>
              <span className="font-medium text-foreground">{item.label}</span>{" "}
              <span className="text-foreground/50">{item.href}</span>
            </span>
            <span className="flex items-center gap-3 text-xs text-foreground/50">
              Sıra: {item.sort_order}
              <Badge variant={item.status === "published" ? "solid" : "outline"}>{STATUS_LABELS[item.status]}</Badge>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
