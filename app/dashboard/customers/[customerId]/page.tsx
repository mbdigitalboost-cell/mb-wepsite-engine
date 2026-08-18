import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomerAccess } from "@/lib/auth/require-customer-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { formatDateTr, formatDateTimeTr } from "@/lib/utils/format-date";
import { auditActionLabel } from "@/lib/audit/action-labels";
import { EditCustomerForm } from "./edit-customer-form";
import { setCustomerStatusAction } from "../actions";
import { CustomerCmsNav } from "@/components/navigation/customer-cms-nav";

/**
 * A single customer's scoped area. Admins get full CRUD (edit, websites
 * list + management, status toggle, recent audit log); a customer user
 * sees a read-only view of their own customer's Platform-level fields
 * only — no cross-customer data is fetched for them at all (not just
 * hidden in the UI), since `requireCustomerAccess` + RLS already scope
 * every query below to what this session is allowed to see.
 *
 * Note on scope: this page only shows fields that live in the PLATFORM
 * project (name, slug, status, websites, timestamps). Things like
 * service area / city / address belong to that customer's own future
 * Supabase project (site_settings) — Phase 5+, not available here.
 */
export default async function CustomerOverviewPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const { isAdmin } = await requireCustomerAccess(customerId);

  const supabase = await createSupabaseServerClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, slug, status, created_at, updated_at")
    .eq("id", customerId)
    .maybeSingle();

  if (!customer) {
    notFound();
  }

  const { data: websites } = await supabase
    .from("websites")
    .select("id, name, slug, domain, status")
    .eq("customer_id", customerId)
    .order("name");

  let auditEntries: { id: string; action: string; created_at: string; actorLabel: string }[] = [];
  if (isAdmin) {
    const { data: logs } = await supabase
      .from("audit_logs")
      .select("id, action, user_id, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(10);

    const userIds = [...new Set((logs ?? []).map((log) => log.user_id).filter((id): id is string => Boolean(id)))];
    const profilesById = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, email, full_name").in("id", userIds);
      for (const profile of profiles ?? []) {
        profilesById.set(profile.id, profile.full_name ?? profile.email);
      }
    }

    auditEntries = (logs ?? []).map((log) => ({
      id: log.id,
      action: log.action,
      created_at: log.created_at,
      actorLabel: log.user_id ? (profilesById.get(log.user_id) ?? "Bilinmeyen kullanıcı") : "Sistem",
    }));
  }

  const nextStatus = customer.status === "active" ? "inactive" : "active";
  const toggleStatus = setCustomerStatusAction.bind(null, customerId, nextStatus);

  return (
    <div>
      <CustomerCmsNav customerId={customerId} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {isAdmin ? <p className="text-xs font-medium text-foreground/50">Admin görünümü</p> : null}
          <h1 className="text-xl font-semibold tracking-tight">{customer.name}</h1>
          <p className="mt-1 text-xs text-foreground/50">/{customer.slug}</p>
        </div>
        <StatusBadge status={customer.status} />
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-foreground/50">Oluşturulma</dt>
          <dd>{formatDateTr(customer.created_at)}</dd>
        </div>
        <div>
          <dt className="text-foreground/50">Son Güncelleme</dt>
          <dd>{formatDateTr(customer.updated_at)}</dd>
        </div>
      </dl>

      {isAdmin ? (
        <form action={toggleStatus} className="mt-4">
          <button
            type="submit"
            className="text-sm text-foreground/60 underline-offset-2 hover:text-foreground hover:underline"
          >
            {customer.status === "active" ? "Pasifleştir" : "Aktifleştir"}
          </button>
        </form>
      ) : null}

      <div className="mt-8 border-t border-black/10 pt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight">Web Siteleri</h2>
          {isAdmin ? (
            <Button href={`/dashboard/customers/${customerId}/websites/new`} size="sm" variant="outline">
              Yeni Website
            </Button>
          ) : null}
        </div>

        {!websites || websites.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/60">Henüz web sitesi yok.</p>
        ) : (
          <ul className="mt-3 divide-y divide-black/10 rounded-lg border border-black/10">
            {websites.map((website) => {
              const row = (
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{website.name}</p>
                    <p className="text-xs text-foreground/50">{website.domain ?? `/${website.slug}`}</p>
                  </div>
                  <StatusBadge status={website.status} />
                </div>
              );
              return (
                <li key={website.id}>
                  {isAdmin ? (
                    <Link
                      href={`/dashboard/customers/${customerId}/websites/${website.id}`}
                      className="block hover:bg-brand-accent/5"
                    >
                      {row}
                    </Link>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isAdmin ? (
        <div className="mt-8 border-t border-black/10 pt-6">
          <h2 className="text-sm font-semibold tracking-tight">Müşteri Bilgilerini Düzenle</h2>
          <div className="mt-4">
            <EditCustomerForm customerId={customerId} initialValues={{ name: customer.name, slug: customer.slug }} />
          </div>
        </div>
      ) : null}

      {isAdmin ? (
        <div className="mt-8 border-t border-black/10 pt-6">
          <h2 className="text-sm font-semibold tracking-tight">Son İşlemler</h2>
          {auditEntries.length === 0 ? (
            <p className="mt-3 text-sm text-foreground/60">Henüz kayıtlı işlem yok.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {auditEntries.map((entry) => (
                <li key={entry.id} className="text-foreground/70">
                  <span className="font-medium text-foreground">{entry.actorLabel}</span>
                  {" → "}
                  {customer.name}
                  {" → "}
                  {auditActionLabel(entry.action)}
                  {" → "}
                  <span className="text-foreground/50">{formatDateTimeTr(entry.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
