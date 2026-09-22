import { redirect } from "next/navigation";

/**
 * Varyantlar is now a tab on the unified product screen (see
 * ../variants-tab.tsx and ../product-tabs.tsx) instead of its own route.
 * This stub keeps old bookmarks/links working — actions.ts and the
 * option-group/option-value/variant/variant-option-assignment forms in
 * this directory are unchanged and still power that tab directly.
 */
export default async function ProductVariantsRedirectPage({
  params,
}: {
  params: Promise<{ customerId: string; storeId: string; productId: string }>;
}) {
  const { customerId, storeId, productId } = await params;
  redirect(`/dashboard/customers/${customerId}/stores/${storeId}/products/${productId}?tab=variants`);
}
