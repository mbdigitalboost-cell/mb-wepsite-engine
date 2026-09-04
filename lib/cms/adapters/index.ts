import "server-only";

/**
 * Barrel export — not required, but keeps call sites (once a future
 * phase actually wires a route to these) to one import line instead of
 * nine. Not imported by any Petra route yet, per Phase 5 scope.
 */
export { getHero } from "@/lib/cms/adapters/hero";
export { getSolutions } from "@/lib/cms/adapters/solutions";
export { getProductShowcaseItems } from "@/lib/cms/adapters/product-showcase";
export { getServices } from "@/lib/cms/adapters/services";
export { getProjects } from "@/lib/cms/adapters/projects";
export { getCampaigns } from "@/lib/cms/adapters/campaigns";
export { getTestimonials } from "@/lib/cms/adapters/testimonials";
export { getFaqs } from "@/lib/cms/adapters/faqs";
export { getSiteSettings } from "@/lib/cms/adapters/site-settings";
export { getSeo } from "@/lib/cms/adapters/seo";
export { getTrackingPublicSettings } from "@/lib/cms/adapters/tracking";
export { getNavigation } from "@/lib/cms/adapters/navigation";
