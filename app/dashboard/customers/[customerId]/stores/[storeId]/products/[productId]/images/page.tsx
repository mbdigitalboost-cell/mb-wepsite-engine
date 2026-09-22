import { redirect } from "next/navigation";

/**
 * Görseller is now a tab on the unified product screen (see
 * ../images-tab.tsx and ../product-tabs.tsx) instead of its own route.
 * This stub keeps old bookmarks/links working — actions.ts and
 * image-form.tsx in this directory are unchanged and still power that
 * tab directly.
 */
export default async function ProductImagesRedirectPage({
  params,
}: {
  params: Promise<{ customerId: string; storeId: string; productId: string }>;
}) {
  const { customerId, storeId, productId } = await params;
  redirect(`/dashboard/customers/${customerId}/stores/${storeId}/products/${productId}?tab=images`);
}
