import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/ui/reveal";
import { WhyPetra } from "@/components/sections/why-petra";
import { EngineeringProcess } from "@/components/sections/engineering-process";
import { petraContactInfo } from "@/lib/data/petra/site-config";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description: "Petra Mühendislik — ısıtma, soğutma, havalandırma ve iklimlendirme çözümleri.",
  alternates: { canonical: "/hakkimizda" },
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Hakkımızda"
        title="Isıtma, Soğutma ve İklimlendirmede Mühendislik Yaklaşımı"
        description={
          petraContactInfo.serviceArea
            ? `${petraContactInfo.serviceArea} ve çevresinde konut ve ticari alanlar için profesyonel iklimlendirme çözümleri sunuyoruz.`
            : "Konut ve ticari alanlar için profesyonel iklimlendirme çözümleri sunuyoruz."
        }
      />
      <section className="pt-24">
        <Container>
          <Reveal>
            <p className="max-w-2xl text-base text-brand-muted">
              Satıştan keşfe, projelendirmeden kuruluma ve teknik servise kadar tüm süreci
              mühendislik bakış açısıyla tek elden yönetiyoruz.
            </p>
          </Reveal>
        </Container>
      </section>
      <EngineeringProcess />
      <WhyPetra />
    </>
  );
}
