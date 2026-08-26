import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/status-badge";
import { EditStoreForm } from "./edit-store-form";
import { setStoreStatusAction } from "@/app/dashboard/stores/actions";

const SUBMODULES = [
  { key: "profile", label: "Store Profile", description: "Kimlik, iletişim, sosyal medya" },
  { key: "settings", label: "Store Settings", description: "Para birimi, KDV, bakım modu" },
  { key: "branding", label: "Branding", description: "Renkler, tipografi, buton stili" },
  { key: "navigation", label: "Navigation", description: "Ana / Footer / Kategori menüleri" },
  { key: "homepage", label: "Homepage Builder", description: "Ana sayfa bölümleri" },
] as const;

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
  const [{ data: customer }, { data: store }] = await Promise.all([
    supabase.from("customers").select("id, name").eq("id", customerId).maybeSingle(),
    supabase
      .from("stores")
      .select("id, name, slug, status, created_at, updated_at")
      .eq("id", storeId)
      .eq("customer_id", customerId)
      .maybeSingle(),
  ]);

  if (!customer || !store) notFound();

  const nextStatus = store.status === "active" ? "inactive" : "active";
  const toggleStatus = setStoreStatusAction.bind(null, customerId, storeId, nextStatus);

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

      <div className="mt-8 border-t border-black/10 pt-6">
        <h2 className="text-sm font-semibold tracking-tight">Mağaza Yönetimi</h2>
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      </div>

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
