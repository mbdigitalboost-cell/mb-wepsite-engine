import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/status-badge";

/**
 * Cross-customer website list — admin-only, since a customer user only
 * ever has one thing to look at (their own, via
 * /dashboard/customers/[customerId]) and shouldn't see everyone else's.
 * `requireAdmin()` enforces this server-side regardless of whether the
 * nav link is visible — see components/navigation/dashboard-nav.tsx.
 *
 * Actual creation/editing happens nested under a customer
 * (/dashboard/customers/[customerId]/websites/...) since every website
 * must belong to exactly one customer — this page is a flat read-only
 * index across all of them, with the customer name merged in from a
 * separate flat query (same pattern as app/dashboard/customers/page.tsx).
 */
export default async function DashboardWebsitesPage() {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const [{ data: websites, error: websitesError }, { data: customers, error: customersError }] =
    await Promise.all([
      supabase
        .from("websites")
        .select("id, customer_id, name, slug, domain, status, supabase_connection_key")
        .order("name"),
      supabase.from("customers").select("id, name"),
    ]);

  const customerNameById = new Map((customers ?? []).map((customer) => [customer.id, customer.name]));

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Web Siteleri</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Tüm müşterilerin web siteleri. Oluşturmak için ilgili müşteri sayfasına gidin.
      </p>

      {websitesError ? (
        <p className="mt-6 text-sm text-red-600">Websiteler yüklenemedi: {websitesError.message}</p>
      ) : customersError ? (
        <p className="mt-6 text-sm text-red-600">Müşteriler yüklenemedi: {customersError.message}</p>
      ) : !websites || websites.length === 0 ? (
        <p className="mt-6 text-sm text-foreground/60">Henüz kayıtlı website yok.</p>
      ) : (
        <ul className="mt-6 divide-y divide-black/10 rounded-lg border border-black/10">
          {websites.map((website) => (
            <li key={website.id}>
              <Link
                href={`/dashboard/customers/${website.customer_id}/websites/${website.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-black/5"
              >
                <div>
                  <p className="font-medium text-foreground">{website.name}</p>
                  <p className="text-xs text-foreground/50">
                    {customerNameById.get(website.customer_id) ?? "Bilinmeyen müşteri"}
                    {website.domain ? ` · ${website.domain}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-foreground/40">
                    {website.supabase_connection_key}
                  </span>
                  <StatusBadge status={website.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
