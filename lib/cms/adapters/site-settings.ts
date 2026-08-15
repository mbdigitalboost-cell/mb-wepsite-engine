import "server-only";

import { fetchPublishedSingle } from "@/lib/cms/adapters/shared";
import type { SiteSettingsRow } from "@/lib/cms/customer-types";

/** e.g. `getSiteSettings("PETRA", petraContactInfo)` — see lib/data/petra/site-config.ts. */
export async function getSiteSettings<T>(connectionKey: string, fallback: T): Promise<SiteSettingsRow | T> {
  return fetchPublishedSingle<SiteSettingsRow, T>(connectionKey, "site_settings", fallback);
}
