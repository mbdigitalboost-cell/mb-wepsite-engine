import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { petraProductShowcase, type PetraShowcaseProduct } from "@/lib/data/petra/product-showcase";
import { ProductShowcaseSlider } from "@/components/sections/product-showcase-slider";

interface ProductShowcaseSectionProps {
  /** Optional CMS-sourced override — defaults to the static `petraProductShowcase` import. See components/sections/hero.tsx for the same pattern. */
  products?: PetraShowcaseProduct[];
}

/**
 * Faz H-devam: `MitsubishiSection`'ın hemen altına eklenen, diğer 8
 * markanın (EuroForm, Gree, Haier, Hisense, Midea, Samsung, Systemair,
 * Vestel) gerçek ürün fotoğraflarını aynı görsel dilde (sol metin + sağ
 * slider) gösteren bölüm. Mitsubishi Heavy'nin kendi bölümü/slider'ı
 * bilinçli olarak dokunulmadan korundu — bu, onun yerine geçmiyor.
 */
export function ProductShowcaseSection({ products = petraProductShowcase }: ProductShowcaseSectionProps) {
  return (
    <section className="border-t border-white/10 bg-brand-secondary py-24 lg:py-32">
      <Container className="grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <span className="text-xs font-medium tracking-[0.2em] text-brand-primary uppercase">Ürün Yelpazesi</span>
          <h2 className="mt-4 font-[family-name:var(--font-brand-heading)] text-[32px] leading-tight font-semibold text-white sm:text-[42px]">
            Farklı markalardan geniş seçenekler.
          </h2>
          <p className="mt-4 max-w-md text-sm text-brand-muted">
            Petra Mühendislik, ihtiyaca en uygun çözümü sunabilmek için Mitsubishi Heavy&rsquo;nin yanı sıra farklı
            markalardan da ürünler sunar ve kurulumunu gerçekleştirir.
          </p>
          <Button
            href="/cozumler"
            variant="outline"
            className="mt-8 text-white"
            showArrow
            trackEvent="service_view"
            trackPayload={{ source: "product_showcase_section" }}
          >
            Ürünleri İncele
          </Button>
        </Reveal>

        <Reveal index={1}>
          <ProductShowcaseSlider products={products} />
        </Reveal>
      </Container>
    </section>
  );
}
