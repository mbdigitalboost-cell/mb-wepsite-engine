"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Icon } from "@/components/ui/icon";
import { SiteWorkLightbox } from "@/components/ui/site-work-lightbox";
import type { PetraSiteWork } from "@/lib/data/petra/site-works";

/**
 * `/projeler` sayfasının tam galerisi — ana sayfadaki "Sahadaki
 * Çalışmalarımız" seçkisinin (bkz. site-works-section.tsx) devamı,
 * kullanıcının sağladığı tüm gerçek saha görsel/videolarını (bkz.
 * lib/data/petra/site-works.ts) kapsar. Ana sayfadaki hiyerarşik
 * "1 büyük + küçükler" düzeninin aksine burada amaç "her şeyi göster"
 * olduğu için düzenli bir kart grid'i kullanılıyor — ama yine de aynı
 * hover/lightbox etkileşimiyle, düz bir fotoğraf duvarı hissi vermeden.
 */
export function SiteWorksGallery({ items }: { items: PetraSiteWork[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, index) => (
          <Reveal key={item.id} index={index % 8}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`${item.caption} — büyüt`}
              className="group relative aspect-square w-full overflow-hidden rounded-[var(--radius-brand)] border border-white/10 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            >
              <Image
                src={item.image}
                alt={item.caption}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                loading="lazy"
                className="object-cover transition-transform duration-500 ease-[var(--motion-easing)] group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/20" />
              {item.type === "video" ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                    <Icon icon={Play} size="sm" className="translate-x-0.5" />
                  </span>
                </div>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent p-3">
                <p className="text-xs text-white line-clamp-2">{item.caption}</p>
              </div>
            </button>
          </Reveal>
        ))}
      </div>

      <SiteWorkLightbox
        items={items}
        openIndex={openIndex}
        onClose={() => setOpenIndex(null)}
        onNavigate={setOpenIndex}
      />
    </>
  );
}
