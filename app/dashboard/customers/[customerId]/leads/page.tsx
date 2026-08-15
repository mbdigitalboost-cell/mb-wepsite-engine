import { requireCustomerAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { CmsUnavailableNotice } from "@/components/cms/cms-unavailable-notice";
import { CustomerCmsNav } from "@/components/navigation/customer-cms-nav";
import { formatDateTimeTr } from "@/lib/utils/format-date";
import { LeadStatusSelect } from "./lead-status-select";

export default async function LeadsPage({
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
      <h1 className="text-xl font-semibold tracking-tight">Talepler (Leads)</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Public keşif formu bu tabloya kaydediyor (app/api/forms/discovery-request/route.ts →
        lib/leads/submit-discovery-request.ts, service-role client ile) — bkz. PHASE_9_5_RAPOR.md.
      </p>

      {!connection ? (
        <div className="mt-6">
          <CmsUnavailableNotice />
        </div>
      ) : (
        <LeadsContent customerId={customerId} />
      )}
    </div>
  );
}

async function LeadsContent({ customerId }: { customerId: string }) {
  const connection = await loadCustomerConnection(customerId);
  if (!connection) return null;

  const { data: leads, error } = await connection.client
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="mt-6 text-sm text-red-600">Yüklenemedi: {error.message}</p>;
  }

  if (!leads || leads.length === 0) {
    return <p className="mt-6 text-sm text-foreground/60">Henüz talep yok.</p>;
  }

  return (
    <ul className="mt-6 divide-y divide-black/10 rounded-lg border border-black/10">
      {leads.map((lead) => (
        <li key={lead.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
          <div>
            <p className="font-medium text-foreground">{lead.name}</p>
            <p className="text-xs text-foreground/50">
              {[lead.phone, lead.email].filter(Boolean).join(" · ") || "—"}
              {lead.source ? ` · ${lead.source}` : ""}
            </p>
            {lead.message ? <p className="mt-1 max-w-md text-xs text-foreground/60">{lead.message}</p> : null}
            <p className="mt-1 text-xs text-foreground/40">{formatDateTimeTr(lead.created_at)}</p>
          </div>
          <LeadStatusSelect customerId={customerId} leadId={lead.id} currentStatus={lead.status} />
        </li>
      ))}
    </ul>
  );
}
