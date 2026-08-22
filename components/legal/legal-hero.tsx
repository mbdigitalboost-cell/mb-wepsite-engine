import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { HvacGridPattern } from "@/components/decorative/hvac-grid-pattern";

interface LegalHeroProps {
  title: string;
  lastUpdated: string;
}

/**
 * Yasal sayfalar için paylaşılan hero — `LegalPlaceholder`in yerini alan
 * 4 sayfada (Gizlilik/KVKK/Çerez/Kullanım Şartları) kullanılır. Diğer
 * "premium" section'larla (AboutHero, References) aynı çok düşük
 * opasiteli teknik grid + soluk kırmızı glow dilini taşır, böylece bu
 * sayfalar sitenin geri kalanından kopuk/sade bir placeholder gibi
 * görünmez. Görünür bir "breadcrumb" metni + eyebrow etiketi içerir;
 * ayrıca SEO için `petraBreadcrumbStructuredData` JSON-LD'si sayfa
 * bileşeninde ayrıca eklenir (bkz. app/(public)/gizlilik-politikasi/page.tsx
 * ve kardeşleri).
 */
export function LegalHero({ title, lastUpdated }: LegalHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-white/10 py-16 lg:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-[-10%] h-[360px] w-[360px] rounded-full bg-brand-primary/[0.08] blur-[130px]" />
        <HvacGridPattern className="opacity-[0.03]" />
      </div>

      <Container className="relative">
        <Reveal>
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-brand-muted">
            <Link href="/" className="transition-colors hover:text-white">
              Ana Sayfa
            </Link>
            <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
            <span className="text-white/70">Yasal</span>
            <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
            <span className="text-brand-primary">{title}</span>
          </nav>

          <span className="mt-6 block text-xs font-medium tracking-[0.2em] text-brand-primary uppercase">Yasal</span>
          <h1 className="mt-3 max-w-2xl font-[family-name:var(--font-brand-heading)] text-[32px] leading-[1.1] font-semibold text-white sm:text-[42px] lg:text-[52px]">
            {title}
          </h1>
          <p className="mt-4 text-sm text-brand-muted">
            Son Güncelleme: <span className="text-white/70">{lastUpdated}</span>
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
