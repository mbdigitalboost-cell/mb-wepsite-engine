import Link from "next/link";
import { Check } from "lucide-react";
import { storefrontDisplayClasses, storefrontMonoClasses } from "@/lib/utils/storefront-typography";

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
 *
 * Site geneli tasarım sistemi (Faz 12 devamı) — tasarım kanvasının "nokta +
 * bağlantı çizgisi" breadcrumb'ı: `activeStep`'ten KÜÇÜK her adım "tamamlandı"
 * (yeşil #3FA34D daire + check), `activeStep`'e EŞİT adım "aktif" (turuncu
 * dolgu), daha büyük adımlar "sırada" (ince border, soluk metin) — kanvasın
 * kendi iki sayfası arasındaki (SilahiniSec.dc.html / SilahiniSecSonuclar
 * .dc.html) küçük tutarsızlığı (bazen "sırada"ki adım da dolgulu
 * gösteriliyor) tekrarlanmadı, tek ve öngörülebilir bir kural tercih edildi
 * — görevin kendi "tamamlananda check, aktifte turuncu" talimatıyla hâlâ
 * birebir uyumlu.
 *
 * `brandName` verilip `activeStep > 1` ise 1. adım artık düz "Marka" değil
 * "Marka: {brandName}" (kanvasın SilahiniSecSonuclar.dc.html'deki kendi
 * deseni) ve markalar sayfasına geri dönen bir link — 2./3. adımlar hiçbir
 * zaman link değil (kendi başlarına anlamlı, parametresiz bir sayfaları
 * yok: model sayfası brandSlug'a, sonuçlar sayfası brandSlug+model'e
 * bağımlı).
 */
const STEP_LABELS = ["Marka", "Model", "Sonuçlar"] as const;

export function SilahiniSecBreadcrumb({
  storeSlug,
  activeStep,
  brandName,
}: {
  storeSlug: string;
  activeStep: 1 | 2 | 3;
  brandName?: string;
}) {
  return (
    <nav aria-label="Silahını Seç adımları" className="flex flex-wrap items-center gap-3">
      {STEP_LABELS.map((label, index) => {
        const step = (index + 1) as 1 | 2 | 3;
        const status = step < activeStep ? "done" : step === activeStep ? "active" : "upcoming";
        const displayLabel = step === 1 && brandName && status === "done" ? `Marka: ${brandName}` : label;

        const dot = (
          <span
            className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] ${storefrontMonoClasses} ${
              status === "done"
                ? "bg-[#3FA34D] text-[#06210c]"
                : status === "active"
                  ? "bg-[#D95F00] font-bold text-[#1A0D00]"
                  : "border-[1.5px] border-[#3A3A3A] text-[#6B6B6B]"
            }`}
          >
            {status === "done" ? <Check size={11} aria-hidden="true" /> : step}
          </span>
        );
        const labelClasses = `${storefrontDisplayClasses} text-[13px] font-semibold ${
          status === "upcoming" ? "text-[#6B6B6B]" : status === "active" ? "text-[#F5F5F5]" : "text-[#A3A3A3]"
        }`;

        return (
          <span key={label} className="flex items-center gap-3">
            {index > 0 ? <span aria-hidden="true" className="h-[1.5px] w-7 bg-[#3A3A3A]" /> : null}
            {step === 1 && status === "done" ? (
              <Link href={`/store/${storeSlug}/silahini-sec`} className="flex items-center gap-2">
                {dot}
                <span className={labelClasses}>{displayLabel}</span>
              </Link>
            ) : (
              <span className="flex items-center gap-2">
                {dot}
                <span className={labelClasses}>{displayLabel}</span>
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/** Model (2) ve sonuçlar (3) sayfalarında, o an hangi markanın seçili olduğunu gösteren küçük bir rozet. */
export function SelectedBrandChip({ brandName }: { brandName: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#292929] bg-[#171717] px-3 py-1 text-xs font-medium text-[#F5F5F5]">
      <Check size={12} className="text-[#D95F00]" aria-hidden="true" />
      {brandName}
    </span>
  );
}
