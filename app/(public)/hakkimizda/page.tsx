import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { AboutHero } from "@/components/sections/about/about-hero";
import { FoundingStory } from "@/components/sections/about/founding-story";
import { Timeline } from "@/components/sections/about/timeline";
import { ApproachCards } from "@/components/sections/about/approach-cards";
import { WhyPetra } from "@/components/sections/why-petra";
import { petraAboutCta } from "@/lib/data/petra/about";
import { petraContactInfo } from "@/lib/data/petra/site-config";
import { buildWhatsappHref } from "@/lib/data/petra/whatsapp";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description:
    "Petra Mühendislik — 2017'de Kahramanmaraş'ta kurulan, ısıtma, soğutma ve iklimlendirme alanında mühendislik yaklaşımıyla çalışan bir firma.",
  alternates: { canonical: "/hakkimizda" },
};

/**
 * Hakkımızda sayfası revizyonu (2026-08-19 briefi). Önceki sürüm tek bir
 * `PageHeader` + kısa bir paragraf + anasayfadaki `EngineeringProcess`
 * bölümünün tekrarından ibaretti ("fazla boş"). Bu sürüm: özel hero →
 * kuruluş hikâyesi → zaman çizelgesi (2017 / Bugün) → "Mühendislik
 * Yaklaşımımız" (4 kart, sayfaya özel) → "Neden Petra?" (mevcut
 * `WhyPetra`, artık hafif mouse-parallax ile) → özel CTA.
 *
 * `EngineeringProcess` (anasayfadaki "Sadece Klima Değil...") artık bu
 * sayfada YOK — aynı 4-kart "sürecimiz" fikrini burada zaten yeni
 * "Mühendislik Yaklaşımımız" bölümü (farklı, sayfaya özel metinlerle)
 * anlatıyor; iki neredeyse aynı bölümü üst üste göstermek yerine tek,
 * bu sayfaya özgü bir versiyon tercih edildi. Anasayfadaki
 * `EngineeringProcess` kullanımı ve verisi hiç değişmedi.
 *
 * Tüm kurumsal metinler kullanıcının 2026-08-19 briefinde verdiği
 * bilgilerle sınırlı (2017 Kahramanmaraş kuruluşu, süreç bütünlüğü) —
 * çalışan sayısı, ciro, proje sayısı, deneyim yılı, sertifika, ödül,
 * bayilik/distribütörlük, marka ortaklığı gibi hiçbir doğrulanmamış veri
 * eklenmedi (bkz. lib/data/petra/about.ts dosya başlığı).
 */
export default function AboutPage() {
  const whatsappHref = buildWhatsappHref(petraContactInfo.whatsapp);

  return (
    <>
      <AboutHero />
      <FoundingStory />
      <Timeline />
      <ApproachCards />
      <WhyPetra />

      <section className="border-b border-white/10 py-24 text-center lg:py-32">
        <Container>
          <Reveal>
            <h2 className="mx-auto max-w-2xl font-[family-name:var(--font-brand-heading)] text-[32px] leading-tight font-semibold text-white sm:text-[42px] lg:text-[52px]">
              {petraAboutCta.headingLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-sm text-brand-muted sm:text-base">{petraAboutCta.description}</p>
          </Reveal>

          <Reveal index={1} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href={petraAboutCta.ctaPrimaryHref} size="lg" showArrow>
              {petraAboutCta.ctaPrimaryLabel}
            </Button>
            <Button
              href={whatsappHref ?? "/iletisim"}
              external={Boolean(whatsappHref)}
              variant="outline"
              size="lg"
              className="text-white"
            >
              {petraAboutCta.ctaSecondaryLabel}
            </Button>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
