import type { ReactNode } from "react";
import type { PublicHomepageSection } from "@/lib/commerce/public/homepage";

/**
 * FAZ 1C — Homepage CMS public consumer.
 *
 * Generic, tenant-agnostic renderer for the rows returned by
 * `getPublicStoreHomepageSections(storeId)`
 * (lib/commerce/public/homepage.ts — REUSED as-is, NOT modified by this
 * phase). Takes an already-fetched section list; it does not query
 * Supabase itself, so it has no opinion on which store/tenant it belongs
 * to — that resolution is deliberately out of scope for this phase (see
 * TAKTİKALP46_PHASE_1C_IMPLEMENTATION_REPORT.md).
 *
 * NOT wired into any route yet — no public storefront route exists for a
 * second tenant today (deferred to FAZ 1D). This component only proves
 * the DB -> render half of the "admin update -> DB -> public" chain; the
 * DB -> anon-fetch half is verified separately with a real store_id via a
 * standalone script (see the phase report), never with fabricated data.
 *
 * Only 1 of the 10 seeded `homepage_section_types` (hero) has any
 * structured `config` field today — secondaryCtaLabel/secondaryCtaHref,
 * see lib/validation/homepage-section.ts. The other 9 types have an empty
 * config schema. A single generic renderer keyed by `sectionTypeKey` is
 * therefore the correct minimum today; a bespoke per-type visual design
 * was explicitly out of scope for this phase ("Henüz görsel redesign
 * yapma" — Taktikalp46's approved brand identity is not applied here).
 */

interface StoreHomepageSectionsProps {
  sections: PublicHomepageSection[];
  /** Rendered when the store has no active sections yet. Defaults to a neutral placeholder if omitted. */
  emptyState?: ReactNode;
}

export function StoreHomepageSections({ sections, emptyState }: StoreHomepageSectionsProps) {
  if (sections.length === 0) {
    return emptyState ?? <StoreHomepageSectionsEmptyState />;
  }

  return (
    <div data-testid="store-homepage-sections">
      {sections.map((section) => (
        <HomepageSection key={section.id} section={section} />
      ))}
    </div>
  );
}

function StoreHomepageSectionsEmptyState() {
  return (
    <div data-testid="store-homepage-sections-empty" className="py-16 text-center text-sm text-foreground/50">
      Bu mağaza için henüz yayınlanmış bir ana sayfa bölümü yok.
    </div>
  );
}

function HomepageSection({ section }: { section: PublicHomepageSection }) {
  const secondaryCta = section.sectionTypeKey === "hero" ? readHeroSecondaryCta(section.config) : null;

  return (
    <section
      data-section-type={section.sectionTypeKey}
      data-section-id={section.id}
      className="border-b border-black/5 px-4 py-10 sm:px-6"
    >
      {section.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- generic multi-tenant renderer; tenant image domains
        // aren't known/configured in next.config.ts remotePatterns yet, so next/image is deliberately avoided until
        // FAZ 1D wires a real route for a real domain.
        <img
          src={section.imageUrl}
          alt=""
          className="mb-4 h-auto w-full max-w-full object-cover"
          loading="lazy"
        />
      ) : null}

      {section.title ? <h2 className="text-xl font-semibold">{section.title}</h2> : null}
      {section.description ? <p className="mt-2 text-sm text-foreground/70">{section.description}</p> : null}

      {section.linkUrl ? (
        <a href={section.linkUrl} className="mt-4 inline-block text-sm font-medium underline">
          {section.title ? `${section.title} — devamı` : "Devamı"}
        </a>
      ) : null}

      {secondaryCta ? (
        <a href={secondaryCta.href} className="mt-2 inline-block text-sm font-medium underline">
          {secondaryCta.label}
        </a>
      ) : null}
    </section>
  );
}

function readHeroSecondaryCta(config: Record<string, unknown>): { label: string; href: string } | null {
  const label = typeof config.secondaryCtaLabel === "string" ? config.secondaryCtaLabel.trim() : "";
  const href = typeof config.secondaryCtaHref === "string" ? config.secondaryCtaHref.trim() : "";
  if (!label || !href) return null;
  return { label, href };
}
