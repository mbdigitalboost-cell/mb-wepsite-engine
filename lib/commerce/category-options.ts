import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Faz 27 — admin kategori seçicisi için seçenekler: alt kategoriler üst
 * kategori adıyla birlikte ("SİLAH KILIFLARI › Glock"), üst kategorinin
 * hemen altında sıralı. Cookie-bound client (RLS: üye okuyabilir).
 */
export async function getAdminCategoryOptions(storeId: string): Promise<Array<{ id: string; label: string }>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, parent_id, sort_order")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  const rows = data ?? [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const out: Array<{ id: string; label: string }> = [];
  for (const top of rows.filter((row) => !row.parent_id || !byId.has(row.parent_id))) {
    out.push({ id: top.id, label: top.name });
    for (const child of rows.filter((row) => row.parent_id === top.id)) {
      out.push({ id: child.id, label: `${top.name} › ${child.name}` });
    }
  }
  return out;
}

/** Ürünün mevcut kategori bağları (ana önce). */
export async function getProductCategoryLinks(storeId: string, productId: string): Promise<{ ids: string[]; primaryId: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("product_categories")
    .select("category_id, is_primary, created_at")
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
  const rows = data ?? [];
  return { ids: rows.map((row) => row.category_id), primaryId: rows.find((row) => row.is_primary)?.category_id ?? null };
}
