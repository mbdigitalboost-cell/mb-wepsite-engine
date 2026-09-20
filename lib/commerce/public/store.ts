import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";

export interface PublicStoreSummary {
  id: string;
  name: string;
  slug: string;
}

/**
 * FAZ 2C-3 — public storefront read model, giriş noktası. `slug` public/
 * hassas değil (zaten stores_slug_unique ile URL-benzeri bir değer).
 *
 * Bu fonksiyon `stores` tablosunu ASLA DOĞRUDAN sorgulamaz — o tablonun
 * hâlâ hiçbir anon SELECT policy'si yok (migration 0007'den beri hep
 * dashboard-only). Bunun yerine `store_public_stores` VIEW'ını
 * (migration 0024 — draft, henüz apply edilmedi) kullanır — bu view
 * `store_public_settings`'in (migration 0009) AYNI desenini takip eder:
 * SADECE id/name/slug/status, ASLA customer_id/supabase_connection_key/
 * diğer internal alanlar; `status='active'` filtresi view tanımının
 * kendisinde, uygulama katmanında tekrar edilmesine gerek yok (ama
 * defense-in-depth için burada da bırakıldı — view'ın kendisi zaten pasif
 * satırları döndürmüyor, bu `.eq` ek bir zarar vermiyor).
 */
export async function getStoreBySlug(slug: string): Promise<PublicStoreSummary | null> {
  const client = createSupabasePublicClient();

  const { data, error } = await client
    .from("store_public_stores")
    .select("id, name, slug")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("[commerce/public] getStoreBySlug failed:", error.message);
    return null;
  }

  return data ?? null;
}
