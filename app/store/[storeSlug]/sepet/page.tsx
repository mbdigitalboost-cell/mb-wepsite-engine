import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui/container";
import { CartList } from "./cart-list";
import type { InitialCustomer } from "./checkout-form";

/**
 * FAZ 5.1 — pre-fills checkout step 1 for a signed-in customer. email
 * comes straight from the session. Reads through the plain cookie-bound
 * client, relying on migration 0031's `store_customers_select_self` /
 * `orders_select_own_customer` RLS policies — not the admin client.
 *
 * FAZ 5.1b — fallback chain, not a straight replacement: store_customers
 * (the account's own profile, collected at signup — see hesap/actions.ts)
 * is checked FIRST for name/address; the customer's most recent order IN
 * THIS STORE is the fallback for whichever fields store_customers doesn't
 * have. Two cases land in that fallback: (1) phone, which store_customers
 * never collects at all (see migration 0032's own comment — signup asks
 * for name+address, not phone); (2) a store_customers row created by
 * ensureStoreCustomerLink from a plain login rather than a signup (e.g.
 * "same account, second store" — see that function's own comment), which
 * has no profile fields to fall back FROM in the first place. A guest, or
 * a customer with neither a profile nor a prior order here, simply gets
 * empty strings, same as before this phase existed.
 */
async function loadInitialCustomer(storeId: string): Promise<InitialCustomer | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: lastOrder }] = await Promise.all([
    supabase
      .from("store_customers")
      .select("full_name, address_city, address_district, address_neighborhood, address_line")
      .eq("store_id", storeId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("customer_name, customer_phone, address_city, address_district, address_neighborhood, address_line")
      .eq("store_id", storeId)
      .eq("customer_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    name: profile?.full_name ?? lastOrder?.customer_name ?? "",
    phone: lastOrder?.customer_phone ?? "",
    email: user.email ?? "",
    addressCity: profile?.address_city ?? lastOrder?.address_city ?? "",
    addressDistrict: profile?.address_district ?? lastOrder?.address_district ?? "",
    addressNeighborhood: profile?.address_neighborhood ?? lastOrder?.address_neighborhood ?? "",
    addressLine: profile?.address_line ?? lastOrder?.address_line ?? "",
  };
}

/**
 * FAZ 1 (mağaza sepeti/configurator) — cart page. This Server Component
 * only resolves the store (same notFound()-on-missing pattern every other
 * page under app/store/[storeSlug]/** already uses) — the actual cart
 * content is entirely client-side (localStorage via CartProvider, mounted
 * in the parent layout), so it's rendered by CartList, a colocated "use
 * client" component, same split as the rest of this codebase (e.g.
 * product-tabs.tsx next to its own page.tsx).
 */
export default async function StoreCartPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;

  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const initialCustomer = await loadInitialCustomer(store.id);

  return (
    <Container className="py-10">
      <h1 className="text-2xl font-semibold text-foreground">Sepetim</h1>
      <CartList storeSlug={storeSlug} initialCustomer={initialCustomer} />
    </Container>
  );
}
