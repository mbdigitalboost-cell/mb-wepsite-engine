import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { createSupabaseStorefrontServerClient } from "@/lib/supabase/storefront-server";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { deleteAddressAction, setDefaultAddressAction } from "./actions";
import { AddressForm } from "./address-form";

export const dynamic = "force-dynamic";

/**
 * FAZ 6.2 — saved addresses list + "Yeni Adres Ekle" form on one page,
 * matching the spec's own "kayıtlı adresleri listele... 'Yeni Adres Ekle'
 * formu" (one page, not a separate add route) — Düzenle links out to its
 * own [addressId]/duzenle page instead (editing needs its own set of
 * initial values, cleaner as a separate small page than an inline-
 * editable row per this codebase's existing minimal-client-state style).
 */
export default async function StoreAddressesPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const supabase = await createSupabaseStorefrontServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/store/${storeSlug}/hesap/giris`);

  const { data: addresses } = await supabase
    .from("store_customer_addresses")
    .select("id, label, recipient_name, phone, address_city, address_district, address_neighborhood, address_line, is_default")
    .eq("store_id", store.id)
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <Container className="py-10">
      <Link href={`/store/${storeSlug}/hesap`} className="text-xs text-foreground/50 hover:text-foreground hover:underline">
        ← Hesabım
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">Adreslerim</h1>

      {!addresses || addresses.length === 0 ? (
        <p className="mt-4 text-sm text-foreground/60">Henüz kayıtlı bir adresiniz yok.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {addresses.map((address) => (
            <li key={address.id} className="rounded-lg border border-black/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{address.label || "Adres"}</span>
                    {address.is_default ? <Badge variant="success">Varsayılan</Badge> : null}
                  </div>
                  {address.recipient_name ? (
                    <p className="mt-1 text-sm text-foreground/70">{address.recipient_name}</p>
                  ) : null}
                  {address.phone ? <p className="text-sm text-foreground/70">{address.phone}</p> : null}
                  <p className="mt-1 text-sm text-foreground/70">
                    {address.address_neighborhood ? `${address.address_neighborhood}, ` : ""}
                    {address.address_line}
                  </p>
                  <p className="text-sm text-foreground/70">
                    {address.address_district} / {address.address_city}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5 text-sm">
                  <Link
                    href={`/store/${storeSlug}/hesap/adreslerim/${address.id}/duzenle`}
                    className="text-brand-accent underline-offset-2 hover:underline"
                  >
                    Düzenle
                  </Link>
                  {!address.is_default ? (
                    <form action={setDefaultAddressAction.bind(null, storeSlug, address.id)}>
                      <button type="submit" className="text-foreground/70 underline-offset-2 hover:text-foreground hover:underline">
                        Varsayılan Yap
                      </button>
                    </form>
                  ) : null}
                  <form action={deleteAddressAction.bind(null, storeSlug, address.id)}>
                    <button type="submit" className="text-red-600 underline-offset-2 hover:underline">
                      Sil
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 border-t border-black/10 pt-6">
        <h2 className="text-sm font-semibold text-foreground">Yeni Adres Ekle</h2>
        <div className="mt-4">
          <AddressForm storeSlug={storeSlug} />
        </div>
      </div>
    </Container>
  );
}
