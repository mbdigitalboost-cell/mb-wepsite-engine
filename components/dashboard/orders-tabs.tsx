import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Faz 30 — Siparişler bölümünün sekmeleri: Siparişler · İptal & İade
 * (bekleyen talep rozeti) · Satış Raporu. Rozet: "talep alındı" durumundaki
 * talepler (aksiyon bekleyenler) + ürünü gelmiş ama parası iade edilmemişler.
 */
export async function OrdersTabs({ customerId, storeId, active }: { customerId: string; storeId: string; active: "orders" | "returns" | "report" }) {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("order_returns")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .in("status", ["requested", "received"]);

  const base = `/dashboard/customers/${customerId}/stores/${storeId}`;
  const tabs: Array<{ key: typeof active; label: string; href: string; badge?: number }> = [
    { key: "orders", label: "Siparişler", href: `${base}/orders` },
    { key: "returns", label: "İptal & İade", href: `${base}/returns`, badge: count ?? 0 },
    { key: "report", label: "Satış Raporu", href: `${base}/sales-report` },
  ];

  return (
    <nav aria-label="Sipariş bölümleri" className="mt-4 flex flex-wrap gap-1 border-b border-black/10">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm ${
            tab.key === active ? "border-brand-accent font-semibold text-foreground" : "border-transparent text-foreground/60 hover:text-foreground"
          }`}
        >
          {tab.label}
          {tab.badge ? (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900">{tab.badge}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
