"use client";

import { Phone, MessageCircle, ClipboardList } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { track } from "@/lib/tracking/track";
import { cn } from "@/lib/utils/cn";

export interface MobileStickyCtaProps {
  phone: string | null;
  whatsapp: string | null;
  quoteHref: string;
}

/**
 * Fixed bottom action bar for mobile — the brief's highest-priority
 * conversion surface (visitors arriving from ads/Instagram/WhatsApp need
 * phone/WhatsApp within one tap). Respects safe-area-inset so it never
 * overlaps home-indicator gestures, and never covers page content because
 * the layout reserves space for it (see app/(public)/layout.tsx).
 *
 * Call and WhatsApp buttons render only when a real number exists — no
 * placeholder phone number is ever shown.
 */
export function MobileStickyCta({ phone, whatsapp, quoteHref }: MobileStickyCtaProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/10 bg-brand-background/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {phone ? (
        <a
          href={`tel:${phone}`}
          onClick={() => track("phone_click", { source: "mobile_sticky_cta" })}
          className="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium text-white"
        >
          <Icon icon={Phone} size="sm" />
          Ara
        </a>
      ) : null}

      {whatsapp ? (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("whatsapp_click", { source: "mobile_sticky_cta" })}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium text-white",
            phone && "border-x border-white/10",
          )}
        >
          <Icon icon={MessageCircle} size="sm" />
          WhatsApp
        </a>
      ) : null}

      <a
        href={quoteHref}
        onClick={() => track("quote_request", { source: "mobile_sticky_cta" })}
        className="flex flex-1 flex-col items-center gap-1 bg-brand-primary py-3 text-xs font-medium text-white"
      >
        <Icon icon={ClipboardList} size="sm" />
        Teklif Al
      </a>
    </div>
  );
}
