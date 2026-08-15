import type { Metadata } from "next";
import { Hero } from "@/components/sections/hero";
import { TrustBar } from "@/components/sections/trust-bar";
import { Solutions } from "@/components/sections/solutions";
import { EngineeringProcess } from "@/components/sections/engineering-process";
import { MitsubishiSection } from "@/components/sections/mitsubishi-section";
import { Projects } from "@/components/sections/projects";
import { Campaigns } from "@/components/sections/campaigns";
import { WhyPetra } from "@/components/sections/why-petra";
import { Statistics } from "@/components/sections/statistics";
import { Testimonials } from "@/components/sections/testimonials";
import { Faq } from "@/components/sections/faq";
import { FinalCta } from "@/components/sections/final-cta";
import { petraContactInfo } from "@/lib/data/petra/site-config";
import { petraHero } from "@/lib/data/petra/hero";
import { petraSolutions } from "@/lib/data/petra/solutions";
import { petraTestimonials } from "@/lib/data/petra/testimonials";
import { petraFaqs } from "@/lib/data/petra/faqs";
import { buildWhatsappHref } from "@/lib/data/petra/whatsapp";
import { petraFaqStructuredData } from "@/lib/seo/structured-data";
import { getHero, getSolutions, getTestimonials, getFaqs, getSiteSettings } from "@/lib/cms/adapters";
import { isCmsRow, mapHeroRow, mapSolutionRows, mapTestimonialRows, mapFaqRows, mapSiteSettingsWhatsapp } from "@/lib/cms/petra/mappers";
import { resolveSiteWideSeo, applyHomeSeoOverrides } from "@/lib/seo/build-metadata";
import type { NamedContentRow, TestimonialRow, FaqRow, HeroSectionRow, SiteSettingsRow } from "@/lib/cms/customer-types";

const PETRA_CONNECTION_KEY = "PETRA";

// `title.absolute` — Phase 9.3 finding, verified directly against the
// prerendered `.next/server/app/index.html` output (not just a running
// `next start`, to rule out a stale-process artifact skewing the test —
// see PHASE_9_3_RAPOR.md §"Title double-wrap"): omitting `title` here to
// "inherit app/(public)/layout.tsx's default" does NOT stop at that
// layout's own template. Next 16's title resolution also threads the
// ROOT layout's template ("%s | MB Digital Boost") through, producing
// "...Güven | MB Digital Boost" for a title that should render with no
// suffix at all. `title.absolute` is the documented mechanism that
// ignores every ancestor template unconditionally, giving the homepage
// exactly its own title — which was always the intent (the code
// previously omitted `title` specifically to avoid a suffix).
const staticMetadata: Metadata = {
  title: { absolute: "Petra Mühendislik — İklimlendirmede Mühendislik ve Güven" },
  description:
    "Konut ve ticari alanlar için profesyonel iklimlendirme çözümleri: split, multi-split, VRF, ısı pompası ve sıcak su sistemleri.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Petra Mühendislik — İklimlendirmede Mühendislik ve Güven",
    description:
      "Konut ve ticari alanlar için profesyonel iklimlendirme çözümleri: split, multi-split, VRF, ısı pompası ve sıcak su sistemleri.",
    type: "website",
  },
};

// Phase 9.3: the homepage is the closest CMS-editable equivalent of
// "home page SEO" (site-wide seo_settings, page_id IS NULL — no
// dedicated `pages` row for "/" exists today, see PHASE_9_3_RAPOR.md).
// CMS-first, static `staticMetadata` as fallback for every field.
export async function generateMetadata(): Promise<Metadata> {
  const seo = await resolveSiteWideSeo(PETRA_CONNECTION_KEY);
  return applyHomeSeoOverrides(staticMetadata, seo);
}

/**
 * Phase 6 §20 — data layer connected to the CMS adapter, components
 * untouched beyond one optional prop each (see components/sections/hero.tsx
 * for the pattern). Every fetch below follows the same rule: CMS
 * published data if the adapter genuinely returned it, otherwise the
 * exact existing static fallback — nothing in between, nothing invented.
 * `isCmsRow` distinguishes "the adapter returned real CMS rows" from
 * "the adapter returned the fallback value unchanged" (see
 * lib/cms/petra/mappers.ts).
 *
 * Projects/Campaigns are intentionally NOT wired here yet — their CMS
 * table shape doesn't carry every field the existing component needs
 * (no `category` on projects, no CTA fields on campaigns; see Phase 6
 * report). Wiring them would mean inventing values these fields don't
 * have, which is exactly what this phase forbids.
 */
export default async function HomePage() {
  const [heroResult, solutionsResult, testimonialsResult, faqsResult, siteSettingsResult] = await Promise.all([
    getHero<typeof petraHero>(PETRA_CONNECTION_KEY, petraHero),
    getSolutions(PETRA_CONNECTION_KEY, petraSolutions),
    getTestimonials(PETRA_CONNECTION_KEY, petraTestimonials),
    getFaqs(PETRA_CONNECTION_KEY, petraFaqs),
    getSiteSettings(PETRA_CONNECTION_KEY, petraContactInfo),
  ]);

  const hero = isCmsRow(heroResult) ? mapHeroRow(heroResult as HeroSectionRow, petraHero.trustInfo) : petraHero;
  const solutions = isCmsRow((solutionsResult as unknown[])[0])
    ? mapSolutionRows(solutionsResult as NamedContentRow[])
    : petraSolutions;
  const testimonials = isCmsRow((testimonialsResult as unknown[])[0])
    ? mapTestimonialRows(testimonialsResult as TestimonialRow[])
    : petraTestimonials;
  const faqs = isCmsRow((faqsResult as unknown[])[0]) ? mapFaqRows(faqsResult as FaqRow[]) : petraFaqs;
  const whatsapp = isCmsRow(siteSettingsResult)
    ? mapSiteSettingsWhatsapp(siteSettingsResult as SiteSettingsRow)
    : petraContactInfo.whatsapp;

  const whatsappHref = buildWhatsappHref(whatsapp);
  const faqJsonLd = petraFaqStructuredData();

  return (
    <>
      {faqJsonLd ? (
        // Static JSON-LD we generate ourselves — no user input reaches this.
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      ) : null}
      <Hero whatsappHref={whatsappHref} hero={hero} />
      <TrustBar />
      <Solutions solutions={solutions} />
      <EngineeringProcess />
      <MitsubishiSection />
      <Projects />
      <Campaigns />
      <WhyPetra />
      <Statistics />
      <Testimonials testimonials={testimonials} />
      <Faq faqs={faqs} />
      <FinalCta whatsappHref={whatsappHref} />
    </>
  );
}
