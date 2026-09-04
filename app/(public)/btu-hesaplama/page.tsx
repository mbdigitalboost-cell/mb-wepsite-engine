import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/ui/reveal";
import { BtuCalculator } from "@/components/btu/btu-calculator";

export const metadata: Metadata = {
  title: "Klima BTU Hesaplama",
  description: "Alan, bölge ve kullanım koşullarınıza göre yaklaşık klima BTU ihtiyacınızı hesaplayın.",
  alternates: { canonical: "/btu-hesaplama" },
};

export default function BtuCalculatorPage() {
  return (
    <>
      <PageHeader
        eyebrow="BTU Hesaplama"
        title="Yaklaşık Klima İhtiyacınızı Hesaplayın"
        description="Alan, bölge ve kullanım bilgilerinizi girin — size uygun standart klima kapasitesi hakkında ön bir fikir verelim."
      />
      <section className="py-24 lg:py-32">
        <Container>
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <BtuCalculator />
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
