import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";

export interface PublicStoreProfile {
  displayName: string | null;
  description: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  socialLinks: Record<string, unknown>;
}

/**
 * PHASE 2 public read model — store_profiles. Same fail-soft contract as
 * lib/cms/adapters/shared.ts: never throws, returns null on "not found" OR
 * on a genuine query error (logged server-side only). RLS
 * (store_profiles_select_public_active_store, using
 * is_store_publicly_visible()) is the actual gate — an inactive store's
 * row is invisible to this client regardless of what storeId is passed.
 */
export async function getPublicStoreProfile(storeId: string): Promise<PublicStoreProfile | null> {
  const client = createSupabasePublicClient();

  const { data, error } = await client
    .from("store_profiles")
    .select("display_name, description, logo_url, favicon_url, phone, email, address, social_links")
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) {
    console.error("[commerce/public] getPublicStoreProfile failed:", error.message);
    return null;
  }

  if (!data) return null;

  return {
    displayName: data.display_name,
    description: data.description,
    logoUrl: data.logo_url,
    faviconUrl: data.favicon_url,
    phone: data.phone,
    email: data.email,
    address: data.address,
    socialLinks: (data.social_links as Record<string, unknown>) ?? {},
  };
}
