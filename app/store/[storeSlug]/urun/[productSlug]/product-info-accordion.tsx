"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { storefrontDisplayClasses } from "@/lib/utils/storefront-typography";

interface AccordionItem {
  label: string;
  content: string;
}

/**
 * Devir metni v2 — kanvasta (UrunDetay.dc.html) ürün başlığının altında
 * 3 satırlı bir accordion var: "Ürün Detayları" (açık), "Kargo & İade"
 * (kapalı), "Yorumlar (24)" (kapalı). Kanvas statik bir mockup olduğu
 * için bu üç satır da gerçekte TIKLANAMIYORDU (sabit açık/kapalı
 * görünüm) — burada GERÇEK kod olduğu için gerçekten tıklanabilir bir
 * accordion yazıldı (yeni bir state, ama altında hiçbir mevcut iş
 * mantığına dokunulmadı — bu sayfanın başka hiçbir yerinde accordion
 * state'i yoktu).
 *
 * "Yorumlar (24)" gibi bir sayı YAZILMADI — platformda hiç ürün
 * değerlendirme/yıldız sistemi yok (confirmed, Faz 7.3 roadmap'inin
 * kendi notu), uydurma bir sayı koymak bu turun kendi "gerçek olmayan
 * iddia yazma" kuralını ihlal ederdi. Yorumlar paneli bunun yerine nötr,
 * dürüst bir "Henüz değerlendirme yok." mesajı gösteriyor.
 */
export function ProductInfoAccordion({ items }: { items: AccordionItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mt-8 border-t border-[#292929]">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.label} className="border-b border-[#292929]">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between py-4 text-left"
            >
              <span className={`${storefrontDisplayClasses} text-sm font-semibold ${isOpen ? "text-[#F5F5F5]" : "text-[#6B6B6B]"}`}>
                {item.label}
              </span>
              <ChevronDown
                size={15}
                className={`shrink-0 transition-transform ${isOpen ? "rotate-180 text-[#D95F00]" : "text-[#6B6B6B]"}`}
                aria-hidden="true"
              />
            </button>
            {isOpen ? <p className="pb-4 text-sm leading-relaxed text-[#A3A3A3]">{item.content}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
