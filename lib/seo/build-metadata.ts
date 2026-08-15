import "server-only";

import type { Metadata } from "next";
import { getSeo } from "@/lib/cms/adapters";
import type { SeoSettingsRow } from "@/lib/cms/customer-types";

/**
 * Resolves the CUSTOMER'S site-wide `seo_settings` row (page_id IS NULL
 * — the only row shape the dashboard SEO screen manages today, see
 * app/dashboard/customers/[customerId]/seo/page.tsx). Returns `null`
 * when not connected, no row saved yet, or a genuine query error —
 * callers must keep their own static metadata completely unchanged in
 * every one of those cases (see PHASE_9_3_RAPOR.md §"SEO"). `seo_settings`
 * has no `status` column (it's config, not draft/published editorial
 * content — see migration 0003's comment), so there's no isCmsRow-style
 * check needed here: passing `null` as the fallback means any non-null
 * return IS the real row.
 */
export async function resolveSiteWideSeo(connectionKey: string): Promise<SeoSettingsRow | null> {
  return getSeo<SeoSettingsRow | null>(connectionKey, null, null);
}

/**
 * Site-wide fallback layer — applied once, at the root PUBLIC layout, so
 * it reaches every page under it EXCEPT a field that page sets itself
 * (Next.js metadata resolution: a leaf segment's own field always wins
 * over an ancestor layout's same field for the same key). Deliberately
 * only touches fields that are safe to apply blindly across every route:
 * `robots` and the OG image. `title`/`description` only replace the
 * layout's *default* title / base description (used by any page that
 * sets no title/description of its own) — today every existing Petra
 * route already sets its own explicit title+description, so this mostly
 * matters for robots (e.g. a site-wide "noindex before launch" toggle)
 * and as a safety net for any future page that forgets to set its own.
 */
export function applyLayoutSeoOverrides(base: Metadata, seo: SeoSettingsRow | null): Metadata {
  if (!seo) return base;

  const merged: Metadata = { ...base };
  const baseTitle = base.title;

  if (seo.title) {
    merged.title =
      typeof baseTitle === "object" && baseTitle !== null && "template" in baseTitle
        ? { ...baseTitle, default: seo.title }
        : seo.title;
  }
  if (seo.description) merged.description = seo.description;
  if (seo.og_image) {
    merged.openGraph = { ...(base.openGraph ?? {}), images: [{ url: seo.og_image }] };
  }
  if (seo.robots_index === false || seo.robots_follow === false) {
    merged.robots = { index: seo.robots_index, follow: seo.robots_follow };
  }

  return merged;
}

/**
 * Homepage-specific override. The site-wide `seo_settings` row is also
 * the closest CMS-editable equivalent of "home page SEO" — no dedicated
 * `pages` row exists for `/` today (see PHASE_9_3_RAPOR.md §"Sayfa bazlı
 * SEO"), so unlike `applyLayoutSeoOverrides`, this one is also allowed
 * to override `description`/`canonical`/`openGraph.title+description` —
 * the exact fields app/(public)/page.tsx already sets statically today.
 *
 * `title.absolute` (not a plain string) here, deliberately, so a
 * customer-entered homepage title always renders exactly as typed,
 * regardless of any ancestor `title.template` — the same "show my exact
 * title, no suffix" behavior the static fallback gets for free by
 * omitting `title` entirely (see app/(public)/page.tsx's
 * `staticMetadata`). A CMS override is a different code path from that
 * omission, so it needs its own explicit guarantee rather than relying
 * on Next's non-CMS default-inheritance behavior.
 */
export function applyHomeSeoOverrides(base: Metadata, seo: SeoSettingsRow | null): Metadata {
  if (!seo) return base;

  const merged: Metadata = { ...base };

  if (seo.title) merged.title = { absolute: seo.title };
  if (seo.description) merged.description = seo.description;
  if (seo.canonical) merged.alternates = { ...(base.alternates ?? {}), canonical: seo.canonical };

  const baseOg = (base.openGraph ?? {}) as Record<string, unknown>;
  merged.openGraph = {
    ...baseOg,
    ...(seo.title ? { title: seo.title } : {}),
    ...(seo.description ? { description: seo.description } : {}),
    ...(seo.og_image ? { images: [{ url: seo.og_image }] } : {}),
  } as Metadata["openGraph"];

  return merged;
}
