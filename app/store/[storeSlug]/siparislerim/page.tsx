import { notFound } from "next/navigation";
import { Space_Grotesk } from "next/font/google";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { createSupabaseStorefrontServerClient } from "@/lib/supabase/storefront-server";
import { getOwnStoreCustomerOrders } from "@/lib/commerce/public/order-lookup";
import { Container } from "@/components/ui/container";
import { OrderStatusCard } from "@/components/commerce/public/order-status-card";
import { GuestOrderLookupForm } from "./guest-lookup-form";

export const dynamic = "force-dynamic";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["700"] });

/**
 * "Siparişlerim" — TEK route, dallanma sayfanın İÇİNDE (devir metninin
 * kendi talimatı): aynı /store/[storeSlug]/siparislerim hem üye hem
 * misafir için çalışıyor, hangi görünümün render edileceğine session'ın
 * var/yok oluşuna göre burada karar veriliyor.
 *
 * Auth kontrol deseni /hesap/page.tsx ile AYNI (createSupabaseStorefrontServerClient
 * + supabase.auth.getUser()) — TEK fark: /hesap/page.tsx session yoksa
 * /giris'e REDIRECT ediyor, bu sayfa ise session yoksa redirect ETMİYOR,
 * bunun yerine misafir sorgu formunu gösteriyor (bu sayfa üye olmayanlar
 * için de tasarlandı, devir metninin kendi "üye olan olmayan herkese"
 * talimatı).
 */
export default async function StoreOrdersLookupPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const supabase = await createSupabaseStorefrontServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Container className="py-10">
        <h1 className={`${spaceGrotesk.className} text-2xl font-bold tracking-tight text-[#F5F5F5]`}>Siparişlerim</h1>

        {user ? (
          <OwnOrdersList storeId={store.id} userId={user.id} authenticatedClient={supabase} />
        ) : (
          <div className="mt-6">
            <GuestOrderLookupForm storeSlug={storeSlug} />
          </div>
        )}
      </Container>
    </div>
  );
}

async function OwnOrdersList({
  storeId,
  userId,
  authenticatedClient,
}: {
  storeId: string;
  userId: string;
  authenticatedClient: Awaited<ReturnType<typeof createSupabaseStorefrontServerClient>>;
}) {
  const orders = await getOwnStoreCustomerOrders(authenticatedClient, storeId, userId);

  if (orders.length === 0) {
    return <p className="mt-6 text-sm text-[#A3A3A3]">Henüz siparişiniz yok.</p>;
  }

  return (
    <div className="mt-6 space-y-4">
      {orders.map((order) => (
        <OrderStatusCard key={order.id} order={order} />
      ))}
    </div>
  );
}
