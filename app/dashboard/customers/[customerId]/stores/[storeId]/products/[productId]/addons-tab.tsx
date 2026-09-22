import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { createAddonAction, updateAddonAction, setAddonActiveAction, deleteAddonAction } from "./addons/actions";
import { ProductAddonForm } from "./addons/addon-form";

interface ProductAddonRow {
  id: string;
  name: string;
  sku: string | null;
  price_delta: number;
  stock: number | null;
  track_inventory: boolean;
  image_url: string | null;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
}

function currency(value: number) {
  return value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

/**
 * Moved verbatim from addons/page.tsx (single-screen tabbed product
 * form unification) into the product page's "Ek Ürün Alanları" tab —
 * same queries, same actions, same form component, no logic changes.
 * Only the standalone route's own chrome (back link,
 * `<h1>Ek Parçalar</h1>`, the notFound() product lookup) was dropped,
 * per the same reasoning as images-tab.tsx/variants-tab.tsx. `basePrice`
 * (for the admin-only total preview) is passed in by the caller, which
 * already fetched the product row for the Basic Info tab — no second
 * product query here.
 */
export async function AddonsTab({
  customerId,
  storeId,
  productId,
  basePrice,
}: {
  customerId: string;
  storeId: string;
  productId: string;
  basePrice: number;
}) {
  await requireStoreAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { data: addonsData } = await supabase
    .from("product_addons")
    .select("id, name, sku, price_delta, stock, track_inventory, image_url, is_required, is_active, sort_order")
    .eq("product_id", productId)
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });

  const addons = (addonsData ?? []) as ProductAddonRow[];
  const createAction = createAddonAction.bind(null, customerId, storeId, productId);

  return (
    <div>
      <p className="text-sm text-foreground/60">
        Ana ürüne eklenebilecek opsiyonel ek parçalar (ör. &quot;Yan Cep +100&quot;) — varyant ile
        KARIŞTIRILMAMALI, fiyat farkı ana ürün/varyant fiyatının üstüne eklenir, onu ezmez. store_editor+
        ekleyip düzenleyebilir; kalıcı silme store_admin+&apos;e ayrılmış.
      </p>

      <div className="mt-4 rounded-lg border border-black/10 p-4">
        {addons.length === 0 ? (
          <p className="text-sm text-foreground/60">Henüz ek parça eklenmemiş.</p>
        ) : (
          <ul className="divide-y divide-black/10">
            {addons.map((addon) => {
              const updateAction = updateAddonAction.bind(null, customerId, storeId, productId, addon.id);
              const toggleActive = setAddonActiveAction.bind(null, customerId, storeId, productId, addon.id, !addon.is_active);
              const deleteAction = deleteAddonAction.bind(null, customerId, storeId, productId, addon.id);

              return (
                <li key={addon.id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">
                        {addon.name}
                        {addon.sku ? <span className="ml-2 text-xs text-foreground/50">SKU: {addon.sku}</span> : null}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-foreground/60">
                        <span className="font-medium text-foreground/80">
                          {addon.price_delta >= 0 ? "+" : ""}
                          {currency(addon.price_delta)}
                        </span>
                        <span>{addon.track_inventory ? `Stok: ${addon.stock ?? 0}` : "Stok takibi yok"}</span>
                        <Badge variant={addon.is_active ? "solid" : "outline"}>
                          {addon.is_active ? "Aktif" : "Pasif"}
                        </Badge>
                        <Badge variant="outline">{addon.is_required ? "Zorunlu" : "Opsiyonel"}</Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <form action={toggleActive}>
                        <button
                          type="submit"
                          className="rounded px-2 py-1 text-xs text-foreground/60 underline-offset-2 hover:text-foreground hover:underline"
                        >
                          {addon.is_active ? "Pasifleştir" : "Aktifleştir"}
                        </button>
                      </form>
                      <form action={deleteAction}>
                        <button type="submit" className="rounded px-2 py-1 text-xs text-red-600 underline-offset-2 hover:underline">
                          Sil
                        </button>
                      </form>
                    </div>
                  </div>

                  <details className="mt-1">
                    <summary className="cursor-pointer list-none text-xs text-foreground/60 underline-offset-2 hover:text-foreground hover:underline">
                      Düzenle
                    </summary>
                    <div className="mt-2 rounded-md border border-black/10 p-3">
                      <ProductAddonForm
                        basePrice={basePrice}
                        initialValues={{
                          name: addon.name,
                          sku: addon.sku ?? "",
                          priceDelta: Number(addon.price_delta),
                          stock: addon.stock ?? "",
                          trackInventory: addon.track_inventory,
                          imageUrl: addon.image_url ?? "",
                          isRequired: addon.is_required,
                          isActive: addon.is_active,
                          sortOrder: addon.sort_order,
                        }}
                        action={updateAction}
                        submitLabel="Değişiklikleri Kaydet"
                      />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 border-t border-black/10 pt-4">
          <h2 className="text-sm font-semibold tracking-tight">+ Yeni Ek Parça</h2>
          <div className="mt-3">
            <ProductAddonForm basePrice={basePrice} action={createAction} submitLabel="+ Ek Parça Ekle" />
          </div>
        </div>
      </div>
    </div>
  );
}
