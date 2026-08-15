import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveConnectionKeyForCustomer } from "@/lib/cms/resolve-customer-connection";
import { getCustomerSupabaseClient } from "@/lib/cms/connection";
import type { CustomerDatabase } from "@/lib/cms/customer-types";

export interface CustomerConnection {
  connectionKey: string;
  client: SupabaseClient<CustomerDatabase>;
}

/**
 * Every dashboard CMS page/action (content, hero, media, seo, tracking,
 * leads, site settings) needs the SAME two-step resolution: which
 * customer-project connection key belongs to this customerId, then a
 * working service-role client for it. Both steps can legitimately come
 * back empty — no active website yet, or a real website but no
 * SUPABASE_*_<KEY> env vars configured yet (today's actual state for
 * every customer including Petra, until real credentials are added to
 * Vercel). Either way this returns `null`, never throws — callers must
 * render a "CMS bağlantısı bekleniyor" state instead of crashing.
 *
 * Uses the service-role client (not the public/anon one) because the
 * dashboard editor must see draft/archived rows too, not just
 * `published` — this is trusted, already-authorized server code (every
 * caller has already passed requireCustomerAccess()/requireAdmin()).
 */
export async function loadCustomerConnection(customerId: string): Promise<CustomerConnection | null> {
  const connectionKey = await resolveConnectionKeyForCustomer(customerId);
  if (!connectionKey) return null;

  const client = await getCustomerSupabaseClient(connectionKey);
  if (!client) return null;

  return { connectionKey, client };
}
