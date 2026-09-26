import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui/container";
import { CartList } from "./cart-list";
import type { InitialCustomer } from "./checkout-form";

/**
 * FAZ 5.1 — pre-fills checkout step 1 for a signed-in customer. email
 * comes straight from the session; name/phone have no dedicated storage
 * anywhere in this design (store_customers only ever holds email — see
 * migration 0031's own comment), so they're pulled from the customer's
 * own most recent order IN THIS STORE, if any (a guest with no prior
 * order here simply gets empty strings, same as today). Reads through the
 * plain cookie-bound client, relying on migration 0031's
 * `orders_select_own_customer` RLS policy — not the admin client.
 */
async function loadInitialCustomer(storeId: string): Promise<InitialCustomer | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: lastOrder } = await supabase
    .from("orders")
    .select("customer_name, customer_phone")
    .eq("store_id", storeId)
    .eq("customer_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    name: lastOrder?.customer_name ?? "",
    phone: lastOrder?.customer_phone ?? "",
    email: user.email ?? "",
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
