import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { petraBrands, type PetraBrand } from "@/lib/data/petra/brands";
import { BrandsSlider } from "@/components/sections/brands-slider";

interface BrandsSectionProps {
  /**
   * Optional CMS-sourced override — defaults to the static `petraBrands`
   * import when omitted, so every existing call site (and any future one
   * that doesn't pass this) renders exactly as before. See
   * components/sections/hero.tsx / product-showcase-section.tsx for the
   * same pattern. Faz 6 (migration 0011): if the list is empty (e.g. an
   * admin archives every brand), the section renders nothing at all —
   * a slider with zero cards would show an empty strip with non-functional
   * arrow buttons, which is worse than hiding the whole section.
   */
  brands?: PetraBrand[];
}

/**
 * Faz H: Mitsubishi Heavy bölümünün hemen altına eklenen, Petra'nın
 * çalıştığı 9 markayı (Mitsubishi Heavy, Samsung, Gree, EuroForm, Haier,
 * Midea, Hisense, Vestel, Systemair) gösteren ayrı bölüm. Mevcut tekli
 * Mitsubishi model slider'ı (MitsubishiSection/MitsubishiSlider) bilinçli
 * olarak korunuyor — bu, onun yerine geçmiyor, ek bir bölüm.
 */
export function BrandsSection({ brands = petraBrands }: BrandsSectionProps) {
  if (brands.length === 0) return null;

  return (
    <section className="border-t border-white/10 bg-brand-secondary py-24 lg:py-32">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium tracking-[0.2em] text-brand-primary uppercase">Markalar</span>
          <h2 className="mt-4 font-[family-name:var(--font-brand-heading)] text-[32px] leading-tight font-semibold text-white sm:text-[42px]">
            Çalıştığımız Markalar
          </h2>
          <p className="mt-4 text-sm text-brand-muted">
            Petra Mühendislik, ihtiyaca en uygun çözümü sunabilmek için farklı markalarda geniş bir ürün
            yelpazesiyle çalışır.
          </p>
        </Reveal>

        <Reveal index={1} className="mt-12">
          <BrandsSlider brands={brands} />
        </Reveal>
      </Container>
    </section>
  );
}
