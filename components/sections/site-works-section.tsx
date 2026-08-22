"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SiteWorkLightbox } from "@/components/ui/site-work-lightbox";
import { petraSiteWorksFeatured } from "@/lib/data/petra/site-works";

/**
 * "Sahadaki Çalışmalarımız" — Petra'nın kendi ekibinin çektiği gerçek
 * saha/kurulum fotoğraf ve videolarından bir seçki (bkz.
 * lib/data/petra/site-works.ts'in doğrulama notları). Amaç görsel
 * doldurmak değil, "bu işleri gerçekten sahada yapmışlar" güvenini
 * vermek — bu yüzden düz bir 3x3 grid yerine hiyerarşik bir "öne çıkan
 * çalışma" düzeni kullanılıyor: 1 büyük + 4 küçük kart.
 *
 * Scroll akışındaki yeri: "Neden Petra?" bölümünün hemen altına,
 * "Referanslarımız" bölümünün hemen üstüne bilinçli olarak yerleştirildi
 * — kurumsal/isimli referanslardan (ReferencesSection) FARKLI bir
 * güven sinyali: burada ham, düzenlenmemiş saha kanıtı var, orada
 * kurumsal/isimli referans listesi var. İkisi birbirinin yerine
 * geçmiyor, art arda güveni pekiştiriyor.
 */
export function SiteWorksSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const items = petraSiteWorksFeatured;
  const [large, ...rest] = items;

  if (!large) return null;

  return (
    <section className="border-t border-white/10 py-24 lg:py-32">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium tracking-[0.2em] text-brand-primary uppercase">
            Gerçek Uygulamalar
          </span>
          <h2 className="mt-4 font-[family-name:var(--font-brand-heading)] text-[32px] leading-tight font-semibold text-white sm:text-[42px] lg:text-[44px]">
            Projelerimizi sahada gösteriyoruz.
          </h2>
          <p className="mt-4 text-sm text-brand-muted">
            Petra Mühendislik olarak farklı ölçeklerde gerçekleştirdiğimiz iklimlendirme ve mekanik sistem
            uygulamalarından seçilmiş gerçek saha görüntüleri.
          </p>
        </Reveal>

        <Reveal index={1} variant="scale-in" className="mt-12">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SiteWorkTile item={large} large onOpen={() => setOpenIndex(0)} />

            <div className="grid grid-cols-2 gap-4">
              {rest.map((item, index) => (
                <SiteWorkTile key={item.id} item={item} onOpen={() => setOpenIndex(index + 1)} />
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal index={2} className="mt-10 flex justify-center">
          <Button href="/projeler" variant="outline" size="lg" showArrow className="text-white">
            Daha Fazla Referans
          </Button>
        </Reveal>
      </Container>

      <SiteWorkLightbox
        items={items}
        openIndex={openIndex}
        onClose={() => setOpenIndex(null)}
        onNavigate={setOpenIndex}
      />
    </section>
  );
}

function SiteWorkTile({
  item,
  large = false,
  onOpen,
}: {
  item: (typeof petraSiteWorksFeatured)[number];
  large?: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${item.caption} — büyüt`}
      className={`group relative w-full overflow-hidden rounded-[var(--radius-brand)] border border-white/10 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${
        large ? "aspect-[4/3] lg:aspect-auto lg:h-full" : "aspect-square"
      }`}
    >
      <Image
        src={item.image}
        alt={item.caption}
        fill
        sizes={large ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 1024px) 50vw, 25vw"}
        loading="lazy"
        className="object-cover transition-transform duration-500 ease-[var(--motion-easing)] group-hover:scale-[1.04]"
      />

      <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/20" />

      {item.type === "video" ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
            <Icon icon={Play} size="md" className="translate-x-0.5" />
          </span>
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent p-4">
        <p className={`text-white ${large ? "text-sm sm:text-base" : "text-xs"} line-clamp-2`}>{item.caption}</p>
      </div>

      <span className="absolute top-3 right-3 flex h-8 w-8 translate-x-1 items-center justify-center rounded-full border border-white/30 bg-black/30 text-white opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:border-brand-primary group-hover:opacity-100">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M7 17L17 7M17 7H9M17 7V15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
