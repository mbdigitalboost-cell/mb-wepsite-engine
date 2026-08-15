"use client";

// Client Component: phone/WhatsApp links fire tracking events on click.
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { track } from "@/lib/tracking/track";
import type { PetraNavLink } from "@/lib/data/petra/types";

export interface SiteFooterProps {
  siteName: string;
  tagline: string;
  logoSrcDark: string | null;
  logoSrcLight: string | null;
  navLinks: PetraNavLink[];
  phone: string | null;
  phoneDisplay: string | null;
  whatsappHref: string | null;
  email: string | null;
  address: string | null;
  serviceArea: string | null;
  workingHours: string | null;
  socialLinks: { platform: string; url: string; label: string }[];
}

/**
 * Every contact field renders conditionally — a field that's `null` in
 * `lib/data/petra/site-config.ts` simply doesn't appear, rather than
 * showing a placeholder-looking value. This is the pattern every future
 * customer's footer follows too.
 */
export function SiteFooter({
  siteName,
  tagline,
  logoSrcDark,
  logoSrcLight,
  navLinks,
  phone,
  phoneDisplay,
  whatsappHref,
  email,
  address,
  serviceArea,
  workingHours,
  socialLinks,
}: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-brand-background text-brand-foreground">
      <Container className="grid gap-12 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo
            background="dark"
            srcDark={logoSrcDark}
            srcLight={logoSrcLight}
            alt={siteName}
            wordmarkLines={["PETRA", "MÜHENDİSLİK"]}
          />
          <p className="mt-4 max-w-sm text-sm text-brand-muted">{tagline}</p>
          {socialLinks.length > 0 ? (
            <div className="mt-6 flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.platform}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-muted hover:text-white"
                >
                  {social.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <nav aria-label="Footer menü">
          <h2 className="text-sm font-semibold text-white">Site Haritası</h2>
          <ul className="mt-4 space-y-3">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-sm text-brand-muted hover:text-white">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold text-white">İletişim</h2>
          <ul className="mt-4 space-y-3 text-sm text-brand-muted">
            {phone ? (
              <li>
                <a
                  href={`tel:${phone}`}
                  onClick={() => track("phone_click", { source: "footer" })}
                  className="flex items-center gap-2 hover:text-white"
                >
                  <Icon icon={Phone} size="sm" />
                  {phoneDisplay}
                </a>
              </li>
            ) : null}
            {whatsappHref ? (
              <li>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("whatsapp_click", { source: "footer" })}
                  className="hover:text-white"
                >
                  WhatsApp&apos;tan Ulaş
                </a>
              </li>
            ) : null}
            {email ? (
              <li>
                <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-white">
                  <Icon icon={Mail} size="sm" />
                  {email}
                </a>
              </li>
            ) : null}
            {address ?? serviceArea ? (
              <li className="flex items-center gap-2">
                <Icon icon={MapPin} size="sm" />
                {address ?? serviceArea}
              </li>
            ) : null}
            {workingHours ? (
              <li className="flex items-center gap-2">
                <Icon icon={Clock} size="sm" />
                {workingHours}
              </li>
            ) : null}
          </ul>
        </div>
      </Container>

      <div className="border-t border-white/10 py-6">
        <Container className="flex flex-col items-center justify-between gap-2 text-xs text-brand-muted sm:flex-row">
          <p>
            © {year} {siteName}
          </p>
        </Container>
      </div>
    </footer>
  );
}
