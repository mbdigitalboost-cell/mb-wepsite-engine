import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InviteForm } from "./invite-form";
import { RoleForm } from "./role-form";

/**
 * Admin-only user list + invite form. Three separate flat queries merged
 * in JS (customer_users, profiles, customers) rather than an embedded
 * PostgREST relationship — same reasoning as app/dashboard/customers/page.tsx.
 * `.in("id", ids)` calls guard against an empty id array (Supabase/PostgREST
 * treats `in.()` as an error, not "match nothing"), so each guards with a
 * length check first.
 */
export default async function UsersPage() {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();

  const [{ data: memberships, error: membershipsError }, { data: customers, error: customersError }] =
    await Promise.all([
      supabase
        .from("customer_users")
        .select("id, user_id, role, customer_id, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("customers").select("id, name").order("name"),
    ]);

  const userIds = [...new Set((memberships ?? []).map((membership) => membership.user_id))];
  let profilesById = new Map<string, { email: string; fullName: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);
    profilesById = new Map(
      (profiles ?? []).map((profile) => [profile.id, { email: profile.email, fullName: profile.full_name }]),
    );
  }

  const customersById = new Map((customers ?? []).map((customer) => [customer.id, customer.name]));

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Kullanıcılar</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Platforma erişimi olan tüm kullanıcılar ve rolleri.
      </p>

      <div className="mt-6 rounded-lg border border-black/10 p-5">
        <h2 className="text-sm font-semibold tracking-tight">Kullanıcı Davet Et</h2>
        <div className="mt-4">
          <InviteForm customers={customers ?? []} />
        </div>
      </div>

      <div className="mt-8">
        {membershipsError ? (
          <p className="text-sm text-red-600">Kullanıcılar yüklenemedi: {membershipsError.message}</p>
        ) : customersError ? (
          <p className="text-sm text-red-600">Müşteriler yüklenemedi: {customersError.message}</p>
        ) : !memberships || memberships.length === 0 ? (
          <p className="text-sm text-foreground/60">Henüz kullanıcı yok.</p>
        ) : (
          <ul className="divide-y divide-black/10 rounded-lg border border-black/10">
            {memberships.map((membership) => {
              const profile = profilesById.get(membership.user_id);
              return (
                <li key={membership.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{profile?.fullName ?? profile?.email ?? membership.user_id}</p>
                    <p className="text-xs text-foreground/50">
                      {profile?.email}
                      {membership.customer_id ? ` · ${customersById.get(membership.customer_id) ?? "Bilinmeyen müşteri"}` : ""}
                    </p>
                  </div>
                  <RoleForm
                    membershipId={membership.id}
                    currentRole={membership.role}
                    currentCustomerId={membership.customer_id}
                    customers={customers ?? []}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
