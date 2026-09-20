import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getPublicStoreProfile } from "@/lib/commerce/public/profile";
import { getPublicStoreNavigation } from "@/lib/commerce/public/navigation";
import { getPublicStoreHomepageSections } from "@/lib/commerce/public/homepage";
import { getPublicProducts } from "@/lib/commerce/public/products";
import { StoreHomepageSections } from "@/components/commerce/public/homepage-sections/store-homepage-sections";
import { ProductGrid } from "@/components/commerce/public/product-grid";
import { Container } from "@/components/ui/container";

/**
 * FAZ 2C-3 STEP 22 — Taktikalp46 / multi-tenant commerce storefront
 * homepage. Lives under `app/store/[storeSlug]/`, a route tree entirely
 * separate from `app/(public)/` (Petra's own routes) — zero shared files,
 * per this phase's own "DO NOT TOUCH PETRA" scope.
 *
 * This is a functional shell, not a redesign: it proves the full read
 * chain (store resolution → profile/nav/homepage-sections/featured
 * products) works end to end, using the existing generic root layout
 * (app/layout.tsx, already engine-neutral, already wraps /dashboard and
 * /login) and existing shared primitives (Container). Store branding
 * (colors/typography) is intentionally NOT applied to rendering yet —
 * that's a real follow-up (a per-store ThemeProvider), out of this
 * phase's "no redesign" instruction.
 */
export default async function StoreHomePage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;

  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const [profile, mainNav, sections, featuredProducts] = await Promise.all([
    getPublicStoreProfile(store.id),
    getPublicStoreNavigation(store.id, "main"),
    getPublicStoreHomepageSections(store.id),
    getPublicProducts(store.id),
  ]);

  return (
    <div>
      <Container className="py-6">
        <h1 className="text-2xl font-semibold text-foreground">{profile?.displayName ?? store.name}</h1>
        {mainNav.length > 0 ? (
          <nav className="mt-3 flex flex-wrap gap-4 text-sm">
            {mainNav.map((item) => (
              <a key={item.id} href={item.url} className="text-foreground/70 hover:text-foreground hover:underline">
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}
      </Container>

      <StoreHomepageSections sections={sections} />

      <Container className="py-10">
        <h2 className="text-lg font-semibold text-foreground">Ürünler</h2>
        <ProductGrid storeSlug={storeSlug} products={featuredProducts} />
      </Container>
    </div>
  );
}
