import { Inter } from "next/font/google";
import { Check } from "lucide-react";

const inter = Inter({ subsets: ["latin"], weight: ["400", "600"] });

/**
 * "Silahını Seç" akışı (marka → model → sonuçlar) v2 koyu tema geçişi.
 * TENANT-BAĞIMSIZ, GENEL bir bileşen — Faz 7.3'ün homepage bölümlerinin
 * aksine (o bilinçli olarak taktikalp46-homepage-sections.tsx adında AYRI,
 * Taktikalp46'ya özel bir dosyaya alınmıştı) bu akışın 3 sayfası da
 * (silahini-sec/{page.tsx,[brandSlug]/page.tsx,[brandSlug]/sonuclar/page.tsx})
 * hiçbir tenant'a özel hardcoded içerik taşımıyor — hepsi store-scoped
 * sorgularla (getPublicBrandsWithProducts/getPublicBrandBySlug/
 * getPublicBrandModels/getPublicProducts) çalışıyor. Bu yüzden bu koyu tema
 * restili de (header/duyuru şeridi restiliyle AYNI gerekçeyle) GENEL bir
 * değişiklik: ileride ikinci bir mağaza bu akışı kullanırsa o da otomatik
 * olarak koyu temalı gelir.
 */
const STEPS = ["Marka", "Model", "Sonuçlar"] as const;

export function SilahiniSecBreadcrumb({ activeStep }: { activeStep: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Silahını Seç adımları" className={`${inter.className} flex items-center gap-1.5 text-xs text-[#A3A3A3]`}>
      {STEPS.map((label, index) => {
        const step = (index + 1) as 1 | 2 | 3;
        const isActive = step === activeStep;
        return (
          <span key={label} className="flex items-center gap-1.5">
            {index > 0 ? <span aria-hidden="true">·</span> : null}
            <span className={isActive ? "font-semibold text-[#F5F5F5]" : undefined}>
              {step}. {label}
            </span>
          </span>
        );
      })}
    </nav>
  );
}

/** Model (2) ve sonuçlar (3) sayfalarında, o an hangi markanın seçili olduğunu gösteren küçük bir rozet — görevin kendi "checkmark ikonu, #D95F00 dolgu" talimatı. */
export function SelectedBrandChip({ brandName }: { brandName: string }) {
  return (
    <span
      className={`${inter.className} inline-flex items-center gap-1.5 rounded-full border border-[#292929] bg-[#171717] px-3 py-1 text-xs font-medium text-[#F5F5F5]`}
    >
      <Check size={12} className="text-[#D95F00]" aria-hidden="true" />
      {brandName}
    </span>
  );
}
