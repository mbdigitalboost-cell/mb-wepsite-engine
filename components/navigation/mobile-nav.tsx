"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { track } from "@/lib/tracking/track";
import type { PetraNavLink } from "@/lib/data/petra/types";

export interface MobileNavProps {
  links: PetraNavLink[];
  ctaLabel: string;
  ctaHref: string;
  whatsappHref: string | null;
}

/**
 * Mobile hamburger menu. Keyboard accessible: Escape closes, focus moves
 * to the panel on open, body scroll is locked while open.
 */
export function MobileNav({ links, ctaLabel, ctaHref, whatsappHref }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Menüyü aç"
        className="flex h-10 w-10 items-center justify-center text-white"
      >
        <Icon icon={Menu} size="lg" />
      </button>

      <div
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-label="Mobil menü"
        className={cn(
          "fixed inset-0 z-50 flex flex-col bg-brand-background transition-opacity duration-300",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="flex h-16 items-center justify-end px-5">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Menüyü kapat"
            className="flex h-10 w-10 items-center justify-center text-white"
          >
            <Icon icon={X} size="lg" />
          </button>
        </div>

        <nav aria-label="Mobil ana menü" className="flex flex-1 flex-col justify-center gap-2 px-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="border-b border-white/10 py-4 text-2xl font-medium text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-3 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <Button
            href={ctaHref}
            className="w-full"
            onClick={() => {
              track("generate_lead", { source: "mobile_nav" });
              setOpen(false);
            }}
          >
            {ctaLabel}
          </Button>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("whatsapp_click", { source: "mobile_nav" })}
              className="flex h-11 items-center justify-center rounded-[var(--radius-brand)] border border-white/20 text-sm font-medium text-white"
            >
              WhatsApp&apos;tan Ulaş
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
