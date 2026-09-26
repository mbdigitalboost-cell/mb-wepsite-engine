import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { createSupabaseStorefrontServerClient } from "@/lib/supabase/storefront-server";
import { Container } from "@/components/ui/container";
import { CartList } from "./cart-list";
import type { InitialCustomer, SavedAddress } from "./checkout-form";

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
/**
 * FAZ 6.2 — `savedAddresses` is a SEPARATE, additive data source from
 * `initialCustomer` above (migration 0033's store_customer_addresses,
 * not store_customers/orders) — checkout-form.tsx decides how the two
 * interact (a saved address, if any default exists, takes priority over
 * the plain profile/last-order fallback for the ADDRESS fields
 * specifically). Ordered default-first, then newest-first, so
 * `savedAddresses[0]` is always the sensible "pick this one" default when
 * one exists. Empty for a guest or a customer with no saved addresses —
 * checkout-form.tsx shows no selector at all in that case, leaving Faz
 * 5.1b's own behavior completely unchanged, per this phase's own
 * explicit "bunu bozma" instruction.
 */
async function loadCheckoutPrefill(
  storeId: string,
): Promise<{ initialCustomer: InitialCustomer | null; savedAddresses: SavedAddress[] }> {
  const supabase = await createSupabaseStorefrontServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { initialCustomer: null, savedAddresses: [] };

  const [{ data: profile }, { data: lastOrder }, { data: addresses }] = await Promise.all([
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
    supabase
      .from("store_customer_addresses")
      .select("id, label, recipient_name, phone, address_city, address_district, address_neighborhood, address_line, is_default")
      .eq("store_id", storeId)
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  return {
    initialCustomer: {
      name: profile?.full_name ?? lastOrder?.customer_name ?? "",
      phone: lastOrder?.customer_phone ?? "",
      email: user.email ?? "",
      addressCity: profile?.address_city ?? lastOrder?.address_city ?? "",
      addressDistrict: profile?.address_district ?? lastOrder?.address_district ?? "",
      addressNeighborhood: profile?.address_neighborhood ?? lastOrder?.address_neighborhood ?? "",
      addressLine: profile?.address_line ?? lastOrder?.address_line ?? "",
    },
    savedAddresses: (addresses ?? []).map((address) => ({
      id: address.id,
      label: address.label,
      recipientName: address.recipient_name,
      phone: address.phone,
      addressCity: address.address_city,
      addressDistrict: address.address_district,
      addressNeighborhood: address.address_neighborhood,
      addressLine: address.address_line,
      isDefault: address.is_default,
    })),
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

  const { initialCustomer, savedAddresses } = await loadCheckoutPrefill(store.id);

  return (
    <Container className="py-10">
      <h1 className="text-2xl font-semibold text-foreground">Sepetim</h1>
      <CartList storeSlug={storeSlug} initialCustomer={initialCustomer} savedAddresses={savedAddresses} />
    </Container>
  );
}
