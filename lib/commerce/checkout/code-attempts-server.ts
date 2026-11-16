import "server-only";

import { createHash, createHmac } from "node:crypto";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { serverEnv } from "@/lib/config/env";
import { getClientIp } from "@/lib/security/rate-limit";
import { createMemoryAttemptStore, withFallback, type AttemptStore } from "@/lib/commerce/checkout/code-attempts";

/**
 * Faz 32 — deneme sınırının sunucu tarafı: anahtar üretimi ve kalıcı depo
 * (migration 0047 discount_code_attempts; RLS açık, policy yok → yalnız
 * service-role). Tablo henüz yoksa ya da sorgu hata verirse instance
 * belleğine düşülür (bkz. code-attempts.ts).
 */

// Modül seviyesinde: sıcak instance'ta istekler arasında paylaşılır.
const memoryStore = createMemoryAttemptStore();

function attemptKeySecret(): string {
  const base = serverEnv.supabaseServiceRoleKey ?? "";
  return createHash("sha256").update(`mb-discount-code-attempts:${base}`).digest("hex");
}

/** HMAC(mağaza + IP) — ham IP ne tabloya ne loga yazılır. */
export async function discountAttemptKey(storeId: string): Promise<string> {
  const headerList = await headers();
  const ip = getClientIp(new Request("http://internal", { headers: headerList }));
  return createHmac("sha256", attemptKeySecret()).update(`${storeId}:${ip}`).digest("hex");
}

function tableStore(admin: SupabaseClient<Database>, storeId: string): AttemptStore {
  return {
    async countSince(key, since) {
      const { count, error } = await admin
        .from("discount_code_attempts")
        .select("id", { count: "exact", head: true })
        .eq("key_hash", key)
        .gt("created_at", since.toISOString());
      if (error) return null;
      return count ?? 0;
    },
    async record(key, at) {
      const { error } = await admin.from("discount_code_attempts").insert({ store_id: storeId, key_hash: key, created_at: at.toISOString() });
      if (error) return false;
      // Fırsatçı temizlik: bu anahtarın 1 günden eski kayıtları.
      await admin
        .from("discount_code_attempts")
        .delete()
        .eq("key_hash", key)
        .lt("created_at", new Date(at.getTime() - 24 * 60 * 60 * 1000).toISOString());
      return true;
    },
  };
}

export function discountAttemptStore(admin: SupabaseClient<Database>, storeId: string): AttemptStore {
  return withFallback(tableStore(admin, storeId), memoryStore);
}
