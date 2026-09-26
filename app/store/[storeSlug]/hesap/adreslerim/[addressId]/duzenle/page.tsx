import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { createSupabaseStorefrontServerClient } from "@/lib/supabase/storefront-server";
import { Container } from "@/components/ui/container";
import { AddressForm } from "../../address-form";

export const dynamic = "force-dynamic";

export default async function StoreEditAddressPage({
  params,
}: {
  params: Promise<{ storeSlug: string; addressId: string }>;
}) {
  const { storeSlug, addressId } = await params;
  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const supabase = await createSupabaseStorefrontServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/store/${storeSlug}/hesap/giris`);

  const { data: address } = await supabase
    .from("store_customer_addresses")
    .select("label, recipient_name, phone, address_city, address_district, address_neighborhood, address_line")
    .eq("id", addressId)
    .eq("user_id", user.id)
    .eq("store_id", store.id)
    .maybeSingle();
  if (!address) notFound();

  return (
    <Container className="py-10">
      <Link
        href={`/store/${storeSlug}/hesap/adreslerim`}
        className="text-xs text-foreground/50 hover:text-foreground hover:underline"
      >
        ← Adreslerim
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">Adresi Düzenle</h1>

      <div className="mt-6 max-w-lg">
        <AddressForm
          storeSlug={storeSlug}
          addressId={addressId}
          initialValues={{
            label: address.label ?? "",
            recipientName: address.recipient_name ?? "",
            phone: address.phone ?? "",
            addressCity: address.address_city,
            addressDistrict: address.address_district,
            addressNeighborhood: address.address_neighborhood ?? "",
            addressLine: address.address_line,
          }}
        />
      </div>
    </Container>
  );
}
