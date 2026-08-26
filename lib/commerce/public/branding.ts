import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";

export interface PublicStoreBranding {
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  buttonStyle: string | null;
  typography: string | null;
  colorMode: string;
  themeConfig: Record<string, unknown>;
}

/** PHASE 2 public read model — store_branding. Same fail-soft contract as getPublicStoreProfile. */
export async function getPublicStoreBranding(storeId: string): Promise<PublicStoreBranding | null> {
  const client = createSupabasePublicClient();

  const { data, error } = await client
    .from("store_branding")
    .select("primary_color, secondary_color, accent_color, button_style, typography, color_mode, theme_config")
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) {
    console.error("[commerce/public] getPublicStoreBranding failed:", error.message);
    return null;
  }

  if (!data) return null;

  return {
    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
    accentColor: data.accent_color,
    buttonStyle: data.button_style,
    typography: data.typography,
    colorMode: data.color_mode,
    themeConfig: (data.theme_config as Record<string, unknown>) ?? {},
  };
}
