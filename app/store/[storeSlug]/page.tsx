import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getPublicStoreProfile } from "@/lib/commerce/public/profile";
import { getPublicStoreNavigation } from "@/lib/commerce/public/navigation";
import { getPublicStoreHomepageSections } from "@/lib/commerce/public/homepage";
import { getPublicProducts } from "@/lib/commerce/public/products";
import { StoreHomepageSections } from "@/components/commerce/public/homepage-sections/store-homepage-sections";
import { ProductGrid } from "@/components/commerce/public/product-grid";
import { Container } from "@/components/ui/container";

/**
 * FAZ 7.3 — v2 hero tasarımı SADECE bu sayfaya özel bir başlık fontu
 * istiyor (Space Grotesk); platform genelinde henüz bir ThemeProvider/
 * BrandTheme font sistemi storefront'a bağlanmadığı için (bkz. aşağıdaki
 * eski FAZ 2C-3 STEP 22 notu, hâlâ doğru) global bir font eklemek yerine
 * bu dosyaya scoped next/font/google kullanılıyor — Petra'ya ya da panel'e
 * hiç dokunmuyor.
 */
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"] });

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

      {/*
        FAZ 7.2 — checked first, per that phase's own explicit "silip
        yeniden icat etme" instruction: queried this store's own
        store_homepage_sections rows directly and confirmed neither button
        exists there (the store's one "cta" section has an empty config
        and a null link_url — that section type has no button support at
        all, only "hero" does, see homepage-section.ts's own config
        schemas) nor anywhere else in this codebase (grepped for the exact
        Turkish text first). These two buttons were added plain, NOT wired
        into the generic, tenant-agnostic StoreHomepageSections renderer
        above (deliberately — "Silahını Seç" is Taktikalp46-specific copy,
        not a generic CMS section type).

        FAZ 7.3 — same block, same two <Link> targets
        (silahini-sec / kategoriler), now expanded into a full v2 hero:
        real product photo background + gradient overlay + headline/
        subhead + restyled buttons. Colors are literal v2 hex values, not
        bg-brand-* tokens — the storefront has no ThemeProvider wired up
        yet (still true, see the file-level comment above), so there is no
        brand token to route through; hardcoding here matches this
        phase's own "sadece JSX/CSS" scope. The big headline below is a
        <p>, not an <h1> — the Container above already renders this
        page's one semantic <h1> ({"{profile?.displayName ?? store.name}"});
        adding a second <h1> here would be an accessibility regression
        this phase never asked for.
      */}
      <section className="relative isolate overflow-hidden bg-neutral-950">
        <div className="relative h-[560px] w-full sm:h-[640px] lg:h-[720px]">
          <Image
            src="/images/hero/kydex-sarjor-kilifi-hero.jpg"
            alt="Taktikalp46 Kydex şarjör kılıfı, taktik kemer üzerinde"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[65%_25%] sm:object-[75%_30%]"
          />
          {/* v2 palette — soldan sağa koyulaşan gradient, okunabilirlik için */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.65) 45%, rgba(10,10,10,0.2) 100%)",
            }}
          />
          {/* Dar ekranda yatay gradient metnin arkasını yeterince koyultmuyor — ek, tam kaplayan bir scrim */}
          <div aria-hidden="true" className="absolute inset-0 bg-black/35 sm:hidden" />

          <div className="relative flex h-full items-end sm:items-center">
            <Container className="pb-10 sm:pb-0">
              <p
                className={`${spaceGrotesk.className} max-w-2xl text-3xl font-bold uppercase leading-tight text-white sm:text-5xl lg:text-6xl`}
              >
                TAKTİKALP46 <span className="text-[#D95F00]">GÜVENLE TAŞI.</span>
              </p>
              <p className="mt-4 max-w-md text-sm text-white/80 sm:text-base lg:text-lg">
                Kydex&apos;in hassasiyeti. Sahaya hazır performans.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={`/store/${storeSlug}/silahini-sec`}
                  className={`${spaceGrotesk.className} inline-flex h-14 w-full items-center justify-center rounded-md bg-[#D95F00] px-8 text-base font-semibold text-white transition-colors hover:bg-[#F26A00] sm:w-auto`}
                >
                  Silahını Seç
                </Link>
                <Link
                  href={`/store/${storeSlug}/kategoriler`}
                  className={`${spaceGrotesk.className} inline-flex h-14 w-full items-center justify-center rounded-md border-2 border-white px-8 text-base font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto`}
                >
                  Tüm Kategoriler
                </Link>
              </div>
            </Container>
          </div>
        </div>
      </section>

      <Container className="py-10">
        <h2 className="text-lg font-semibold text-foreground">Ürünler</h2>
        <ProductGrid storeSlug={storeSlug} products={featuredProducts} />
      </Container>
    </div>
  );
}
