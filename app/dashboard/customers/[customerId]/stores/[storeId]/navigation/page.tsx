import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { STORE_MENU_TYPES } from "@/lib/validation/store-navigation";
import {
  ensureNavigationMenuAction,
  toggleNavigationItemActiveAction,
  deleteNavigationItemAction,
  moveNavigationItemAction,
} from "./actions";
import { AddItemForm } from "./add-item-form";
import { EditItemForm } from "./edit-item-form";

const MENU_TYPE_LABELS: Record<string, string> = { main: "Ana Menü", footer: "Footer Menüsü", category: "Kategori Menüsü" };

interface NavigationItemRow {
  id: string;
  label: string;
  url: string;
  sort_order: number;
  is_active: boolean;
  parent_item_id: string | null;
}

export default async function StoreNavigationPage({
  params,
}: {
  params: Promise<{ customerId: string; storeId: string }>;
}) {
  const { customerId, storeId } = await params;
  await requireStoreAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id, name").eq("id", storeId).eq("customer_id", customerId).maybeSingle();
  if (!store) notFound();

  const { data: menus } = await supabase
    .from("store_navigation_menus")
    .select("id, menu_type")
    .eq("store_id", storeId);

  const menuByType = new Map((menus ?? []).map((menu) => [menu.menu_type, menu]));

  const menuIds = (menus ?? []).map((menu) => menu.id);
  let itemsByMenuId = new Map<string, NavigationItemRow[]>();
  if (menuIds.length > 0) {
    const { data: items } = await supabase
      .from("store_navigation_items")
      .select("id, menu_id, label, url, sort_order, is_active, parent_item_id")
      .in("menu_id", menuIds)
      .order("sort_order", { ascending: true });
    itemsByMenuId = new Map();
    for (const item of items ?? []) {
      const list = itemsByMenuId.get(item.menu_id) ?? [];
      list.push(item);
      itemsByMenuId.set(item.menu_id, list);
    }
  }

  return (
    <div>
      <Link
        href={`/dashboard/customers/${customerId}/stores/${storeId}`}
        className="text-xs text-foreground/50 hover:text-foreground hover:underline"
      >
        ← {store.name}
      </Link>

      <h1 className="mt-2 text-xl font-semibold tracking-tight">Navigation</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Ana / Footer / Kategori menüleri. store_editor+ öğe ekleyip düzenleyebilir; kalıcı silme store_admin+&apos;e ayrılmış.
      </p>

      <div className="mt-6 space-y-8">
        {STORE_MENU_TYPES.map((menuType) => {
          const menu = menuByType.get(menuType);
          const items = menu ? (itemsByMenuId.get(menu.id) ?? []) : [];
          const createMenu = ensureNavigationMenuAction.bind(null, customerId, storeId, menuType);

          return (
            <section key={menuType} className="rounded-lg border border-black/10 p-4">
              <h2 className="text-sm font-semibold tracking-tight">{MENU_TYPE_LABELS[menuType]}</h2>

              {!menu ? (
                <form action={createMenu} className="mt-3">
                  <button type="submit" className="text-sm text-brand-accent underline-offset-2 hover:underline">
                    + {MENU_TYPE_LABELS[menuType]} Oluştur
                  </button>
                </form>
              ) : (
                <>
                  {items.length === 0 ? (
                    <p className="mt-3 text-sm text-foreground/60">Henüz öğe yok.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-black/10">
                      {items.map((item, index) => {
                        const moveUp = moveNavigationItemAction.bind(null, customerId, storeId, menu.id, item.id, "up");
                        const moveDown = moveNavigationItemAction.bind(null, customerId, storeId, menu.id, item.id, "down");
                        const toggleActive = toggleNavigationItemActiveAction.bind(null, customerId, storeId, item.id, !item.is_active);
                        const deleteItem = deleteNavigationItemAction.bind(null, customerId, storeId, item.id);

                        return (
                          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                            <div className="flex-1 min-w-[200px]">
                              <p className="font-medium text-foreground">
                                {item.label}{" "}
                                {!item.is_active ? <span className="text-xs text-foreground/40">(pasif)</span> : null}
                              </p>
                              <p className="text-xs text-foreground/50">{item.url}</p>
                              <div className="mt-1">
                                <EditItemForm
                                  customerId={customerId}
                                  storeId={storeId}
                                  item={{ id: item.id, label: item.label, url: item.url, isActive: item.is_active, parentItemId: item.parent_item_id }}
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <form action={moveUp}>
                                <button type="submit" disabled={index === 0} className="rounded px-2 py-1 text-xs text-foreground/60 hover:bg-brand-accent/5 disabled:opacity-30" aria-label="Yukarı taşı">↑</button>
                              </form>
                              <form action={moveDown}>
                                <button type="submit" disabled={index === items.length - 1} className="rounded px-2 py-1 text-xs text-foreground/60 hover:bg-brand-accent/5 disabled:opacity-30" aria-label="Aşağı taşı">↓</button>
                              </form>
                              <form action={toggleActive}>
                                <button type="submit" className="rounded px-2 py-1 text-xs text-foreground/60 underline-offset-2 hover:underline">
                                  {item.is_active ? "Pasifleştir" : "Aktifleştir"}
                                </button>
                              </form>
                              <form action={deleteItem}>
                                <button type="submit" className="rounded px-2 py-1 text-xs text-red-600 underline-offset-2 hover:underline">
                                  Sil
                                </button>
                              </form>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <AddItemForm customerId={customerId} storeId={storeId} menuId={menu.id} />
                </>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
