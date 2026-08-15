"use client";

import { Phone } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { DesktopNav } from "@/components/navigation/desktop-nav";
import { MobileNav } from "@/components/navigation/mobile-nav";
import { useScrolledPast } from "@/lib/motion/use-scrolled-past";
import { track } from "@/lib/tracking/track";
import { cn } from "@/lib/utils/cn";
import type { PetraNavLink } from "@/lib/data/petra/types";

export interface SiteHeaderProps {
  siteName: string;
  logoSrcDark: string | null;
  logoSrcLight: string | null;
  navLinks: PetraNavLink[];
  phone: string | null;
  phoneDisplay: string | null;
  ctaLabel: string;
  ctaHref: string;
  whatsappHref: string | null;
  /** Renders transparent-over-hero at the top, opaque+blurred once scrolled. Set false for non-hero pages. */
  transparentAtTop?: boolean;
}

/**
 * Premium sticky header: transparent over the hero, dark + blurred once
 * scrolled. Content (logo/nav/CTA) is entirely prop-driven — no Petra
 * copy is hardcoded here — so the same component works for the next
 * Website Engine customer with a different `SiteHeaderProps`.
 */
export function SiteHeader({
  siteName,
  logoSrcDark,
  logoSrcLight,
  navLinks,
  phone,
  phoneDisplay,
  ctaLabel,
  ctaHref,
  whatsappHref,
  transparentAtTop = true,
}: SiteHeaderProps) {
  const scrolled = useScrolledPast(24);
  const solid = !transparentAtTop || scrolled;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
        solid
          ? "border-white/10 bg-brand-background/90 backdrop-blur-md"
          : "border-transparent bg-transparent",
      )}
    >
      <Container className="flex h-20 items-center justify-between py-3">
        <Logo
          background="dark"
          srcDark={logoSrcDark}
          srcLight={logoSrcLight}
          alt={siteName}
          wordmarkLines={["PETRA", "MÜHENDİSLİK"]}
        />

        <DesktopNav links={navLinks} />

        <div className="flex items-center gap-4">
          {phone ? (
            <a
              href={`tel:${phone}`}
              onClick={() => track("phone_click", { source: "header" })}
              className="hidden items-center gap-2 text-sm font-medium text-white lg:flex"
            >
              <Icon icon={Phone} size="sm" className="text-brand-primary" />
              {phoneDisplay}
            </a>
          ) : null}

          {/*
            Visibility toggled on a wrapper, not on Button's own className:
            Button's base classes always include `inline-flex`, which in
            the compiled stylesheet can win over a `hidden` passed via
            className regardless of HTML class order (Tailwind utilities
            have equal specificity — source order in the stylesheet
            decides ties, not the order classes appear on the element).
          */}
          <div className="hidden lg:block">
            <Button
              href={ctaHref}
              size="sm"
              onClick={() => track("generate_lead", { source: "header" })}
            >
              {ctaLabel}
            </Button>
          </div>

          <MobileNav links={navLinks} ctaLabel={ctaLabel} ctaHref={ctaHref} whatsappHref={whatsappHref} />
        </div>
      </Container>
    </header>
  );
}
