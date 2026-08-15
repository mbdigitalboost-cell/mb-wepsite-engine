import Link from "next/link";
import { redirect } from "next/navigation";
import { loadRoleContext } from "@/lib/auth/require-role";
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
 *  - Customer with exactly one customer_users row: redirected straight
 *    to their own `/dashboard/customers/[customerId]` — they never see
 *    a list, because there's only ever one thing for them to see.
 *  - Customer with more than one (future-proofing — not possible with
 *    today's data, but the schema allows a user to belong to more than
 *    one customer): a small picker instead of an automatic redirect.
 *  - No membership row at all yet (e.g. just accepted an invite, admin
 *    hasn't linked them to a customer): a plain "waiting for access"
 *    message, not an empty dashboard that looks broken.
 */
export default async function DashboardOverviewPage() {
  const { isAdmin, memberships } = await loadRoleContext();

  if (isAdmin) {
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
          <StatCard label="Müşteri" value={customerCount.count ?? 0} />
          <StatCard label="Website" value={websiteCount.count ?? 0} />
          <StatCard label="Aktif Website" value={activeWebsiteCount.count ?? 0} />
        </div>

        <Link
          href="/dashboard/customers"
          className="mt-6 inline-block text-sm text-foreground/60 underline-offset-2 hover:text-foreground hover:underline"
        >
          Tüm müşterileri görüntüle →
        </Link>
      </div>
    );
  }

  const customerMemberships = memberships.filter(
    (membership) => membership.role === "customer" && membership.customerId,
  );

  if (customerMemberships.length === 1) {
    redirect(`/dashboard/customers/${customerMemberships[0].customerId}`);
  }

  if (customerMemberships.length > 1) {
    return (
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Web Siteleriniz</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Birden fazla müşteriye bağlısınız, birini seçin.
        </p>
        <ul className="mt-6 divide-y divide-black/10 rounded-lg border border-black/10">
          {customerMemberships.map((membership) => (
            <li key={membership.customerId}>
              <Link
                href={`/dashboard/customers/${membership.customerId}`}
                className="block px-4 py-3 text-sm hover:bg-black/5"
              >
                {membership.customerId}
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
