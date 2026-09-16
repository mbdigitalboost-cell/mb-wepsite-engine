import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/commerce/product-image-constants";

export interface GetProductImageSignedUrlResult {
  url?: string;
  error?: string;
}

/**
 * FAZ 2C-1C — `product-images` is a PRIVATE bucket (migration 0020), so
 * there is no public URL to read directly; the admin preview needs a
 * signed URL instead. Uses `createSupabaseServerClient()` (the calling
 * user's own session) — generating a signed URL still goes through the
 * bucket's `product_images_storage_select_member` RLS policy (a
 * tenant-scoped `SELECT` on `storage.objects`), so a user can only ever
 * sign paths belonging to a store they're a member of, same isolation
 * guarantee as every other Central Platform read.
 *
 * 3600s (1 hour) TTL — an admin-preview default (FAZ 2C-1B preflight's
 * own recommendation): long enough that a single editing session doesn't
 * need repeated re-signing, short enough that a copied/leaked preview
 * link doesn't stay valid indefinitely. A future public storefront will
 * need its own, separately-decided TTL strategy — out of this phase's
 * scope.
 */
export async function getProductImageSignedUrl(
  storagePath: string,
  expiresIn = 3600,
): Promise<GetProductImageSignedUrlResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).createSignedUrl(storagePath, expiresIn);

  if (error || !data) {
    return { error: error?.message ?? "Önizleme oluşturulamadı." };
  }

  return { url: data.signedUrl };
}
