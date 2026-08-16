"use client";

import { MessageCircle } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { track } from "@/lib/tracking/track";

export interface FloatingWhatsappButtonProps {
  whatsappHref: string | null;
}

/**
 * Fixed, always-visible WhatsApp entry point on the right edge of the
 * viewport — separate from components/navigation/mobile-sticky-cta.tsx's
 * bottom bar (which is mobile-only, `lg:hidden`, and already has its own
 * WhatsApp tap target). This one covers desktop/tablet, where the sticky
 * bottom bar doesn't render, so every breakpoint has one always-visible,
 * one-tap WhatsApp entry point — never both stacked on the same screen.
 *
 * Renders nothing when there's no real WhatsApp number configured (see
 * lib/data/petra/site-config.ts's `whatsapp` field) — same
 * no-placeholder-contact rule as every other contact CTA in this app.
 */
export function FloatingWhatsappButton({ whatsappHref }: FloatingWhatsappButtonProps) {
  if (!whatsappHref) return null;

  return (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("whatsapp_click", { source: "floating_button" })}
      aria-label="WhatsApp'tan yazın"
      className="fixed right-6 bottom-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/30 transition-transform hover:scale-105 lg:flex"
    >
      <Icon icon={MessageCircle} size="md" />
    </a>
  );
}
