import "server-only";

import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/config/env";
import type { Database } from "@/lib/supabase/types";

/**
 * PHASE 2 — Platform DB için YENİ bir istemci: anon key, ÇEREZSİZ/OTURUMSUZ.
 * Bugüne kadar Platform DB'nin böyle bir istemcisi hiç olmadı, çünkü hiçbir
 * Platform DB tablosu public değildi — `createSupabaseServerClient()`
 * (lib/supabase/server.ts) her zaman `@supabase/ssr` ile ÇEREZ tabanlı bir
 * oturum bekler, anonim bir mağaza ziyaretçisi için anlamsız/gereksiz.
 *
 * `lib/cms/connection.ts`'in `getCustomerPublicSupabaseClient()`'ı ile
 * AYNI felsefe (anon key, `persistSession: false`) — ama O fonksiyon
 * MÜŞTERİYE ÖZEL, ayrı bir Supabase projesine bağlanıyor; BU fonksiyon
 * PLATFORM DB'nin KENDİSİNE, anon rolüyle bağlanıyor.
 *
 * SADECE Phase 2'nin public storefront read model'i (lib/commerce/public/*)
 * bunu kullanır. Asla:
 *  - `createSupabaseServerClient()` (dashboard'a özel, çerezli/oturumlu)
 *  - `createSupabaseAdminClient()` (service-role, RLS'i TAMAMEN bypass eder)
 * ile karıştırılmamalı — storefront güvenliğinin temeli bu üçünün
 * birbirine karışmaması.
 */
export function createSupabasePublicClient() {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    throw new Error(
      "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY for the public storefront client.",
    );
  }

  return createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
