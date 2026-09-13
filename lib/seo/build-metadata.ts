import "server-only";

import type { Metadata } from "next";
import { getSeo } from "@/lib/cms/adapters";
import type { SeoSettingsRow } from "@/lib/cms/customer-types";
import { petraSiteName } from "@/lib/data/petra/site-config";

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
 * Faz 6F-4A-3.3 — statik sayfa SEO çözümü: o sayfanın kendi `route_key`'li
 * satırına bakar. `routeKey`, `lib/seo/route-registry.ts`'in
 * `STATIC_SEO_ROUTES` listesindeki bir `key` olmalı — registry ile
 * senkron olmayan bir değer basitçe hiçbir satırla eşleşmez, hataya
 * değil sessiz fallback'e düşer.
 *
 * Faz 6F-4A-3.5 (BUG-1 düzeltmesi) — ÖNCEDEN, route-specific satır
 * yoksa site-wide satıra (`resolveSiteWideSeo()`) düşüyordu; bu, site-wide
 * bir satır kaydedilir kaydedilmez kendi `route_key`'i olmayan HER statik
 * sayfanın (7/8) title/description/canonical'ını site-wide'ınkiyle
 * EZİYORDU — production'da doğrulanmış bir bug (bkz.
 * claude/SEO_CURRENT_STATE_AUDIT.md, claude/FAZ6F4A3_5_SEO_PRODUCTION_BUGFIX_PREFLIGHT.md §1).
 * Artık route-specific satır yoksa `null` dönüyor — çağıran
 * (`applyHomeSeoOverrides`) bu durumda sayfanın KENDİ statik `Metadata`
 * objesini değiştirmeden döndürür. Site-wide'ın robots/OG-image gibi
 * güvenli, "her route'a körlemesine uygulanabilir" alanları HÂLÂ
 * ulaşıyor — ama bu fonksiyon üzerinden DEĞİL, root `app/(public)/layout.tsx`'in
 * `applyLayoutSeoOverrides()`'ı üzerinden (ayrı, dar kapsamlı, zaten var
 * olan mekanizma).
 */
export async function resolveStaticPageSeo(connectionKey: string, routeKey: string): Promise<SeoSettingsRow | null> {
  const pageSeo = await getSeo<SeoSettingsRow | null>(connectionKey, null, routeKey);
  if (pageSeo) return pageSeo;
  return null;
}

/** Input shape for resolveSolutionSeo() — kept independent of PetraSolution so this file doesn't need to import lib/data/petra/types.ts. */
export interface SolutionSeoInput {
  seoTitle: string | null | undefined;
  seoDescription: string | null | undefined;
  seoOgImage: string | null | undefined;
  title: string;
  description: string;
}

export interface ResolvedSolutionSeo {
  title: string;
  description: string;
  ogImage: string | null;
}

/**
 * Faz 6F-4A-3.4.1.3 — dynamic solution detail page (/cozumler/[slug])
 * SEO resolution. Deliberately NOT `resolveStaticPageSeo()`: that
 * function is `route_key`-scoped for the 8 static pages and has no
 * relationship to a solution's slug — using it here would silently look
 * up the wrong (or no) row. Uses `resolveSiteWideSeo()` for `ogImage`
 * only (see below) — the same site-wide `seo_settings` row every other
 * page falls back to.
 *
 * Faz D düzeltmesi (production'da doğrulanan bulgu): `title`/`description`
 * ÖNCEDEN site-wide `seo_settings` satırına da düşüyordu
 * (`solution.seoTitle ?? siteWide.title ?? solution.title`) — ama o satır
 * `page_id IS NULL AND route_key IS NULL`, yani HOMEPAGE'e özel bir
 * satır (bkz. `applyHomeSeoOverrides`'ın onu tam olarak bunun için
 * kullanması). Petra'da bu satır GERÇEKTEN dolu olduğu için (homepage
 * title'ı), HER `/cozumler/[slug]` sayfası kendi gerçek başlığı yerine
 * homepage'in başlığını gösteriyordu — production'da doğrulandı
 * (`Petra Mühendislik | Kahramanmaraş İklimlendirme Çözümleri`, TÜM
 * solution sayfalarında AYNI). `title`/`description` artık SADECE
 * solution'ın kendi alanlarına düşüyor (`solution.seoTitle ?? solution.title`),
 * homepage'e ait site-wide satırı ASLA kullanmıyor — `solution.title` her
 * zaman dolu (zorunlu alan) olduğu için bu zincir asla boş dönmez.
 * Statik `solution.title` fallback'ine düşüldüğünde marka soneki
 * (` | Petra Mühendislik`) BİLEREK elle ekleniyor: bu fonksiyonun
 * döndürdüğü `title`, çağıran tarafta (`app/(public)/cozumler/[slug]/
 * page.tsx`) HER ZAMAN `{ absolute: ... }` ile kullanılıyor (ebeveyn
 * layout'un `"%s | Petra Mühendislik"` şablonunu bilerek atlıyor —
 * yukarıdaki `siteWideSeo.title` hatasını tekrarlamamak için), yani bu
 * sonek başka HİÇBİR yoldan eklenmiyor. Eklenmezse solution sayfaları
 * (statik durumda) markasız, sitenin geri kalanıyla tutarsız bir title
 * gösterirdi ("Split Klimalar" vs diğer her sayfadaki "X | Petra
 * Mühendislik"). `solution.seoTitle` GERÇEK bir admin girdisiyse bu sonek
 * EKLENMİYOR — admin kendi tam başlığını (marka adı dahil ya da hariç,
 * kendi tercihiyle) yazmış sayılır, üzerine yazılmaz.
 * `ogImage` tek istisna: site-wide `og_image`, `applyLayoutSeoOverrides`'ın
 * felsefesiyle AYNI şekilde ("her route'a körlemesine uygulanabilir
 * güvenli bir varlık") gerçekten güvenli bir genel varsayılan, o yüzden
 * fallback zincirinde KALDI. `ogImage` yine solution'ın kendi `image`
 * alanına DÜŞMÜYOR — o asset genelde dikey 3:4 kırpım, OG-uyumlu bir oran
 * değil (bkz. migration 0010'un kendi yorumu). Canonical ve robots bu
 * resolver'ın parçası DEĞİL — canonical slug-türetilmiş kalıyor
 * (`/cozumler/${slug}`), robots root public layout'tan miras kalıyor;
 * ikisi de ne solution ne site-wide satır tarafından override edilmemeli.
 */
export async function resolveSolutionSeo(connectionKey: string, solution: SolutionSeoInput): Promise<ResolvedSolutionSeo> {
  const siteWideSeo = await resolveSiteWideSeo(connectionKey);
  return {
    title: solution.seoTitle ?? `${solution.title} | ${petraSiteName}`,
    description: solution.seoDescription ?? solution.description,
    ogImage: solution.seoOgImage ?? siteWideSeo?.og_image ?? null,
  };
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
  // Faz 6F-4A-3.5 (Twitter gap düzeltmesi) — openGraph için zaten yapılan
  // aynı koşullu merge'in twitter için tekrarı; ayrı bir Twitter-özel SEO
  // alanı/sistemi YOK, aynı seo.title/description kaynağını paylaşıyor.
  if (seo.title || seo.description) {
    merged.twitter = {
      ...(base.twitter ?? {}),
      ...(seo.title ? { title: seo.title } : {}),
      ...(seo.description ? { description: seo.description } : {}),
    } as Metadata["twitter"];
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
 *
 * Faz 6F-4A-3.3: despite the name, this function's body has nothing
 * homepage-specific in it — the 8 static pages' `generateMetadata()`
 * reuse it verbatim (with their own `staticMetadata` + `resolveStaticPageSeo`
 * result) instead of a second, duplicate merge function.
 *
 * Faz SEO-3: `openGraph.url` is now ALWAYS set from the page's final
 * (possibly CMS-overridden) canonical — even when `seo` is null (the 7
 * static pages with no `seo_settings` row today). Next's `metadataBase`
 * resolves a relative `openGraph.url` exactly like it does
 * `alternates.canonical`, so this stays correct if/when the custom
 * domain (`NEXT_PUBLIC_SITE_URL`) ever changes again — no hardcoded
 * domain here.
 */
export function applyHomeSeoOverrides(base: Metadata, seo: SeoSettingsRow | null): Metadata {
  const merged: Metadata = { ...base };

  if (seo) {
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

    // Faz 6F-4A-3.5 (Twitter gap düzeltmesi) — openGraph için yukarıda
    // yapılan aynı merge'in twitter için tekrarı, aynı seo.title/description
    // kaynağından besleniyor.
    if (seo.title || seo.description) {
      merged.twitter = {
        ...(base.twitter ?? {}),
        ...(seo.title ? { title: seo.title } : {}),
        ...(seo.description ? { description: seo.description } : {}),
      } as Metadata["twitter"];
    }
  }

  const canonical = merged.alternates?.canonical;
  if (typeof canonical === "string") {
    merged.openGraph = { ...(merged.openGraph ?? {}), url: canonical } as Metadata["openGraph"];
  }

  return merged;
}
