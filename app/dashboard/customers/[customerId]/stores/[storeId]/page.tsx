import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { EditStoreForm } from "./edit-store-form";
import { setStoreStatusAction } from "@/app/dashboard/stores/actions";
import { formatPrice } from "@/lib/utils/format-price";
import { LOW_STOCK_THRESHOLD } from "@/lib/commerce/inventory";
import { ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_VARIANT } from "@/lib/commerce/order-status-labels";
import type { OrderStatus } from "@/lib/supabase/types";

// FAZ 2.6 — "orders" removed from here: it now has its own top-level
// "Siparişler" entry point above this grid (see the JSX below), not a
// card inside the "Mağazayı Düzenle" submodule grid anymore.
const SUBMODULES = [
  { key: "profile", label: "Store Profile", description: "Kimlik, iletişim, sosyal medya" },
  { key: "settings", label: "Store Settings", description: "Para birimi, KDV, bakım modu" },
  { key: "branding", label: "Branding", description: "Renkler, tipografi, buton stili" },
  { key: "navigation", label: "Navigation", description: "Ana / Footer / Kategori menüleri" },
  { key: "homepage", label: "Homepage Builder", description: "Ana sayfa bölümleri" },
  { key: "products", label: "Products", description: "Ürün kataloğu" },
  { key: "categories", label: "Categories", description: "Ürün kategorileri" },
  { key: "brands", label: "Brands", description: "Markalar" },
  { key: "subscribers", label: "Aboneler", description: "Müşteri listesi, indirimler, e-posta/WhatsApp" },
] as const;

/** Module-level helper, NOT inlined into the component body — react-hooks/purity flags a direct `Date.now()` call inside a component/hook's own render path as an impure-during-render call, even in an async Server Component that only ever runs once per request. Hoisting the impure call into its own plain function (never itself a component/hook) satisfies the rule without any behavior change. */
function getThirtyDaysAgoMs(): number {
  return Date.now() - 30 * 24 * 60 * 60 * 1000;
}

/**
 * Store detail — mirrors customers/[customerId]/websites/[websiteId]/page.tsx.
 * Read access is `requireStoreAccess` (store_viewer+, the whole store_*
 * membership family) since any store member should be able to SEE this
 * page and navigate its submodules; each submodule link itself is gated
 * again by that submodule's own tier (editor/admin) — see each page.tsx.
 * Name/slug editing + status toggle stay admin-only (`isAdmin` here comes
 * from platform_admin, not store_admin — see require-store-access.ts).
 */
export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ customerId: string; storeId: string }>;
}) {
  const { customerId, storeId } = await params;
  const { isAdmin } = await requireStoreAccess(storeId);

  const supabase = await createSupabaseServerClient();

  // Admin Panel İşlevsellik devir metni, Kısım B — bu kök route artık
  // mağazanın gerçek istatistik anasayfası. Her sayı CANLI sorgudan
  // geliyor, devir metnindeki gerçek veri bloğu sadece referans/doğrulama
  // amaçlıydı, burada hiçbir şey hardcode edilmedi. Tek bir `orders`
  // sorgusu (durum/tutar/tarih) hem "bekleyen"/"tamamlanan" toplamlarını
  // HEM "son 30 gün" sayısını JS tarafında hesaplıyor — bu codebase'in
  // zaten kullandığı "satırları çek, client tarafında indirgе" deseni
  // (ör. getPublicBrandsWithProductCounts), ayrı bir SQL agregasyon
  // fonksiyonu/migration gerekmeden.
  const [
    { data: customer },
    { data: store },
    { data: orderRows },
    { data: recentOrders },
    { count: totalProductCount },
    { count: activeProductCount },
    { count: lowStockProductCount },
    { count: categoryCount },
    { count: brandCount },
    { count: registeredCustomerCount },
  ] = await Promise.all([
    supabase.from("customers").select("id, name").eq("id", customerId).maybeSingle(),
    supabase
      .from("stores")
      .select("id, name, slug, status, created_at, updated_at")
      .eq("id", storeId)
      .eq("customer_id", customerId)
      .maybeSingle(),
    supabase.from("orders").select("status, subtotal, discount_amount, created_at").eq("store_id", storeId),
    supabase
      .from("orders")
      .select("id, order_number, status, customer_name, subtotal, discount_amount")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("store_id", storeId),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("is_active", true),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("track_inventory", true)
      .lte("stock", LOW_STOCK_THRESHOLD),
    supabase.from("categories").select("id", { count: "exact", head: true }).eq("store_id", storeId),
    supabase.from("brands").select("id", { count: "exact", head: true }).eq("store_id", storeId),
    supabase.from("store_customers").select("id", { count: "exact", head: true }).eq("store_id", storeId),
  ]);

  if (!customer || !store) notFound();

  const nextStatus = store.status === "active" ? "inactive" : "active";
  const toggleStatus = setStoreStatusAction.bind(null, customerId, storeId, nextStatus);

  // Net tutar = subtotal - discount_amount — devir metninin kendi
  // doğrulanmış verisiyle birebir eşleşen hesap (completed: 1905.00
  // subtotal - 0.75 iskonto = 1904.25 net, devir metninde "₺1.904,25"
  // olarak raporlanan AYNI rakam).
  let pendingCount = 0;
  let pendingAmount = 0;
  let completedCount = 0;
  let completedAmount = 0;
  let last30DaysCount = 0;
  const thirtyDaysAgoMs = getThirtyDaysAgoMs();

  for (const row of orderRows ?? []) {
    const net = Number(row.subtotal) - Number(row.discount_amount ?? 0);
    if (row.status === "pending") {
      pendingCount += 1;
      pendingAmount += net;
    }
    if (row.status === "completed") {
      completedCount += 1;
      completedAmount += net;
    }
    if (new Date(row.created_at).getTime() >= thirtyDaysAgoMs) {
      last30DaysCount += 1;
    }
  }

  const basePath = `/dashboard/customers/${customerId}/stores/${storeId}`;

  type StatTone = "neutral" | "warning" | "success";
  const toneClasses: Record<StatTone, string> = {
    neutral: "border-black/10",
    warning: "border-amber-300 bg-amber-50/50",
    success: "border-green-300 bg-green-50/50",
  };
  const toneValueClasses: Record<StatTone, string> = {
    neutral: "text-foreground",
    warning: "text-amber-800",
    success: "text-green-800",
  };

  const statCards: Array<{ key: string; label: string; value: string; sub: string; href: string; tone: StatTone }> = [
    {
      key: "pending",
      label: "Bekleyen Sipariş",
      value: String(pendingCount),
      sub: formatPrice(pendingAmount),
      href: `${basePath}/orders?status=pending`,
      tone: pendingCount > 0 ? "warning" : "neutral",
    },
    {
      key: "completed",
      label: "Tamamlanan Gelir",
      value: formatPrice(completedAmount),
      sub: `${completedCount} sipariş`,
      href: `${basePath}/orders?status=completed`,
      tone: "success",
    },
    {
      key: "last30",
      label: "Son 30 Gün",
      value: String(last30DaysCount),
      sub: "sipariş",
      href: `${basePath}/orders`,
      tone: "neutral",
    },
    {
      key: "products",
      label: "Ürünler",
      value: `${activeProductCount ?? 0}/${totalProductCount ?? 0}`,
      sub: (lowStockProductCount ?? 0) > 0 ? `${lowStockProductCount} düşük stok` : "stok yeterli",
      href: `${basePath}/products`,
      tone: (lowStockProductCount ?? 0) > 0 ? "warning" : "neutral",
    },
  ];

  const catalogSummary = [
    { label: "Kategori", value: categoryCount ?? 0 },
    { label: "Marka", value: brandCount ?? 0 },
    { label: "Kayıtlı Müşteri", value: registeredCustomerCount ?? 0 },
    { label: "Düşük Stok", value: lowStockProductCount ?? 0 },
  ];

  return (
    <div>
      <Link
        href={`/dashboard/customers/${customerId}/stores`}
        className="text-xs text-foreground/50 hover:text-foreground hover:underline"
      >
        ← {customer.name} · Mağazalar
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{store.name}</h1>
        <StatusBadge status={store.status} />
      </div>
      <p className="mt-1 text-xs text-foreground/50">/{store.slug}</p>

      {isAdmin ? (
        <form action={toggleStatus} className="mt-4">
          <button
            type="submit"
            className="text-sm text-foreground/60 underline-offset-2 hover:text-foreground hover:underline"
          >
            {store.status === "active" ? "Pasifleştir" : "Aktifleştir"}
          </button>
        </form>
      ) : null}

      {/*
        Admin Panel İşlevsellik devir metni, Kısım B — 4 istatistik kartı
        (kanvasın AdminDashboard.dc.html düzeni referans alındı). Eski
        tek "Siparişler" sayaç kartı (sadece adet) buradaki daha zengin
        "Bekleyen Sipariş" kartıyla (adet + gerçek tutar) değiştirildi —
        ikisini aynı sayfada tutmak aynı bilgiyi iki kez gösterirdi.
      */}
      <div className="mt-8 grid grid-cols-1 gap-4 border-t border-black/10 pt-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className={`block rounded-lg border-2 p-5 transition-colors hover:border-brand-accent/40 ${toneClasses[card.tone]}`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{card.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${toneValueClasses[card.tone]}`}>{card.value}</p>
            <p className="mt-1 text-xs text-foreground/50">{card.sub}</p>
          </Link>
        ))}
      </div>

      {/*
        Son Siparişler (en fazla 5) + Katalog Özeti — kanvasın aynı
        düzeni. Sipariş yoksa boş bir liste değil, açık bir mesaj.
      */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border border-black/10 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">Son Siparişler</h2>
            <Link href={`${basePath}/orders`} className="text-xs text-foreground/50 underline-offset-2 hover:underline">
              Tümünü Gör →
            </Link>
          </div>
          {!recentOrders || recentOrders.length === 0 ? (
            <p className="mt-4 text-sm text-foreground/60">Henüz sipariş yok.</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/10">
              {recentOrders.map((order) => {
                const net = Number(order.subtotal) - Number(order.discount_amount ?? 0);
                const status = order.status as OrderStatus;
                return (
                  <li key={order.id}>
                    <Link
                      href={`${basePath}/orders/${order.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm hover:bg-brand-accent/5"
                    >
                      <span>
                        <span className="font-medium text-foreground">#{order.order_number}</span>{" "}
                        <span className="text-foreground/70">{order.customer_name}</span>
                      </span>
                      <span className="flex items-center gap-3 text-xs text-foreground/50">
                        {formatPrice(net)}
                        <Badge variant={ORDER_STATUS_BADGE_VARIANT[status]}>{ORDER_STATUS_LABELS[status]}</Badge>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-black/10 p-5">
          <h2 className="text-sm font-semibold tracking-tight">Katalog Özeti</h2>
          <dl className="mt-3 space-y-2.5">
            {catalogSummary.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <dt className="text-foreground/60">{item.label}</dt>
                <dd className="font-medium text-foreground">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/*
        FAZ 2.6'dan kalan "Mağazayı Düzenle" disclosure — artık yukarıdaki
        istatistik kartlarıyla aynı grid'de değil, kendi başına bir blok
        (zero client JS, aynı <details> deseni). Kısım D (nav cilası)
        bu linklerin çoğunu sol menüye taşıyacak, ama o ayrı/daha dikkatli
        test edilecek bir commit — bu blok o güne kadar yerinde kalıyor.
      */}
      <details className="mt-6 rounded-lg border-2 border-black/10 p-6">
        <summary className="cursor-pointer list-none">
          <p className="text-sm font-medium text-foreground/60">Mağazayı Düzenle</p>
          <p className="mt-1 text-sm text-foreground">Products, Branding, Navigation ve diğer ayarlar</p>
        </summary>

        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SUBMODULES.map((submodule) => (
            <li key={submodule.key}>
              <Link
                href={`/dashboard/customers/${customerId}/stores/${storeId}/${submodule.key}`}
                className="block rounded-lg border border-black/10 px-4 py-3 text-sm hover:bg-brand-accent/5"
              >
                <p className="font-medium text-foreground">{submodule.label}</p>
                <p className="mt-0.5 text-xs text-foreground/50">{submodule.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </details>

      {isAdmin ? (
        <div className="mt-8 border-t border-black/10 pt-6">
          <h2 className="text-sm font-semibold tracking-tight">Mağaza Bilgilerini Düzenle</h2>
          <div className="mt-4">
            <EditStoreForm
              customerId={customerId}
              storeId={storeId}
              initialValues={{ name: store.name, slug: store.slug }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
