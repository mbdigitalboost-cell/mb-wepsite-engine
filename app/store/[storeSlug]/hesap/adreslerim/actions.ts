"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { createSupabaseStorefrontServerClient } from "@/lib/supabase/storefront-server";
import type { Database } from "@/lib/supabase/types";
import { storeAddressFormSchema } from "@/lib/validation/store-customer";
import { ensureStoreCustomerLink } from "../actions";
import type { AddressFormState } from "./form-state";

async function requireUser(storeSlug: string, supabase: SupabaseClient<Database>): Promise<User> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/store/${storeSlug}/hesap/giris`);
  return user;
}

/**
 * FAZ 6.2 — every address action needs the owning store_customers row's
 * id (the FK store_customer_addresses.store_customer_id points at), not
 * just the user/store ids. Usually already exists (created at signup/
 * login — see hesap/actions.ts's own ensureStoreCustomerLink comment),
 * but self-heals the "reached this store via a different store's login"
 * edge case by calling that same function rather than failing outright.
 */
async function requireStoreCustomerId(
  supabase: SupabaseClient<Database>,
  storeId: string,
  user: User,
): Promise<string> {
  const { data: existing } = await supabase
    .from("store_customers")
    .select("id")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return existing.id;

  const created = await ensureStoreCustomerLink(supabase, storeId, user.id, user.email ?? "");
  if (!created) {
    throw new Error("store_customers row could not be created or found");
  }
  return created;
}

function parseAddressForm(formData: FormData) {
  return storeAddressFormSchema.safeParse({
    label: formData.get("label") || undefined,
    recipientName: formData.get("recipientName") || undefined,
    phone: formData.get("phone") || undefined,
    addressCity: formData.get("addressCity"),
    addressDistrict: formData.get("addressDistrict"),
    addressNeighborhood: formData.get("addressNeighborhood"),
    addressLine: formData.get("addressLine"),
  });
}

export async function addAddressAction(
  storeSlug: string,
  _prevState: AddressFormState,
  formData: FormData,
): Promise<AddressFormState> {
  const store = await getStoreBySlug(storeSlug);
  if (!store) return { status: "error", error: "Mağaza bulunamadı." };

  const supabase = await createSupabaseStorefrontServerClient();
  const user = await requireUser(storeSlug, supabase);

  const parsed = parseAddressForm(formData);
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const storeCustomerId = await requireStoreCustomerId(supabase, store.id, user);

  // FAZ 6.2 — a customer's very first address for this store becomes the
  // default automatically (nothing else to conflict with, and it means
  // checkout's own address selector always has something pre-selected
  // the moment a customer saves one address, without a separate required
  // click). Every address after the first defaults to false — later ones
  // need an explicit "Varsayılan Yap".
  const { count } = await supabase
    .from("store_customer_addresses")
    .select("id", { count: "exact", head: true })
    .eq("store_customer_id", storeCustomerId);
  const isFirstAddress = (count ?? 0) === 0;

  const { error } = await supabase.from("store_customer_addresses").insert({
    user_id: user.id,
    store_customer_id: storeCustomerId,
    store_id: store.id,
    label: parsed.data.label || null,
    recipient_name: parsed.data.recipientName || null,
    phone: parsed.data.phone || null,
    address_city: parsed.data.addressCity,
    address_district: parsed.data.addressDistrict,
    address_neighborhood: parsed.data.addressNeighborhood,
    address_line: parsed.data.addressLine,
    is_default: isFirstAddress,
  });

  if (error) {
    console.error("[hesap/adreslerim] failed to insert address:", error.message);
    return { status: "error", error: "Adres eklenemedi, lütfen tekrar deneyin." };
  }

  redirect(`/store/${storeSlug}/hesap/adreslerim`);
}

export async function updateAddressAction(
  storeSlug: string,
  addressId: string,
  _prevState: AddressFormState,
  formData: FormData,
): Promise<AddressFormState> {
  const store = await getStoreBySlug(storeSlug);
  if (!store) return { status: "error", error: "Mağaza bulunamadı." };

  const supabase = await createSupabaseStorefrontServerClient();
  const user = await requireUser(storeSlug, supabase);

  const parsed = parseAddressForm(formData);
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  // RLS (store_customer_addresses_self_update) is the real ownership
  // gate; `.eq("user_id", user.id)` here is the surgical-layer duplicate
  // of that same check, same "RLS is the broad gate, the app query is
  // the surgical layer" split used everywhere else in this schema.
  const { error } = await supabase
    .from("store_customer_addresses")
    .update({
      label: parsed.data.label || null,
      recipient_name: parsed.data.recipientName || null,
      phone: parsed.data.phone || null,
      address_city: parsed.data.addressCity,
      address_district: parsed.data.addressDistrict,
      address_neighborhood: parsed.data.addressNeighborhood,
      address_line: parsed.data.addressLine,
    })
    .eq("id", addressId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[hesap/adreslerim] failed to update address:", error.message);
    return { status: "error", error: "Adres güncellenemedi, lütfen tekrar deneyin." };
  }

  redirect(`/store/${storeSlug}/hesap/adreslerim`);
}

export async function deleteAddressAction(storeSlug: string, addressId: string): Promise<void> {
  const supabase = await createSupabaseStorefrontServerClient();
  const user = await requireUser(storeSlug, supabase);

  const { error } = await supabase.from("store_customer_addresses").delete().eq("id", addressId).eq("user_id", user.id);
  if (error) {
    console.error("[hesap/adreslerim] failed to delete address:", error.message);
  }

  redirect(`/store/${storeSlug}/hesap/adreslerim`);
}

/**
 * FAZ 6.2 — two SEQUENTIAL statements, deliberately not one: migration
 * 0033's partial unique index allows at most one is_default=true per
 * store_customer_id, so the previous default must be unset to false
 * FIRST (bringing the true-count to 0), then the target address set to
 * true SECOND (bringing it back to 1) — reversing this order, or trying
 * to do both in one statement, risks two rows briefly holding
 * is_default=true at once and hitting that index.
 */
export async function setDefaultAddressAction(storeSlug: string, addressId: string): Promise<void> {
  const supabase = await createSupabaseStorefrontServerClient();
  const user = await requireUser(storeSlug, supabase);

  const { data: address } = await supabase
    .from("store_customer_addresses")
    .select("store_customer_id")
    .eq("id", addressId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (address) {
    await supabase
      .from("store_customer_addresses")
      .update({ is_default: false })
      .eq("store_customer_id", address.store_customer_id)
      .eq("is_default", true);

    await supabase.from("store_customer_addresses").update({ is_default: true }).eq("id", addressId).eq("user_id", user.id);
  }

  redirect(`/store/${storeSlug}/hesap/adreslerim`);
}
