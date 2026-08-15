import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

/**
 * Admin-only customer list — the CRUD home for
 * "Müşteriler" in the Phase 4 spec. `/dashboard` (the role-based landing
 * page) now only shows a stats summary and links here for the full list,
 * see app/dashboard/page.tsx.
 *
 * Website counts are fetched as a separate flat query and merged in JS
 * (via a Map keyed by customer_id) rather than an embedded PostgREST
 * relationship (e.g. `websites(count)`) — deliberate, see
 * lib/supabase/server.ts comments: there's no live Supabase project yet
 * to verify embedded-query syntax against, so this sticks to querying
 * patterns already tested.
 */
export default async function CustomersPage() {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();

  const [{ data: customers, error: customersError }, { data: websites, error: websitesError }] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id, name, slug, status, created_at, updated_at")
        .order("name"),
      supabase.from("websites").select("id, customer_id"),
    ]);

  const websiteCountByCustomer = new Map<string, number>();
  for (const website of websites ?? []) {
    websiteCountByCustomer.set(
      website.customer_id,
      (websiteCountByCustomer.get(website.customer_id) ?? 0) + 1,
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Müşteriler</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Tüm MB Digital Boost müşterileri.
          </p>
        </div>
        <Button href="/dashboard/customers/new" size="sm">
          Yeni Müşteri
        </Button>
      </div>

      {customersError ? (
        <p className="mt-6 text-sm text-red-600">
          Müşteriler yüklenemedi: {customersError.message}
        </p>
      ) : websitesError ? (
        <p className="mt-6 text-sm text-red-600">
          Website sayıları yüklenemedi: {websitesError.message}
        </p>
      ) : !customers || customers.length === 0 ? (
        <p className="mt-6 text-sm text-foreground/60">
          Henüz kayıtlı müşteri yok. Sağ üstteki &quot;Yeni Müşteri&quot; ile ilk
          müşteriyi oluşturun.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-black/10 rounded-lg border border-black/10">
          {customers.map((customer) => (
            <li key={customer.id}>
              <Link
                href={`/dashboard/customers/${customer.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-black/5"
              >
                <div>
                  <p className="font-medium text-foreground">{customer.name}</p>
                  <p className="text-xs text-foreground/50">/{customer.slug}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-foreground/50">
                    {websiteCountByCustomer.get(customer.id) ?? 0} website
                  </span>
                  <StatusBadge status={customer.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
