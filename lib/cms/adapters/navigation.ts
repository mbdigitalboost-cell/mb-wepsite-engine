import "server-only";

import { fetchPublishedList } from "@/lib/cms/adapters/shared";
import type { NavigationItemRow } from "@/lib/cms/customer-types";
import type { PetraNavLink } from "@/lib/data/petra/types";

export async function getNavigation(
  connectionKey: string,
  fallback: PetraNavLink[],
): Promise<PetraNavLink[]> {
  const rows = await fetchPublishedList<NavigationItemRow, null>(
    connectionKey,
    "navigation_items",
    "sort_order",
    null,
  );

  if (!rows) return fallback;

  try {
    return rows.map((row) => ({ href: row.href, label: row.label }));
  } catch (error) {
    console.error(
      `[cms/adapters] navigation_items row mapping failed for connectionKey="${connectionKey}":`,
      error,
    );
    return fallback;
  }
}
