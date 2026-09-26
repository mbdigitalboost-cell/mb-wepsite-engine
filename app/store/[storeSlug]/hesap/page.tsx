import { notFound, redirect } from "next/navigation";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui/container";
import { formatPrice } from "@/lib/utils/format-price";
import type { OrderStatus } from "@/lib/supabase/types";
import { logoutAction } from "./actions";

const ORDER_STATUS_LABEL_TR: Record<OrderStatus, string> = {
  pending: "Beklemede",
  confirmed: "Onaylandı",
  preparing: "Hazırlanıyor",
  shipped: "Kargoya Verildi",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

export const dynamic = "force-dynamic";

/**
 * FAZ 5.1 — account summary + order history. `store_customers` isn't
 * queried here to decide whether to render: any authenticated session is
 * enough (see actions.ts's ensureStoreCustomerLink comment — the link row
 * already exists by the time anyone reaches here through this store's own
 * /giris or /kayit; a session that reached here via a DIFFERENT store's
 * login and never visited this store's own /giris just sees an empty order
 * history, same as any first-time visitor, which is the correct thing for
 * an isolated-per-store order list to show).
 */
export default async function StoreAccountPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/store/${storeSlug}/hesap/giris`);

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, subtotal, created_at")
    .eq("store_id", store.id)
    .eq("customer_user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Hesabım</h1>
          <p className="mt-1 text-sm text-foreground/60">{user.email}</p>
        </div>
        <form action={logoutAction.bind(null, storeSlug)}>
          <button type="submit" className="text-sm text-foreground/60 underline-offset-2 hover:text-foreground hover:underline">
            Çıkış Yap
          </button>
        </form>
      </div>

      <h2 className="mt-8 text-sm font-semibold text-foreground/70">Siparişlerim</h2>

      {!orders || orders.length === 0 ? (
        <p className="mt-3 text-sm text-foreground/60">Bu mağazada henüz bir siparişiniz yok.</p>
      ) : (
        <ul className="mt-3 divide-y divide-black/10 rounded-lg border border-black/10">
          {orders.map((order) => (
            <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
              <div>
                <p className="font-medium text-foreground">Sipariş #{order.order_number}</p>
                <p className="mt-0.5 text-xs text-foreground/50">
                  {new Date(order.created_at).toLocaleDateString("tr-TR")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-foreground">{formatPrice(order.subtotal)}</p>
                <p className="mt-0.5 text-xs text-foreground/50">{ORDER_STATUS_LABEL_TR[order.status]}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
