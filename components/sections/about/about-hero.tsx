import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { HvacGridPattern } from "@/components/decorative/hvac-grid-pattern";
import { petraAboutHero } from "@/lib/data/petra/about";

/**
 * Hakkımızda sayfasına özel hero — genel `PageHeader` bileşeni yerine
 * (o bileşen sitedeki her "hazırlanıyor" sayfası için paylaşılan sade bir
 * başlık bloğu; burada değiştirilmedi, dokunulmadı). Bu, References/
 * WhyPetra section'larıyla aynı "çok düşük opasiteli teknik grid + soluk
 * kırmızı glow" dekoratif dilini kullanan, kendi başına bir bölüm —
 * gerçek bir ofis/ekip fotoğrafı yok (doğrulanmamış), bu yüzden tamamen
 * soyut/mühendislik motifli bir arka plan tercih edildi.
 */
export function AboutHero() {
  return (
    <section className="relative overflow-hidden border-b border-white/10 py-20 lg:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 right-[-10%] h-[460px] w-[460px] rounded-full bg-brand-primary/10 blur-[140px]" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[360px] w-[360px] rounded-full bg-brand-primary/[0.06] blur-[130px]" />
        <HvacGridPattern className="opacity-[0.035]" />
      </div>

      <Container className="relative">
        <Reveal>
          <span className="text-xs font-medium tracking-[0.2em] text-brand-primary uppercase">
            {petraAboutHero.eyebrow}
          </span>
          <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-brand-heading)] text-[38px] leading-[1.05] font-semibold text-white sm:text-[52px] lg:text-[68px]">
            {petraAboutHero.heading.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-xl text-base text-brand-muted sm:text-lg">{petraAboutHero.description}</p>
        </Reveal>
      </Container>
    </section>
  );
}
