import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";

export interface PublicCategory {
  id: string;
  storeId: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
}

const CATEGORY_COLUMNS =
  "id, store_id, parent_id, name, slug, description, image_url, sort_order, seo_title, seo_description";

function mapCategory(row: {
  id: string;
  store_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
}): PublicCategory {
  return {
    id: row.id,
    storeId: row.store_id,
    parentId: row.parent_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
  };
}

/**
 * FAZ 2C-3 — public read model, categories. RLS (migration 0016's own
 * `categories_select_public_active`) already restricts anon rows to
 * `is_active = true` on a publicly-visible store — this function adds no
 * extra filter beyond `store_id`, the RLS is the real gate. Same
 * fail-soft contract as every other lib/commerce/public/* function:
 * never throws, `[]`/`null` on error (logged server-side only).
 */
export async function getPublicCategories(storeId: string): Promise<PublicCategory[]> {
  const client = createSupabasePublicClient();

  const { data, error } = await client
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[commerce/public] getPublicCategories failed:", error.message);
    return [];
  }

  return (data ?? []).map(mapCategory);
}

/**
 * FAZ 2C-4 STEP 23 — subcategories of a given parent category (e.g. SİLAH
 * KILIFLARI's 4 children). Same RLS-is-the-real-gate contract as
 * getPublicCategories; `parentId` is an additional narrowing filter, not a
 * security boundary. Added so the category page's data model can show
 * "ana kategori + alt kategoriler + ürünler" per this phase's own spec —
 * no separate policy needed, migration 0016's existing
 * `categories_select_public_active` already covers child rows exactly
 * like top-level ones.
 */
export async function getPublicSubcategories(storeId: string, parentId: string): Promise<PublicCategory[]> {
  const client = createSupabasePublicClient();

  const { data, error } = await client
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .eq("store_id", storeId)
    .eq("parent_id", parentId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[commerce/public] getPublicSubcategories failed:", error.message);
    return [];
  }

  return (data ?? []).map(mapCategory);
}

export async function getPublicCategoryBySlug(storeId: string, categorySlug: string): Promise<PublicCategory | null> {
  const client = createSupabasePublicClient();

  const { data, error } = await client
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .eq("store_id", storeId)
    .eq("slug", categorySlug)
    .maybeSingle();

  if (error) {
    console.error("[commerce/public] getPublicCategoryBySlug failed:", error.message);
    return null;
  }

  if (!data) return null;
  return mapCategory(data);
}
