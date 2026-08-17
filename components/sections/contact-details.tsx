"use client";

import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { track } from "@/lib/tracking/track";

export interface ContactDetailsProps {
  phone: string | null;
  phoneDisplay: string | null;
  whatsappHref: string | null;
  email: string | null;
  address: string | null;
  serviceArea: string | null;
  workingHours: string | null;
  mapUrl: string | null;
}

/**
 * Client Component because clicking phone/WhatsApp fires a tracking
 * event — kept as a small leaf component so the page around it
 * (app/(public)/iletisim/page.tsx) stays a Server Component.
 */
export function ContactDetails({
  phone,
  phoneDisplay,
  whatsappHref,
  email,
  address,
  serviceArea,
  workingHours,
  mapUrl,
}: ContactDetailsProps) {
  return (
    <div className="rounded-[var(--radius-brand)] border border-white/10 bg-brand-secondary/40 p-8">
      <h2 className="text-sm font-semibold tracking-[0.2em] text-white uppercase">İletişim Bilgileri</h2>
      <ul className="mt-6 space-y-5 text-sm text-brand-muted">
        {phone ? (
          <li>
            <a
              href={`tel:${phone}`}
              onClick={() => track("phone_click", { source: "contact_page" })}
              className="flex items-center gap-3 hover:text-white"
            >
              <Icon icon={Phone} />
              {phoneDisplay ?? phone}
            </a>
          </li>
        ) : null}
        {whatsappHref ? (
          <li>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("whatsapp_click", { source: "contact_page" })}
              className="flex items-center gap-3 hover:text-white"
            >
              <Icon icon={MessageCircle} />
              WhatsApp&apos;tan Ulaş
            </a>
          </li>
        ) : null}
        {email ? (
          <li>
            <a href={`mailto:${email}`} className="flex items-center gap-3 hover:text-white">
              <Icon icon={Mail} />
              {email}
            </a>
          </li>
        ) : null}
        {address ?? serviceArea ? (
          <li className="flex items-center gap-3">
            <Icon icon={MapPin} />
            {address ?? serviceArea}
            {mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("contact", { source: "contact_page_map" })}
                className="text-brand-primary hover:text-white"
              >
                Konumu Görüntüle
              </a>
            ) : null}
          </li>
        ) : mapUrl ? (
          <li>
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("contact", { source: "contact_page_map" })}
              className="flex items-center gap-3 hover:text-white"
            >
              <Icon icon={MapPin} />
              Konumu Görüntüle
            </a>
          </li>
        ) : null}
        {workingHours ? (
          <li className="flex items-center gap-3">
            <Icon icon={Clock} />
            {workingHours}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
