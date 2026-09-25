import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { Container } from "@/components/ui/container";
import { CartList } from "./cart-list";

/**
 * FAZ 1 (mağaza sepeti/configurator) — cart page. This Server Component
 * only resolves the store (same notFound()-on-missing pattern every other
 * page under app/store/[storeSlug]/** already uses) — the actual cart
 * content is entirely client-side (localStorage via CartProvider, mounted
 * in the parent layout), so it's rendered by CartList, a colocated "use
 * client" component, same split as the rest of this codebase (e.g.
 * product-tabs.tsx next to its own page.tsx).
 */
export default async function StoreCartPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;

  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  return (
    <Container className="py-10">
      <h1 className="text-2xl font-semibold text-foreground">Sepetim</h1>
      <CartList storeSlug={storeSlug} />
    </Container>
  );
}
