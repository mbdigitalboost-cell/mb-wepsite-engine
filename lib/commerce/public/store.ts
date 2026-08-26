import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";

export interface PublicStoreSummary {
  id: string;
  name: string;
  slug: string;
}

/**
 * PHASE 2 public storefront read model — giriş noktası. `slug` public/
 * hassas değil (zaten stores_slug_unique ile URL-benzeri bir değer).
 * Anon client + RLS'in `stores` üzerinde bugün (0007) hiç anon SELECT
 * politikası OLMADIĞINI unutmayın — yani bu fonksiyon bugün HER ZAMAN
 * null döner, çünkü `stores` tablosunun kendisi hâlâ dashboard-only.
 *
 * Bu KASITLI: Phase 2 kararı (madde 1) "storefront'un TAMAMINI kodlama,
 * sadece sözleşmeyi tasarla" idi. Gerçek bir storefront'un
 * `getStoreBySlug` çağırabilmesi için `stores` tablosuna da (SADECE id/
 * name/slug/status sütunlarını döndüren, dar bir) bir anon SELECT
 * politikası eklenmesi gerekecek — bu, bu fazın kapsamında YAPILMADI
 * (kullanıcının "stores tablosunu gereksiz büyütme" ve "minimum public
 * yüzey" ilkeleriyle, ayrı bir onay gerektiren bir RLS değişikliği).
 * Bu fonksiyon şimdiden doğru İMZAYLA burada duruyor ki o onay geldiğinde
 * sadece BİR satır (politika ekleme) yeterli olsun, adapter katmanı zaten
 * hazır olsun.
 */
export async function getStoreBySlug(slug: string): Promise<PublicStoreSummary | null> {
  const client = createSupabasePublicClient();

  const { data, error } = await client
    .from("stores")
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
