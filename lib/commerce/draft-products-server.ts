import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DRAFT_PRODUCT_NAME, isUntouchedDraft, type DraftCandidate } from "@/lib/commerce/draft-products";

/**
 * Faz 37 Kısım B — mağazanın taslak adayları ve bağlı kayıt sayıları
 * (oturumlu client; her sorgu store_id ile). Bağlı kayıt: görsel, varyant,
 * seçenek grubu, ek ürün, kategori bağı, sipariş kalemi.
 */
const LINKED_TABLES = ["product_images", "product_variants", "option_groups", "product_addons", "product_categories", "order_items"] as const;

export async function loadDraftCandidates(storeId: string): Promise<DraftCandidate[]> {
  const supabase = await createSupabaseServerClient();
  const { data: rows, error } = await supabase
    .from("products")
    .select("id, name, slug, is_active, price, short_description, description, created_at, updated_at")
    .eq("store_id", storeId)
    .eq("is_active", false)
    .eq("name", DRAFT_PRODUCT_NAME)
    .like("slug", "taslak-%");
  if (error || !rows || rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const linked = new Map<string, number>(ids.map((id) => [id, 0]));
  await Promise.all(
    LINKED_TABLES.map(async (table) => {
      const { data } = await supabase.from(table).select("product_id").eq("store_id", storeId).in("product_id", ids);
      for (const item of (data ?? []) as Array<{ product_id: string | null }>) {
        if (item.product_id) linked.set(item.product_id, (linked.get(item.product_id) ?? 0) + 1);
      }
    }),
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.is_active,
    price: Number(row.price),
    shortDescription: row.short_description,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    linkedCount: linked.get(row.id) ?? 0,
  }));
}

export async function loadEmptyDrafts(storeId: string): Promise<DraftCandidate[]> {
  return (await loadDraftCandidates(storeId)).filter(isUntouchedDraft);
}

/** Bu kullanıcının açtığı taslaklar (denetim kaydından: product.create, draft=true). */
export async function draftIdsCreatedBy(userId: string, productIds: string[]): Promise<Set<string>> {
  if (productIds.length === 0) return new Set();
  const { data } = await createSupabaseAdminClient()
    .from("audit_logs")
    .select("entity_id")
    .eq("user_id", userId)
    .eq("action", "product.create")
    .in("entity_id", productIds);
  return new Set((data ?? []).map((row) => String(row.entity_id)));
}
