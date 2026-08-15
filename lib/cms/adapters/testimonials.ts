import "server-only";

import { fetchPublishedList } from "@/lib/cms/adapters/shared";
import type { TestimonialRow } from "@/lib/cms/customer-types";

/** e.g. `getTestimonials("PETRA", petraTestimonials)` — see lib/data/petra/testimonials.ts. */
export async function getTestimonials<T>(connectionKey: string, fallback: T): Promise<TestimonialRow[] | T> {
  return fetchPublishedList<TestimonialRow, T>(connectionKey, "testimonials", "sort_order", fallback);
}
