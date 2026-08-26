import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomerAccess } from "@/lib/auth/require-customer-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

/**
 * A single customer's store list — today always 0 or 1 rows (one
 * customer = one store, per current scope), but rendered as a real list
 * (not a hardcoded "the store") so the multi-store future noted in
 * PHASE_2_FINAL_ARCHITECTURE_PLAN.md §B doesn't require rewriting this
 * page later. Read access follows `requireCustomerAccess` (store_viewer+
 * sees this, same as the rest of the customer's dashboard area) —
 * creation is still admin-only, via /dashboard/stores/new.
 */
export default async function CustomerStoresPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const { isAdmin } = await requireCustomerAccess(customerId);

  const supabase = await createSupabaseServerClient();
  const { data: customer } = await supabase.from("customers").select("id, name").eq("id", customerId).maybeSingle();
  if (!customer) notFound();

  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, name, slug, status")
    .eq("customer_id", customerId)
    .order("name");

  return (
    <div>
      <Link
        href={`/dashboard/customers/${customerId}`}
        className="text-xs text-foreground/50 hover:text-foreground hover:underline"
      >
        ← {customer.name}
      </Link>

      <div className="mt-2 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Mağazalar</h1>
        {isAdmin ? (
          <Button href="/dashboard/stores/new" size="sm" variant="outline">
            Yeni Mağaza
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-6 text-sm text-red-600">Mağazalar yüklenemedi: {error.message}</p>
      ) : !stores || stores.length === 0 ? (
        <p className="mt-6 text-sm text-foreground/60">Bu müşterinin henüz mağazası yok.</p>
      ) : (
        <ul className="mt-6 divide-y divide-black/10 rounded-lg border border-black/10">
          {stores.map((store) => (
            <li key={store.id}>
              <Link
                href={`/dashboard/customers/${customerId}/stores/${store.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-brand-accent/5"
              >
                <div>
                  <p className="font-medium text-foreground">{store.name}</p>
                  <p className="text-xs text-foreground/50">/{store.slug}</p>
                </div>
                <StatusBadge status={store.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
