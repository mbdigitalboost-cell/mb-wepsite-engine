import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";

export interface PublicStoreNavigationItem {
  id: string;
  parentItemId: string | null;
  label: string;
  url: string;
  sortOrder: number;
}

/**
 * PHASE 2 public read model — store_navigation_items for one menu type
 * ("main"/"footer"/"category"). RLS already restricts anon rows to
 * `is_active = true` on an active store (see migration 0010), but this
 * still orders explicitly by sort_order — never relies on insertion order.
 * Returns `[]` (not null) on "no menu of this type yet" or on a query
 * error, since storefront nav rendering treats "no items" and "error" the
 * same way (render nothing rather than break the page).
 */
export async function getPublicStoreNavigation(
  storeId: string,
  menuType: "main" | "footer" | "category",
): Promise<PublicStoreNavigationItem[]> {
  const client = createSupabasePublicClient();

  const { data: menu, error: menuError } = await client
    .from("store_navigation_menus")
    .select("id")
    .eq("store_id", storeId)
    .eq("menu_type", menuType)
    .maybeSingle();

  if (menuError) {
    console.error("[commerce/public] getPublicStoreNavigation menu lookup failed:", menuError.message);
    return [];
  }
  if (!menu) return [];

  const { data: items, error: itemsError } = await client
    .from("store_navigation_items")
    .select("id, parent_item_id, label, url, sort_order")
    .eq("menu_id", menu.id)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    console.error("[commerce/public] getPublicStoreNavigation items query failed:", itemsError.message);
    return [];
  }

  return (items ?? []).map((item) => ({
    id: item.id,
    parentItemId: item.parent_item_id,
    label: item.label,
    url: item.url,
    sortOrder: item.sort_order,
  }));
}
