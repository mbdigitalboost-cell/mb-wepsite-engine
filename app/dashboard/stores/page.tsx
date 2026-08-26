import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

/**
 * PHASE 2 — cross-customer Stores list, admin-only. Mirrors
 * app/dashboard/websites/page.tsx exactly: flat read-only index, customer
 * name merged in from a separate flat query. Creation happens on
 * /dashboard/stores/new (customer chosen there via dropdown), not nested
 * under a customer route — see PHASE_2_FINAL_ARCHITECTURE_PLAN.md §B.
 */
export default async function DashboardStoresPage() {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const [{ data: stores, error: storesError }, { data: customers, error: customersError }] = await Promise.all([
    supabase.from("stores").select("id, customer_id, name, slug, status").order("name"),
    supabase.from("customers").select("id, name"),
  ]);

  const customerNameById = new Map((customers ?? []).map((customer) => [customer.id, customer.name]));

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Mağazalar</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Tüm müşterilerin mağazaları. Oluşturmak için sağ üstteki &quot;Yeni Mağaza&quot;yı kullanın.
          </p>
        </div>
        <Button href="/dashboard/stores/new" size="sm">
          Yeni Mağaza
        </Button>
      </div>

      {storesError ? (
        <p className="mt-6 text-sm text-red-600">Mağazalar yüklenemedi: {storesError.message}</p>
      ) : customersError ? (
        <p className="mt-6 text-sm text-red-600">Müşteriler yüklenemedi: {customersError.message}</p>
      ) : !stores || stores.length === 0 ? (
        <p className="mt-6 text-sm text-foreground/60">
          Henüz kayıtlı mağaza yok. Sağ üstteki &quot;Yeni Mağaza&quot; ile ilk mağazayı oluşturun.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-black/10 rounded-lg border border-black/10">
          {stores.map((store) => (
            <li key={store.id}>
              <Link
                href={`/dashboard/customers/${store.customer_id}/stores/${store.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-brand-accent/5"
              >
                <div>
                  <p className="font-medium text-foreground">{store.name}</p>
                  <p className="text-xs text-foreground/50">
                    {customerNameById.get(store.customer_id) ?? "Bilinmeyen müşteri"} · /{store.slug}
                  </p>
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
