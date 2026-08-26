import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { HomepageSectionTypeKey } from "@/lib/validation/homepage-section";

export interface PublicHomepageSection {
  id: string;
  sectionTypeKey: HomepageSectionTypeKey;
  internalLabel: string | null;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  config: Record<string, unknown>;
  sortOrder: number;
}

/**
 * PHASE 2 public read model — store_homepage_sections. RLS already
 * restricts anon rows to `is_active = true` on an active store (migration
 * 0011); this still orders explicitly by sort_order. `homepage_section_types`
 * is intentionally NOT joined/queried here — it's dashboard-only (no anon
 * SELECT policy at all), and the renderer only needs `section_type_key` to
 * pick a component, not the reference table's label/description.
 */
export async function getPublicStoreHomepageSections(storeId: string): Promise<PublicHomepageSection[]> {
  const client = createSupabasePublicClient();

  const { data, error } = await client
    .from("store_homepage_sections")
    .select("id, section_type_key, internal_label, title, description, image_url, link_url, config, sort_order")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[commerce/public] getPublicStoreHomepageSections failed:", error.message);
    return [];
  }

  return (data ?? []).map((section) => ({
    id: section.id,
    sectionTypeKey: section.section_type_key as HomepageSectionTypeKey,
    internalLabel: section.internal_label,
    title: section.title,
    description: section.description,
    imageUrl: section.image_url,
    linkUrl: section.link_url,
    config: (section.config as Record<string, unknown>) ?? {},
    sortOrder: section.sort_order,
  }));
}
