import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Globe, CheckCircle2 } from "lucide-react";
import { loadRoleContext } from "@/lib/auth/require-role";
import { resolveDashboardHome, storeUserHomeHref } from "@/lib/auth/dashboard-home";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/ui/stat-card";

/**
 * The dashboard's role-based home. Not admin-only and not
 * customer-only — it renders differently depending on who's looking:
 *
 *  - Admin: a stats overview (customer / website / active-website
 *    counts, matching the Phase 4 mockup) with a link into the full
 *    customer list at /dashboard/customers. Counts use
 *    `{count: "exact", head: true}` so this stays cheap even as the
 *    number of rows grows — no row data is fetched just to count it.
 *  - Store user (store_admin / store_editor / store_viewer, via
 *    `isStoreRole`) bound to exactly one customer: redirected straight to
 *    that customer's only store panel
 *    (`/dashboard/customers/[customerId]/stores/[storeId]`), or to the
 *    customer page if the customer has zero or several stores. Faz 36:
 *    this used to compare the raw legacy `"customer"` role, so real
 *    `store_admin` users fell through to "Erişim Bekleniyor".
 *  - Customer with more than one (future-proofing — not possible with
 *    today's data, but the schema allows a user to belong to more than
 *    one customer): a small picker instead of an automatic redirect.
 *  - No membership row at all yet (e.g. just accepted an invite, admin
 *    hasn't linked them to a customer): a plain "waiting for access"
 *    message, not an empty dashboard that looks broken.
 */
export default async function DashboardOverviewPage() {
  const { memberships } = await loadRoleContext();
  const home = resolveDashboardHome(memberships);

  if (home.kind === "admin") {
    const supabase = await createSupabaseServerClient();
    const [customerCount, websiteCount, activeWebsiteCount] = await Promise.all([
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase.from("websites").select("id", { count: "exact", head: true }),
      supabase
        .from("websites")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
    ]);

    return (
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Admin olarak platform genelindeki özet bilgileri görüyorsunuz.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Müşteri" value={customerCount.count ?? 0} icon={Users} />
          <StatCard label="Website" value={websiteCount.count ?? 0} icon={Globe} />
          <StatCard label="Aktif Website" value={activeWebsiteCount.count ?? 0} icon={CheckCircle2} />
        </div>

        <Link
          href="/dashboard/customers"
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-brand-accent underline-offset-2 hover:underline"
        >
          Tüm müşterileri görüntüle →
        </Link>
      </div>
    );
  }

  if (home.kind === "single-customer") {
    // RLS: mağaza kullanıcısı yalnız kendi müşterisinin mağazalarını görür.
    const supabase = await createSupabaseServerClient();
    const { data: stores } = await supabase
      .from("stores")
      .select("id")
      .eq("customer_id", home.customerId);
    redirect(storeUserHomeHref(home.customerId, (stores ?? []).map((store) => store.id)));
  }

  if (home.kind === "pick-customer") {
    const supabase = await createSupabaseServerClient();
    const { data: customers } = await supabase.from("customers").select("id, name").in("id", home.customerIds);
    const nameById = new Map((customers ?? []).map((customer) => [customer.id, customer.name]));

    return (
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Web Siteleriniz</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Birden fazla müşteriye bağlısınız, birini seçin.
        </p>
        <ul className="mt-6 divide-y divide-black/10 rounded-lg border border-black/10">
          {home.customerIds.map((customerId) => (
            <li key={customerId}>
              <Link
                href={`/dashboard/customers/${customerId}`}
                className="block px-4 py-3 text-sm hover:bg-black/5"
              >
                {nameById.get(customerId) ?? customerId}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Erişim Bekleniyor</h1>
      <p className="mt-2 text-sm text-foreground/60">
        Hesabınız henüz bir müşteriye bağlanmadı. Yöneticinizin sizi bir
        müşteriye eklemesini bekleyin.
      </p>
    </div>
  );
}
