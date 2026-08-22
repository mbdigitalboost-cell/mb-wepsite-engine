import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { HvacGridPattern } from "@/components/decorative/hvac-grid-pattern";
import { SectionDivider } from "@/components/ui/section-divider";
import { petraFoundingStory } from "@/lib/data/petra/about";

/**
 * "Kuruluş Hikâyesi" — hero'nun hemen altında, kullanıcının verdiği
 * metinle birebir (bkz. lib/data/petra/about.ts). Sağdaki büyük soluk
 * "2017" rakamı ve teknik grid, References showcase'teki "büyük
 * tipografik numara" diliyle aynı — gerçek bir fotoğraf değil, sadece
 * kuruluş yılını vurgulayan dekoratif bir tipografi öğesi.
 */
export function FoundingStory() {
  return (
    <section className="relative overflow-hidden border-b border-white/10 py-20 lg:py-28">
      <SectionDivider />
      <Container className="relative grid grid-cols-1 items-start gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <Reveal>
          <h2 className="max-w-xl font-[family-name:var(--font-brand-heading)] text-[30px] leading-tight font-semibold text-white sm:text-[38px] lg:text-[42px]">
            {petraFoundingStory.heading}
          </h2>
          <div className="mt-6 flex flex-col gap-5">
            {petraFoundingStory.paragraphs.map((paragraph) => (
              <p key={paragraph} className="max-w-xl text-base leading-relaxed text-brand-muted">
                {paragraph}
              </p>
            ))}
          </div>
        </Reveal>

        <Reveal index={1} variant="scale-in">
          <div className="relative flex aspect-square max-w-sm items-center justify-center overflow-hidden rounded-[var(--radius-brand)] border border-white/10 bg-white/[0.02] lg:ml-auto">
            <HvacGridPattern className="opacity-[0.06]" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-brand-primary/10 blur-[100px]"
            />
            <span
              aria-hidden="true"
              className="relative font-[family-name:var(--font-brand-heading)] text-[120px] leading-none font-semibold text-white/[0.08] select-none sm:text-[160px]"
            >
              2017
            </span>
            <span className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs font-medium tracking-[0.2em] text-brand-primary uppercase">
              Kuruluş Yılı
            </span>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
